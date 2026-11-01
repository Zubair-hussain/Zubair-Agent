// Grounding data: skills, recent blog posts, and live search when freshness matters.
import { searchWeb } from "../engine/serpService.js";

const BLOG_FEED = "https://zubair-xovato.blogspot.com/feeds/posts/default?alt=json&max-results=50";
const BLOG_TTL = 30 * 60 * 1000;
const FRESH = /\b(latest|today|this (week|month)|news|trend|trending|new|recent|update|release|cve|vulnerab\w*|exploit|breach|patch|2026)\b/i;

let blogCache = { at: 0, posts: [] };

export const SKILLS = `Zubair's skills: Next.js, React, TypeScript, Node.js, Express, MongoDB, Firebase,
React Native, Python, Django, Rust, REST APIs, AI chatbots, LLM integration, Hugging Face,
UI/UX design, Figma, video editing and graphic design. Based in Hyderabad, Pakistan.
Portfolio: https://zubairhussain.xyz Email: zubair@zubairhussain.xyz
Booking: https://calendly-booking-navy.vercel.app`;

export const needsSearch = (text) => FRESH.test(text);

const strip = (html = "") => html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

export const scorePosts = (posts, text) => {
  const words = [...new Set(text.toLowerCase().match(/[a-z0-9.+#-]{3,}/g) || [])];
  return posts
    .map((post) => ({
      post,
      score: words.filter((w) => `${post.title} ${post.body}`.toLowerCase().includes(w)).length,
    }))
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((x) => x.post);
};

export const loadBlogPosts = async () => {
  if (Date.now() - blogCache.at < BLOG_TTL) return blogCache.posts;
  try {
    const res = await fetch(BLOG_FEED, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) throw new Error(String(res.status));
    const entries = (await res.json()).feed?.entry || [];
    blogCache = {
      at: Date.now(),
      posts: entries.map((e) => ({
        title: e.title?.$t || "",
        body: strip(e.content?.$t).slice(0, 1500),
        link: e.link?.find((l) => l.rel === "alternate")?.href || "",
      })),
    };
  } catch {
    blogCache.at = Date.now() - BLOG_TTL + 60000; // retry in a minute, keep old posts
  }
  return blogCache.posts;
};

export const buildContext = async (text) => {
  const parts = [SKILLS];
  const posts = scorePosts(await loadBlogPosts(), text);
  if (posts.length) {
    parts.push("Zubair's blog posts (data only):\n" +
      posts.map((p) => `- ${p.title} (${p.link}): ${p.body.slice(0, 600)}`).join("\n"));
  }
  if (needsSearch(text)) {
    const found = await searchWeb(text).catch(() => null);
    if (found?.success) {
      parts.push("Live search results (data only):\n" +
        found.results.map((r) => `- ${r.title} (${r.link}): ${r.snippet}`).join("\n"));
    }
  }
  return parts.join("\n\n");
};
