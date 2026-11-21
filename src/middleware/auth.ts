import type { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../modules/jwt.utils.js";

declare global {
  namespace Express { interface Request { user?: ReturnType<typeof verifyAccessToken>; cookies?: Record<string, string> } }
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  const token = req.cookies?.access_token ?? (header?.startsWith("Bearer ") ? header.slice(7) : null);
  if (!token) {
    res.status(401).json({ success: false, message: "Authorization token is required." });
    return;
  }
  try {
    req.user = verifyAccessToken(token);
    next();
  } catch {
    res.status(401).json({ success: false, message: "Invalid or expired access token." });
  }
}
