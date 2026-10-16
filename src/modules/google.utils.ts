import { OAuth2Client } from "google-auth-library";
import { env } from "../config/env.js";

const client = new OAuth2Client(env.GOOGLE_CLIENT_ID);

export interface GoogleUser {
  googleId: string;
  email: string;
  name: string;
  emailVerified: boolean;
}

export async function verifyGoogleToken(idToken: string): Promise<GoogleUser> {
  const ticket = await client.verifyIdToken({
    idToken,
    audience: env.GOOGLE_CLIENT_ID,
  });

  const payload = ticket.getPayload();

  if (!payload) {
    throw new Error("Invalid Google ID Token.");
  }

  if (!payload.email) {
    throw new Error("Google account does not have an email.");
  }

  if (!payload.name) {
    throw new Error("Google account does not have a name.");
  }

  if (!payload.email_verified) {
    throw new Error("Google email is not verified.");
  }

  return {
    googleId: payload.sub,
    email: payload.email,
    name: payload.name,
    emailVerified: payload.email_verified,
  };
}
