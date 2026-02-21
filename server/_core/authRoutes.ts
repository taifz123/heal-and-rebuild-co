/**
 * Standard email/password authentication routes.
 * Replaces the Manus OAuth callback with a self-contained auth system.
 */
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import bcrypt from "bcryptjs";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { createSessionToken } from "./auth";

export function registerAuthRoutes(app: Express) {
  /**
   * POST /api/auth/register
   * Register a new user with email and password.
   */
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    const { name, email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters" });
    }

    try {
      const existing = await db.getUserByEmail(email);
      if (existing) {
        return res.status(409).json({ error: "An account with this email already exists" });
      }

      const passwordHash = await bcrypt.hash(password, 12);
      const user = await db.createUser({
        name: name || null,
        email,
        passwordHash,
        role: "user",
        lastSignedIn: new Date(),
      });

      if (!user) {
        return res.status(500).json({ error: "Failed to create account" });
      }

      const sessionToken = await createSessionToken(user, { expiresInMs: ONE_YEAR_MS });
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      return res.json({
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      });
    } catch (error) {
      console.error("[Auth] Registration failed:", error);
      return res.status(500).json({ error: "Registration failed" });
    }
  });

  /**
   * POST /api/auth/login
   * Login with email and password.
   */
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    try {
      const user = await db.getUserByEmail(email);

      if (!user || !user.passwordHash) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      const isValid = await bcrypt.compare(password, user.passwordHash);
      if (!isValid) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      await db.updateUserLastSignedIn(user.id);

      const sessionToken = await createSessionToken(user, { expiresInMs: ONE_YEAR_MS });
      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });

      return res.json({
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      });
    } catch (error) {
      console.error("[Auth] Login failed:", error);
      return res.status(500).json({ error: "Login failed" });
    }
  });

  /**
   * POST /api/auth/logout
   * Clear the session cookie.
   */
  app.post("/api/auth/logout", (req: Request, res: Response) => {
    const cookieOptions = getSessionCookieOptions(req);
    res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
    return res.json({ success: true });
  });
}
