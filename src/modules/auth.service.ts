import { randomUUID } from "node:crypto";
import * as authRepository from "./auth.repository.js";
import { verifyGoogleToken } from "./google.utils.js";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from "./jwt.utils.js";
import { env } from "../config/env.js";

const refreshExpiryMs = (value: string): number => {
  const match = value.trim().match(/^(\d+)([smhd])$/i);
  if (!match) return 7 * 24 * 60 * 60 * 1000;
  const amount = Number(match[1]);
  const multiplier = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }[match[2]!.toLowerCase() as "s" | "m" | "h" | "d"];
  return amount * multiplier;
};

const tokensFor = (user: { id: string; userRefId: string; email: string }) => {
  const payload = { userId: user.id, userRefId: user.userRefId, email: user.email };
  return { accessToken: generateAccessToken(payload), refreshToken: generateRefreshToken(payload) };
};

export async function googleLogin(
  idToken: string,
  metadata: { deviceId?: string; userAgent?: string; ipAddress?: string } = {}
) {
  const googleUser = await verifyGoogleToken(idToken);
  const googleAccount = await authRepository.findUserByGoogleId(googleUser.googleId);
  let account = googleAccount?.user;
  if (!account) {
    const existingUser = await authRepository.findUserByEmail(googleUser.email);
    if (existingUser) throw new Error("An account already exists with this email.");
    account = await authRepository.createUser({
      userRefId: randomUUID(), name: googleUser.name, email: googleUser.email, googleId: googleUser.googleId,
    });
  }
  const tokens = tokensFor(account);
  await authRepository.createSession({
    userId: account.id, refreshToken: tokens.refreshToken, ...metadata,
    expiresAt: new Date(Date.now() + refreshExpiryMs(env.REFRESH_TOKEN_EXPIRY)),
  });
  return { user: { id: account.id, userRefId: account.userRefId, name: account.name, email: account.email }, ...tokens };
}

export async function refreshToken(token: string) {
  const payload = verifyRefreshToken(token);
  const session = await authRepository.findSessionByRefreshToken(token);
  if (!session || session.expiresAt <= new Date() || session.userId !== payload.userId) {
    throw new Error("Refresh token is invalid or expired.");
  }
  await authRepository.deleteSession(token);
  const tokens = tokensFor(session.user);
  await authRepository.createSession({ userId: session.user.id, refreshToken: tokens.refreshToken, expiresAt: new Date(Date.now() + refreshExpiryMs(env.REFRESH_TOKEN_EXPIRY)) });
  return tokens;
}

export async function logout(token: string) {
  await authRepository.deleteSession(token).catch(() => undefined);
}
