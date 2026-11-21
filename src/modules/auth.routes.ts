import { Router, type Router as RouterType } from "express";
import * as authController from "./auth.controller.js";
import { requireAuth } from "../middleware/auth.js";

const router: RouterType = Router();
router.post("/google", authController.googleLogin);
router.post("/refresh", authController.refreshToken);
router.post("/logout", authController.logout);
router.get("/me", requireAuth, (req, res) => res.json({ success: true, data: { userId: req.user?.userId, email: req.user?.email } }));

export default router;
