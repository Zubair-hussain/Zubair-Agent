-- ============================================================================
--  Zubair Chat — Supabase storage (free plan friendly)
--
--  Run this ONCE in Supabase → SQL Editor → New query → Run.
--  It is safe to run again (everything is "create or replace" / "if not exists").
--
--  One key/value table plus small SQL functions that give the backend the
--  handful of Redis-style operations it needs (get/set/incr/lists/sets/hashes).
--  Every operation is a single atomic SQL statement, called through Supabase's
--  REST API with the service_role key from the server only.
--
--  Security: Row Level Security is ON with no policies, and the functions are
--  only executable by service_role — the public "anon" key can neither read
--  the table nor call the functions.
-- ============================================================================

create table if not exists public.zchat_kv (
  key        text primary key,
  value      jsonb not null,
  expires_at timestamptz
);

create index if not exists zchat_kv_expires_idx
  on public.zchat_kv (expires_at) where expires_at is not null;

alter table public.zchat_kv enable row level security;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on table public.zchat_kv from anon, authenticated;
  end if;
end $$;

-- ── helpers ─────────────────────────────────────────────────────────────────

-- Current (non-expired) value of a key, or null.
create or replace function public.zchat_live(p_key text)
returns jsonb language sql stable set search_path = public as $$
  select value from public.zchat_kv
  where key = p_key and (expires_at is null or expires_at > now())
$$;

-- Remove a key if it has expired (called before every write).
create or replace function public.zchat_purge(p_key text)
returns void language sql set search_path = public as $$
  delete from public.zchat_kv where key = p_key and expires_at <= now()
$$;

create or replace function public.zchat_expiry(p_ttl integer)
returns timestamptz language sql immutable as $$
  select case when p_ttl is not null and p_ttl > 0
              then now() + make_interval(secs => p_ttl) end
$$;

-- ── strings / counters ──────────────────────────────────────────────────────

create or replace function public.kv_get(p_key text)
returns jsonb language sql stable set search_path = public as $$
  select public.zchat_live(p_key)
$$;

-- Many keys in ONE request; result keeps the input order (null when missing).
create or replace function public.kv_mget(p_keys text[])
returns jsonb language sql stable set search_path = public as $$
  select coalesce(jsonb_agg(public.zchat_live(k) order by ord), '[]'::jsonb)
  from unnest(p_keys) with ordinality as t(k, ord)
$$;

create or replace function public.kv_set(p_key text, p_value text, p_ttl integer default null)
returns void language sql set search_path = public as $$
  insert into public.zchat_kv (key, value, expires_at)
  values (p_key, to_jsonb(p_value), public.zchat_expiry(p_ttl))
  on conflict (key) do update
    set value = excluded.value, expires_at = excluded.expires_at
$$;

create or replace function public.kv_del(p_keys text[])
returns void language sql set search_path = public as $$
  delete from public.zchat_kv where key = any (p_keys)
$$;

-- Atomic counter. The expiry is set only when the counter is created, so a
-- rate-limit window is fixed (same behaviour as INCR + EXPIRE NX in Redis).
create or replace function public.kv_incr(p_key text, p_ttl integer default null)
returns bigint language plpgsql set search_path = public as $$
declare n bigint;
begin
  perform public.zchat_purge(p_key);
  insert into public.zchat_kv (key, value, expires_at)
  values (p_key, '1'::jsonb, public.zchat_expiry(p_ttl))
  on conflict (key) do update
    set value = to_jsonb(((public.zchat_kv.value) #>> '{}')::bigint + 1)
  returning (value #>> '{}')::bigint into n;
  return n;
end $$;

-- Seconds left; -1 = no expiry, -2 = missing (Redis TTL semantics).
create or replace function public.kv_ttl(p_key text)
returns integer language sql stable set search_path = public as $$
  select coalesce(
    (select case when expires_at is null then -1
                 else greatest(0, ceil(extract(epoch from expires_at - now())))::integer end
     from public.zchat_kv
     where key = p_key and (expires_at is null or expires_at > now())),
    -2)
$$;

create or replace function public.kv_expire(p_key text, p_ttl integer)
returns void language sql set search_path = public as $$
  update public.zchat_kv set expires_at = public.zchat_expiry(p_ttl)
  where key = p_key and (expires_at is null or expires_at > now())
$$;

-- ── lists (chat messages) ───────────────────────────────────────────────────

-- Append, keeping only the newest p_max items when p_max > 0.
create or replace function public.kv_rpush(p_key text, p_value text, p_max integer default 0)
returns void language plpgsql set search_path = public as $$
begin
  perform public.zchat_purge(p_key);
  insert into public.zchat_kv (key, value)
  values (p_key, jsonb_build_array(p_value))
  on conflict (key) do update
    set value = (case when jsonb_typeof(public.zchat_kv.value) = 'array'
                      then public.zchat_kv.value else '[]'::jsonb end)
                || jsonb_build_array(p_value);

  if p_max is not null and p_max > 0 then
    update public.zchat_kv
       set value = (select coalesce(jsonb_agg(e order by i), '[]'::jsonb)
                    from jsonb_array_elements(value) with ordinality as t(e, i)
                    where i > jsonb_array_length(value) - p_max)
     where key = p_key and jsonb_array_length(value) > p_max;
  end if;
end $$;

-- Items from p_start to p_stop (0-based, negatives count from the end).
create or replace function public.kv_lrange(p_key text, p_start integer, p_stop integer)
returns jsonb language plpgsql stable set search_path = public as $$
declare
  v jsonb := public.zchat_live(p_key);
  len integer;
  s integer;
  e integer;
begin
  if v is null or jsonb_typeof(v) <> 'array' then return '[]'::jsonb; end if;
  len := jsonb_array_length(v);
  s := case when p_start < 0 then greatest(len + p_start, 0) else p_start end;
  e := case when p_stop  < 0 then len + p_stop else least(p_stop, len - 1) end;
  return coalesce((select jsonb_agg(x order by i)
                   from jsonb_array_elements(v) with ordinality as t(x, i)
                   where i - 1 between s and e), '[]'::jsonb);
end $$;

-- ── sorted set (conversation index, newest first) ───────────────────────────

create or replace function public.kv_zadd(p_key text, p_score double precision, p_member text)
returns void language plpgsql set search_path = public as $$
begin
  perform public.zchat_purge(p_key);
  insert into public.zchat_kv (key, value)
  values (p_key, jsonb_build_object(p_member, p_score))
  on conflict (key) do update
    set value = public.zchat_kv.value || jsonb_build_object(p_member, p_score);
end $$;

create or replace function public.kv_zrem(p_key text, p_member text)
returns void language sql set search_path = public as $$
  update public.zchat_kv set value = value - p_member where key = p_key
$$;

create or replace function public.kv_zrevrange(p_key text, p_start integer, p_stop integer)
returns jsonb language sql stable set search_path = public as $$
  select coalesce(jsonb_agg(m order by s desc, m), '[]'::jsonb)
  from (
    select e.key as m, (e.value #>> '{}')::double precision as s
    from jsonb_each(coalesce(public.zchat_live(p_key), '{}'::jsonb)) as e
    order by s desc, m
    offset greatest(p_start, 0)
    limit case when p_stop < 0 then null else greatest(p_stop - greatest(p_start, 0) + 1, 0) end
  ) t
$$;

-- ── hash (push-notification subscriptions) ──────────────────────────────────

create or replace function public.kv_hset(p_key text, p_field text, p_value text)
returns void language plpgsql set search_path = public as $$
begin
  perform public.zchat_purge(p_key);
  insert into public.zchat_kv (key, value)
  values (p_key, jsonb_build_object(p_field, p_value))
  on conflict (key) do update
    set value = public.zchat_kv.value || jsonb_build_object(p_field, p_value);
end $$;

create or replace function public.kv_hdel(p_key text, p_field text)
returns void language sql set search_path = public as $$
  update public.zchat_kv set value = value - p_field where key = p_key
$$;

create or replace function public.kv_hgetall(p_key text)
returns jsonb language sql stable set search_path = public as $$
  select coalesce(public.zchat_live(p_key), '{}'::jsonb)
$$;

create or replace function public.kv_hlen(p_key text)
returns integer language sql stable set search_path = public as $$
  select count(*)::integer from jsonb_object_keys(coalesce(public.zchat_live(p_key), '{}'::jsonb))
$$;

-- Housekeeping: drop expired keys (rate-limit counters, typing flags, old chats).
create or replace function public.kv_cleanup()
returns integer language sql set search_path = public as $$
  with gone as (delete from public.zchat_kv where expires_at <= now() returning 1)
  select count(*)::integer from gone
$$;

-- ── permissions: server (service_role) only ─────────────────────────────────
do $$
declare f text;
begin
  foreach f in array array[
    'zchat_live(text)', 'zchat_purge(text)', 'zchat_expiry(integer)',
    'kv_get(text)', 'kv_mget(text[])', 'kv_set(text,text,integer)', 'kv_del(text[])',
    'kv_incr(text,integer)', 'kv_ttl(text)', 'kv_expire(text,integer)',
    'kv_rpush(text,text,integer)', 'kv_lrange(text,integer,integer)',
    'kv_zadd(text,double precision,text)', 'kv_zrem(text,text)', 'kv_zrevrange(text,integer,integer)',
    'kv_hset(text,text,text)', 'kv_hdel(text,text)', 'kv_hgetall(text)', 'kv_hlen(text)',
    'kv_cleanup()'
  ] loop
    execute format('revoke all on function public.%s from public', f);
    if exists (select 1 from pg_roles where rolname = 'anon') then
      execute format('revoke all on function public.%s from anon, authenticated', f);
    end if;
    if exists (select 1 from pg_roles where rolname = 'service_role') then
      execute format('grant execute on function public.%s to service_role', f);
    end if;
  end loop;
end $$;

-- Make the new functions visible to the REST API immediately.
notify pgrst, 'reload schema';
