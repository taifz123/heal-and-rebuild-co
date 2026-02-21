/**
 * Standard JWT-based authentication for Replit deployment.
 * Replaces the Manus OAuth flow with email/password login.
 */
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { parse as parseCookieHeader } from "cookie";
import type { Request } from "express";
import { SignJWT, jwtVerify } from "jose";
import type { User } from "../../drizzle/schema";
import * as db from "../db";
import { ENV } from "./env";
import { ForbiddenError } from "@shared/_core/errors";

export type SessionPayload = {
  userId: number;
  email: string;
  name: string;
};

function getSessionSecret() {
  return new TextEncoder().encode(ENV.cookieSecret);
}

function parseCookies(cookieHeader: string | undefined): Map<string, string> {
  if (!cookieHeader) return new Map();
  return new Map(Object.entries(parseCookieHeader(cookieHeader)));
}

/**
 * Create a signed JWT session token for a user.
 */
export async function createSessionToken(
  user: User,
  options: { expiresInMs?: number } = {}
): Promise<string> {
  const issuedAt = Date.now();
  const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;
  const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1000);
  const secretKey = getSessionSecret();

  return new SignJWT({
    userId: user.id,
    email: user.email ?? "",
    name: user.name ?? "",
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setExpirationTime(expirationSeconds)
    .sign(secretKey);
}

/**
 * Verify a JWT session token and return the payload.
 */
export async function verifySessionToken(
  token: string | undefined | null
): Promise<SessionPayload | null> {
  if (!token) return null;

  try {
    const secretKey = getSessionSecret();
    const { payload } = await jwtVerify(token, secretKey, {
      algorithms: ["HS256"],
    });

    const { userId, email, name } = payload as Record<string, unknown>;

    if (typeof userId !== "number" || typeof email !== "string") {
      return null;
    }

    return {
      userId: userId as number,
      email: email as string,
      name: (name as string) ?? "",
    };
  } catch {
    return null;
  }
}

/**
 * Authenticate an incoming Express request via session cookie.
 * Returns the User record or throws ForbiddenError.
 */
export async function authenticateRequest(req: Request): Promise<User> {
  const cookies = parseCookies(req.headers.cookie);
  const sessionCookie = cookies.get(COOKIE_NAME);
  const session = await verifySessionToken(sessionCookie);

  if (!session) {
    throw ForbiddenError("Invalid or missing session");
  }

  const user = await db.getUserById(session.userId);

  if (!user) {
    throw ForbiddenError("User not found");
  }

  return user;
}
