// Turns a visitor message into the AI's reply. Pure and synchronous apart from
// the optional live web search, so it is trivial to test.
import config from "../config.js";
import { KB } from "../knowledge/kb.js";
import { analyze } from "./intentEngine.js";
import { buildResponse } from "./responseBuilder.js";
import { searchWeb, formatSearchResults } from "../handlers/searchHandler.js";

const handoffReply = (online) =>
  online
    ? `Sure — I've let **Zubair** know you'd like to talk to him directly. He's online right now, so hang tight and he'll join this chat. 🙌`
    : `Sure — I've notified **Zubair** that you'd like to talk to him directly. He typically replies **${config.chat.replyTimeLabel}**.\n\nYou can keep this chat open, or leave your email below and he'll get back to you there. For anything urgent: ${KB.identity.whatsapp}`;

const unknownReply = (ranked) => {
  const fallback = buildResponse("unknown", "");
  return `${fallback}\n\nPrefer a human? Just say **"talk to Zubair"** and I'll bring him into this chat.`;
};

/**
 * @param {string} message          already-sanitised visitor text
 * @param {{ lastIntent?: string, adminOnline?: boolean }} context
 * @returns {Promise<{ intent: string, reply: string, handoff: boolean }>}
 */
export const generateReply = async (message, context = {}) => {
  const { intent } = analyze(message, context);

  if (intent === "handoff") {
    return { intent, reply: handoffReply(Boolean(context.adminOnline)), handoff: true };
  }

  if (intent === "error_search") {
    if (config.serpApiKey) {
      try {
        const results = await searchWeb(message.slice(0, 200));
        return { intent, reply: formatSearchResults(results, message), handoff: false };
      } catch {
        /* fall through to the generic answer */
      }
    }
    return {
      intent,
      reply: `That sounds like a technical issue. I can't run a live search right now, but Zubair debugs problems like this every day.\n\nSay **"talk to Zubair"** to bring him into this chat, or book a call: ${KB.identity.bookingLink}`,
      handoff: false,
    };
  }

  const reply = intent === "unknown" ? unknownReply() : buildResponse(intent, message);
  return { intent, reply: reply || unknownReply(), handoff: false };
};

export default generateReply;
