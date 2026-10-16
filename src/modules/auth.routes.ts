import { Router, type Router as RouterType } from "express";
import * as authController from "./auth.controller.js";

const router: RouterType = Router();
router.post("/google", authController.googleLogin);
router.post("/refresh", authController.refreshToken);
router.post("/logout", authController.logout);

export default router;
