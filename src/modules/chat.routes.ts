import { Router, type Router as RouterType } from "express";
import { requireAuth } from "../middleware/auth.js";
import { chat } from "./chat.controller.js";
const router: RouterType = Router();
router.post("/", requireAuth, chat);
export default router;
