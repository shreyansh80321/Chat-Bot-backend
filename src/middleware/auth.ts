import type { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../modules/jwt.utils.js";

declare global {
  namespace Express { interface Request { user?: ReturnType<typeof verifyAccessToken> } }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ success: false, message: "Authorization token is required." });
    return;
  }
  try {
    req.user = verifyAccessToken(header.slice(7));
    next();
  } catch {
    res.status(401).json({ success: false, message: "Invalid or expired access token." });
  }
}
