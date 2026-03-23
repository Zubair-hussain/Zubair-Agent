import { Router } from "express";
import { contactHandler } from "../controllers/contactController.js";
import { validateContact } from "../middleware/validate.js";
import { contactLimiter } from "../middleware/rateLimiter.js";

const router = Router();
router.post("/", contactLimiter, validateContact, contactHandler);
export default router;
