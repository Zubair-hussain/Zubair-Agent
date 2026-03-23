import { Router } from "express";
import { chatHandler, endSessionHandler, statsHandler } from "../controllers/chatController.js";
import { validateChat } from "../middleware/validate.js";

const router = Router();
router.post("/", validateChat, chatHandler);
router.delete("/:sessionId", endSessionHandler);
router.get("/stats", statsHandler);
export default router;
