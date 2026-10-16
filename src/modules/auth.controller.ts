import type { Request, Response, NextFunction } from "express";
import * as authService from "./auth.service.js";

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

    res.status(200).json({
      success: true,
      message: "Login successful.",
      data: result,
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
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(400).json({
        success: false,
        message: "Refresh token is required.",
      });
      return;
    }

    const result = await authService.refreshToken(refreshToken);

    res.status(200).json({
      success: true,
      message: "Token refreshed successfully.",
      data: result,
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
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(400).json({
        success: false,
        message: "Refresh token is required.",
      });
      return;
    }

    await authService.logout(refreshToken);

    res.status(200).json({
      success: true,
      message: "Logged out successfully.",
    });
  } catch (error) {
    next(error);
  }
};
