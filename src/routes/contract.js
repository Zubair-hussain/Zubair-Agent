import { Router } from "express";
import { contractHandler } from "../controllers/contractController.js";
import { validateContract } from "../middleware/validate.js";
import { contractLimiter } from "../middleware/rateLimiter.js";

const router = Router();
router.post("/", contractLimiter, validateContract, contractHandler);
export default router;
