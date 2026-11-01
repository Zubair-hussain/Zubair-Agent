// Stateless MCP endpoint so AI assistants can ask about Zubair.
import { Router } from "express";
import { askAgent } from "../ai/agent.js";
import { SKILLS } from "../ai/context.js";
import { chatLimiter } from "../middleware/index.js";

const router = Router();

const TOOLS = [
  {
    name: "ask_zubair_agent",
    description: "Ask about Zubair Hussain's skills, services, availability or articles.",
    inputSchema: {
      type: "object",
      properties: { question: { type: "string", maxLength: 1000 } },
      required: ["question"],
    },
  },
  {
    name: "get_contact_details",
    description: "Get Zubair Hussain's public contact and booking links.",
    inputSchema: { type: "object", properties: {} },
  },
];

const text = (value) => ({ content: [{ type: "text", text: value }] });

export const handleRpc = async ({ method, params }) => {
  if (method === "initialize") {
    return {
      protocolVersion: params?.protocolVersion || "2025-06-18",
      capabilities: { tools: {} },
      serverInfo: { name: "zubair-agent", version: "3.0.0" },
    };
  }
  if (method === "ping") return {};
  if (method === "tools/list") return { tools: TOOLS };
  if (method === "tools/call") {
    if (params?.name === "get_contact_details") return text(SKILLS);
    if (params?.name === "ask_zubair_agent") {
      const question = String(params.arguments?.question || "").slice(0, 1000).trim();
      if (!question) return { ...text("A question is required."), isError: true };
      const answer = await askAgent(question);
      return text(answer?.reply || "The assistant is unavailable. Email zubair@zubairhussain.xyz.");
    }
    return { ...text("Unknown tool."), isError: true };
  }
  throw Object.assign(new Error("Method not found"), { code: -32601 });
};

router.post("/", chatLimiter, async (req, res) => {
  const { id, method, params } = req.body || {};
  if (id === undefined) return res.status(202).end(); // notification
  try {
    res.json({ jsonrpc: "2.0", id, result: await handleRpc({ method, params }) });
  } catch (err) {
    res.json({ jsonrpc: "2.0", id, error: { code: err.code || -32603, message: err.message } });
  }
});

export default router;
