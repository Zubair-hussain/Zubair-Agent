// ─────────────────────────────────────────────────────────────────────────────
//  Storage adapter — one small Redis-style interface, three backends:
//   • Supabase (free plan, preferred): Postgres functions from
//     supabase/schema.sql, called over Supabase's REST API. Set SUPABASE_URL
//     and SUPABASE_SERVICE_ROLE_KEY (server-side only).
//   • Upstash Redis (optional): set KV_REST_API_URL / KV_REST_API_TOKEN.
//   • Local dev / tests: an in-memory fallback with the same interface.
//
//  Only a tiny, fixed set of Redis commands is used, and keys are always built
//  server-side from validated ids — user input never reaches a command name.
// ─────────────────────────────────────────────────────────────────────────────
import config from "../config.js";

// ── In-memory implementation ────────────────────────────────────────────────
class MemoryStore {
  constructor() {
    this.data = new Map(); // key -> { value, expiresAt }
    this.persistent = false;
  }

  #get(key) {
    const entry = this.data.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt && entry.expiresAt <= Date.now()) {
      this.data.delete(key);
      return undefined;
    }
    return entry;
  }

  #ensure(key, make) {
    let entry = this.#get(key);
    if (!entry) {
      entry = { value: make(), expiresAt: 0 };
      this.data.set(key, entry);
    }
    return entry;
  }

  async get(key) {
    return this.#get(key)?.value ?? null;
  }
  async mget(keys) {
    return keys.map((k) => this.#get(k)?.value ?? null);
  }
  async set(key, value, ttlSeconds) {
    this.data.set(key, { value: String(value), expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : 0 });
  }
  async del(...keys) {
    keys.forEach((k) => this.data.delete(k));
  }
  async incr(key, ttlSeconds) {
    const entry = this.#ensure(key, () => 0);
    entry.value = Number(entry.value) + 1;
    if (entry.value === 1 && ttlSeconds) entry.expiresAt = Date.now() + ttlSeconds * 1000;
    return entry.value;
  }
  async ttl(key) {
    const entry = this.#get(key);
    if (!entry || !entry.expiresAt) return -1;
    return Math.max(0, Math.ceil((entry.expiresAt - Date.now()) / 1000));
  }
  async expire(key, ttlSeconds) {
    const entry = this.#get(key);
    if (entry) entry.expiresAt = Date.now() + ttlSeconds * 1000;
  }
  async rpush(key, value, maxLength) {
    const entry = this.#ensure(key, () => []);
    entry.value.push(String(value));
    if (maxLength && entry.value.length > maxLength) entry.value.splice(0, entry.value.length - maxLength);
  }
  async lrange(key, start, stop) {
    const listValue = this.#get(key)?.value || [];
    const end = stop < 0 ? listValue.length + stop + 1 : stop + 1;
    return listValue.slice(start < 0 ? Math.max(0, listValue.length + start) : start, end);
  }
  async zadd(key, score, member) {
    this.#ensure(key, () => new Map()).value.set(member, score);
  }
  async zrem(key, member) {
    this.#get(key)?.value.delete(member);
  }
  async zrevrange(key, start, stop) {
    const map = this.#get(key)?.value;
    if (!map) return [];
    return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(start, stop + 1).map(([m]) => m);
  }
  async hset(key, field, value) {
    this.#ensure(key, () => new Map()).value.set(field, String(value));
  }
  async hdel(key, field) {
    this.#get(key)?.value.delete(field);
  }
  async hgetall(key) {
    const map = this.#get(key)?.value;
    return map ? Object.fromEntries(map) : {};
  }
  async hlen(key) {
    return this.#get(key)?.value.size || 0;
  }
}

// ── Upstash Redis (REST) implementation ─────────────────────────────────────
class UpstashStore {
  constructor(url, token) {
    this.url = url.replace(/\/$/, "");
    this.token = token;
    this.persistent = true;
  }

  async #pipeline(commands) {
    const res = await fetch(`${this.url}/pipeline`, {
      method: "POST",
      headers: { Authorization: `Bearer ${this.token}`, "Content-Type": "application/json" },
      body: JSON.stringify(commands),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`Store request failed (${res.status})`);
    const results = await res.json();
    const failed = results.find((r) => r.error);
    if (failed) throw new Error("Store command failed");
    return results.map((r) => r.result);
  }

  async #cmd(...args) {
    return (await this.#pipeline([args]))[0];
  }

  get(key) {
    return this.#cmd("GET", key);
  }
  /** Many keys in ONE command — keeps usage inside Upstash's free tier. */
  async mget(keys) {
    return keys.length ? this.#cmd("MGET", ...keys) : [];
  }
  set(key, value, ttlSeconds) {
    return ttlSeconds ? this.#cmd("SET", key, String(value), "EX", ttlSeconds) : this.#cmd("SET", key, String(value));
  }
  del(...keys) {
    return this.#cmd("DEL", ...keys);
  }
  async incr(key, ttlSeconds) {
    if (!ttlSeconds) return this.#cmd("INCR", key);
    // NX: only the first hit in a window sets the expiry, so the window is fixed.
    const [count] = await this.#pipeline([["INCR", key], ["EXPIRE", key, ttlSeconds, "NX"]]);
    return count;
  }
  ttl(key) {
    return this.#cmd("TTL", key);
  }
  expire(key, ttlSeconds) {
    return this.#cmd("EXPIRE", key, ttlSeconds);
  }
  async rpush(key, value, maxLength) {
    const commands = [["RPUSH", key, String(value)]];
    if (maxLength) commands.push(["LTRIM", key, -maxLength, -1]);
    await this.#pipeline(commands);
  }
  lrange(key, start, stop) {
    return this.#cmd("LRANGE", key, start, stop);
  }
  zadd(key, score, member) {
    return this.#cmd("ZADD", key, score, member);
  }
  zrem(key, member) {
    return this.#cmd("ZREM", key, member);
  }
  zrevrange(key, start, stop) {
    return this.#cmd("ZRANGE", key, start, stop, "REV");
  }
  hset(key, field, value) {
    return this.#cmd("HSET", key, field, String(value));
  }
  hdel(key, field) {
    return this.#cmd("HDEL", key, field);
  }
  async hgetall(key) {
    const flat = (await this.#cmd("HGETALL", key)) || [];
    if (!Array.isArray(flat)) return flat;
    const out = {};
    for (let i = 0; i < flat.length; i += 2) out[flat[i]] = flat[i + 1];
    return out;
  }
  hlen(key) {
    return this.#cmd("HLEN", key);
  }
}

// ── Supabase (Postgres via the REST "rpc" endpoint) ─────────────────────────
class SupabaseStore {
  constructor(url, key) {
    this.url = `${url}/rest/v1/rpc/`;
    // New-style secret keys (sb_secret_…) go in `apikey` only; legacy
    // service_role JWTs are also sent as the bearer token.
    this.headers = {
      apikey: key,
      "Content-Type": "application/json",
      ...(key.startsWith("sb_") ? {} : { Authorization: `Bearer ${key}` }),
    };
    this.persistent = true;
  }

  async #rpc(fn, args) {
    const res = await fetch(this.url + fn, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify(args),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`Store request failed (${res.status})`);
    const text = await res.text();
    return text ? JSON.parse(text) : null;
  }

  // Values come back as JSON; strings stay strings, counters are numbers.
  async get(key) {
    const v = await this.#rpc("kv_get", { p_key: key });
    return v === null || v === undefined ? null : typeof v === "string" ? v : String(v);
  }
  async mget(keys) {
    if (!keys.length) return [];
    const list = (await this.#rpc("kv_mget", { p_keys: keys })) || [];
    return keys.map((_, i) => (list[i] === null || list[i] === undefined ? null : String(list[i])));
  }
  set(key, value, ttlSeconds) {
    return this.#rpc("kv_set", { p_key: key, p_value: String(value), p_ttl: ttlSeconds || null });
  }
  del(...keys) {
    return this.#rpc("kv_del", { p_keys: keys });
  }
  async incr(key, ttlSeconds) {
    return Number(await this.#rpc("kv_incr", { p_key: key, p_ttl: ttlSeconds || null }));
  }
  async ttl(key) {
    return Number(await this.#rpc("kv_ttl", { p_key: key }));
  }
  expire(key, ttlSeconds) {
    return this.#rpc("kv_expire", { p_key: key, p_ttl: ttlSeconds });
  }
  rpush(key, value, maxLength) {
    return this.#rpc("kv_rpush", { p_key: key, p_value: String(value), p_max: maxLength || 0 });
  }
  async lrange(key, start, stop) {
    return (await this.#rpc("kv_lrange", { p_key: key, p_start: start, p_stop: stop })) || [];
  }
  zadd(key, score, member) {
    return this.#rpc("kv_zadd", { p_key: key, p_score: score, p_member: member });
  }
  zrem(key, member) {
    return this.#rpc("kv_zrem", { p_key: key, p_member: member });
  }
  async zrevrange(key, start, stop) {
    return (await this.#rpc("kv_zrevrange", { p_key: key, p_start: start, p_stop: stop })) || [];
  }
  hset(key, field, value) {
    return this.#rpc("kv_hset", { p_key: key, p_field: field, p_value: String(value) });
  }
  hdel(key, field) {
    return this.#rpc("kv_hdel", { p_key: key, p_field: field });
  }
  async hgetall(key) {
    return (await this.#rpc("kv_hgetall", { p_key: key })) || {};
  }
  async hlen(key) {
    return Number(await this.#rpc("kv_hlen", { p_key: key }));
  }
}

export const store = config.store.supabase
  ? new SupabaseStore(config.store.supabaseUrl, config.store.supabaseKey)
  : config.store.upstash
    ? new UpstashStore(config.store.url, config.store.token)
    : new MemoryStore();

export default store;
