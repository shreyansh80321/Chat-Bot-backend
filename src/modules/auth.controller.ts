import type { Request, Response, NextFunction } from "express";
import * as authService from "./auth.service.js";
const isProduction = process.env.NODE_ENV === "production";
const cookieOptions = `HttpOnly; SameSite=${isProduction ? "None" : "Lax"};${isProduction ? " Secure;" : ""} Max-Age=`;
const setAuthCookies = (res: Response, accessToken: string, refreshToken: string) => res.setHeader("Set-Cookie", [`access_token=${encodeURIComponent(accessToken)}; ${cookieOptions}900; Path=/`, `refresh_token=${encodeURIComponent(refreshToken)}; ${cookieOptions}604800; Path=/`]);

export const googleLogin = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      res.status(400).json({
        success: false,
        message: "Google ID Token is required.",
      });
      return;
    }

    const userAgent = req.get("user-agent");
    const metadata = {
      ...(typeof req.headers["x-device-id"] === "string" && { deviceId: req.headers["x-device-id"] }),
      ...(userAgent ? { userAgent } : {}),
      ...(req.ip && { ipAddress: req.ip }),
    };
    const result = await authService.googleLogin(idToken, metadata);
    setAuthCookies(res, result.accessToken, result.refreshToken);

    res.status(200).json({
      success: true,
      message: "Login successful.",
      data: { user: result.user },
    });
  } catch (error) {
    next(error);
  }
};

export const refreshToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const refreshToken = req.cookies?.refresh_token ?? req.body?.refreshToken;

    if (!refreshToken) {
      res.status(400).json({
        success: false,
        message: "Refresh token is required.",
      });
      return;
    }

    const result = await authService.refreshToken(refreshToken);
    setAuthCookies(res, result.accessToken, result.refreshToken);

    res.status(200).json({
      success: true,
      message: "Token refreshed successfully.",
      data: { success: true },
    });
  } catch (error) {
    next(error);
  }
};

export const logout = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const refreshToken = req.cookies?.refresh_token ?? req.body?.refreshToken;

    if (!refreshToken) {
      res.status(400).json({
        success: false,
        message: "Refresh token is required.",
      });
      return;
    }

    await authService.logout(refreshToken);
    res.setHeader("Set-Cookie", ["access_token=; HttpOnly; Max-Age=0; Path=/", "refresh_token=; HttpOnly; Max-Age=0; Path=/"]);

    res.status(200).json({
      success: true,
      message: "Logged out successfully.",
    });
  } catch (error) {
    next(error);
  }
};
