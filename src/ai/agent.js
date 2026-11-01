// Answers questions through Hugging Face. Returns null when the model is unavailable.
import { POLICY, checkInput, isSafeOutput } from "./policy.js";
import { buildContext } from "./context.js";

const HF_URL = "https://router.huggingface.co/v1/chat/completions";
const CACHE_TTL = 10 * 60 * 1000;
const cache = new Map();

export const HANDOFF_REPLY =
  "I'm not sure about that one, so I don't want to guess. Zubair can answer it directly: " +
  "email zubair@zubairhussain.xyz or book a call at https://calendly-booking-navy.vercel.app";
export const BLOCKED_REPLY =
  "I can't help with that, but I'm happy to answer questions about Zubair's work or general development.";

const callModel = async (messages) => {
  const res = await fetch(HF_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.HF_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: process.env.HF_MODEL || "meta-llama/Llama-3.1-8B-Instruct",
      messages,
      max_tokens: 400,
      temperature: 0.3,
    }),
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`Hugging Face returned ${res.status}`);
  return (await res.json()).choices?.[0]?.message?.content?.trim() || "";
};

export const askAgent = async (text, history = [], model = callModel, context = buildContext) => {
  if (checkInput(text)) return { reply: BLOCKED_REPLY, source: "policy", handoff: false };
  if (model === callModel && !process.env.HF_API_KEY) return null;

  const key = history.length ? null : text.toLowerCase().trim();
  const hit = key && cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL) return hit.value;

  try {
    const messages = [
      { role: "system", content: `${POLICY}\n\n${await context(text)}` },
      ...history.slice(-6).map((m) => ({
        role: m.role === "agent" ? "assistant" : "user",
        content: m.content,
      })),
      { role: "user", content: text },
    ];
    const answer = await model(messages);
    if (!answer) return null;
    let value;
    if (!isSafeOutput(answer)) value = { reply: BLOCKED_REPLY, source: "policy", handoff: false };
    else if (answer.includes("HANDOFF")) value = { reply: HANDOFF_REPLY, source: "ai", handoff: true };
    else value = { reply: answer, source: "ai", handoff: false };
    if (key) cache.set(key, { at: Date.now(), value });
    if (cache.size > 200) cache.delete(cache.keys().next().value);
    return value;
  } catch (err) {
    console.error("AI unavailable:", err.message);
    return null;
  }
};
