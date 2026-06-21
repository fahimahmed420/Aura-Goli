import jwt, { type SignOptions } from "jsonwebtoken";
import { randomBytes } from "crypto";

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET!;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET!;
const ACCESS_EXPIRES_IN: SignOptions["expiresIn"] = (process.env.JWT_ACCESS_EXPIRES_IN ?? "7d") as SignOptions["expiresIn"];

export interface AccessTokenPayload {
  sub: string;
  email: string;
  role: string;
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: ACCESS_EXPIRES_IN });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, ACCESS_SECRET) as AccessTokenPayload;
}

export function signRefreshToken(payload: { sub: string }): string {
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: "30d" });
}

export function signRememberMeRefreshToken(payload: { sub: string }): string {
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: "90d" });
}

export function verifyRefreshToken(token: string): { sub: string } {
  return jwt.verify(token, REFRESH_SECRET) as { sub: string };
}

export function generateSecureToken(): string {
  return randomBytes(32).toString("hex");
}

export function refreshTokenExpiry(rememberMe = false): Date {
  const days = rememberMe ? 90 : 30;
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

export function passwordResetExpiry(): Date {
  return new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
}

export function emailVerificationExpiry(): Date {
  return new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
}
