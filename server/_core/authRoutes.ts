/**
 * Authentication Routes
 *
 * Supports three login methods:
 * 1. Email + Password (traditional)
 * 2. Google OAuth 2.0
 * 3. Email OTP (passwordless)
 *
 * All auth endpoints are rate-limited.
 * User status (active/suspended) is checked on every login.
 * All auth events are audit-logged.
 */
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import bcrypt from "bcryptjs";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { createSessionToken } from "./auth";
import {
  authRateLimit,
  otpRequestRateLimit,
  otpVerifyRateLimit,
} from "../middleware/rateLimit";
import {
  handleGoogleCallback,
  getGoogleAuthUrl,
  isGoogleAuthEnabled,
} from "../services/googleAuthService";
import {
  requestOtp,
  verifyOtp,
  sendOtpEmail,
} from "../services/emailOtpService";

function getClientIp(req: Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  return typeof forwarded === "string"
    ? forwarded.split(",")[0].trim()
    : req.ip || req.socket.remoteAddress || "unknown";
}

async function issueSession(req: Request, res: Response, user: NonNullable<Awaited<ReturnType<typeof db.getUserById>>>) {
  const sessionToken = await createSessionToken(user, { expiresInMs: ONE_YEAR_MS });
  const cookieOptions = getSessionCookieOptions(req);
  res.cookie(COOKIE_NAME, sessionToken, { ...cookieOptions, maxAge: ONE_YEAR_MS });
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
  };
}

export function registerAuthRoutes(app: Express) {
  // ═══════════════════════════════════════════════════════════════════════
  // AUTH CONFIG — tells the frontend which methods are available
  // ═══════════════════════════════════════════════════════════════════════
  app.get("/api/auth/config", (_req: Request, res: Response) => {
    res.json({
      methods: {
        password: true,
        google: isGoogleAuthEnabled(),
        emailOtp: true,
      },
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // 1. EMAIL + PASSWORD
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * POST /api/auth/register
   * Register a new user with email and password.
   */
  app.post("/api/auth/register", authRateLimit, async (req: Request, res: Response) => {
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
        status: "active",
        lastSignedIn: new Date(),
      });

      if (!user) {
        return res.status(500).json({ error: "Failed to create account" });
      }

      // Create password auth_account
      await db.createAuthAccount({
        userId: user.id,
        provider: "password",
        providerUserId: email,
        verified: true,
      });

      // Audit log
      await db.createAuditLog({
        userId: user.id,
        action: "auth.register",
        entityType: "user",
        entityId: user.id,
        details: JSON.stringify({ method: "password" }),
        ipAddress: getClientIp(req),
      });

      const sessionUser = await issueSession(req, res, user);
      return res.json({ user: sessionUser });
    } catch (error) {
      console.error("[Auth] Registration failed:", error);
      return res.status(500).json({ error: "Registration failed" });
    }
  });

  /**
   * POST /api/auth/login
   * Login with email and password.
   */
  app.post("/api/auth/login", authRateLimit, async (req: Request, res: Response) => {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    try {
      const user = await db.getUserByEmail(email);

      if (!user || !user.passwordHash) {
        return res.status(401).json({ error: "Invalid email or password" });
      }

      // Check user status
      if (user.status === "suspended") {
        await db.createAuditLog({
          userId: user.id,
          action: "auth.login.blocked",
          entityType: "user",
          entityId: user.id,
          details: JSON.stringify({ reason: "suspended" }),
          ipAddress: getClientIp(req),
        });
        return res.status(403).json({ error: "Your account has been suspended. Please contact support." });
      }

      const isValid = await bcrypt.compare(password, user.passwordHash);
      if (!isValid) {
        await db.createAuditLog({
          userId: user.id,
          action: "auth.login.failed",
          entityType: "user",
          entityId: user.id,
          details: JSON.stringify({ method: "password" }),
          ipAddress: getClientIp(req),
        });
        return res.status(401).json({ error: "Invalid email or password" });
      }

      await db.updateUserLastSignedIn(user.id);

      // Audit log
      await db.createAuditLog({
        userId: user.id,
        action: "auth.login",
        entityType: "user",
        entityId: user.id,
        details: JSON.stringify({ method: "password" }),
        ipAddress: getClientIp(req),
      });

      const sessionUser = await issueSession(req, res, user);
      return res.json({ user: sessionUser });
    } catch (error) {
      console.error("[Auth] Login failed:", error);
      return res.status(500).json({ error: "Login failed" });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════
  // 2. GOOGLE OAUTH 2.0
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * GET /api/auth/google
   * Redirect to Google consent screen.
   */
  app.get("/api/auth/google", (_req: Request, res: Response) => {
    if (!isGoogleAuthEnabled()) {
      return res.status(501).json({ error: "Google login is not configured" });
    }
    const url = getGoogleAuthUrl();
    return res.redirect(url);
  });

  /**
   * GET /api/auth/google/callback
   * Handle Google OAuth callback — exchange code, find/create user, issue session.
   */
  app.get("/api/auth/google/callback", async (req: Request, res: Response) => {
    const { code, error: googleError } = req.query;

    if (googleError || !code) {
      console.error("[GoogleAuth] Callback error:", googleError);
      return res.redirect("/login?error=google_auth_failed");
    }

    try {
      const user = await handleGoogleCallback(code as string);

      // Audit log
      await db.createAuditLog({
        userId: user.id,
        action: "auth.login",
        entityType: "user",
        entityId: user.id,
        details: JSON.stringify({ method: "google" }),
        ipAddress: getClientIp(req),
      });

      await issueSession(req, res, user);
      return res.redirect("/dashboard");
    } catch (err: any) {
      console.error("[GoogleAuth] Callback failed:", err.message);
      const errorMsg = encodeURIComponent(err.message || "Google login failed");
      return res.redirect(`/login?error=${errorMsg}`);
    }
  });

  // ═══════════════════════════════════════════════════════════════════════
  // 3. EMAIL OTP (Passwordless)
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * POST /api/auth/otp/request
   * Request a 6-digit OTP sent to the provided email.
   */
  app.post("/api/auth/otp/request", otpRequestRateLimit, async (req: Request, res: Response) => {
    const { email } = req.body;

    if (!email || typeof email !== "string") {
      return res.status(400).json({ error: "Email is required" });
    }

    // Basic email validation
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: "Invalid email address" });
    }

    try {
      const { code } = await requestOtp(email.toLowerCase().trim());
      const sent = await sendOtpEmail(email.toLowerCase().trim(), code);

      if (!sent) {
        return res.status(500).json({ error: "Failed to send verification code. Please try again." });
      }

      // Audit log (don't log the code itself)
      await db.createAuditLog({
        userId: null,
        action: "auth.otp.requested",
        entityType: "email_otp",
        details: JSON.stringify({ email: email.toLowerCase().trim() }),
        ipAddress: getClientIp(req),
      });

      return res.json({ success: true, message: "Verification code sent to your email" });
    } catch (error: any) {
      console.error("[EmailOTP] Request failed:", error);
      return res.status(500).json({ error: "Failed to send verification code" });
    }
  });

  /**
   * POST /api/auth/otp/verify
   * Verify the OTP code and issue a session.
   */
  app.post("/api/auth/otp/verify", otpVerifyRateLimit, async (req: Request, res: Response) => {
    const { email, code } = req.body;

    if (!email || !code) {
      return res.status(400).json({ error: "Email and code are required" });
    }

    try {
      const { user } = await verifyOtp(email.toLowerCase().trim(), code.trim());

      // Audit log
      await db.createAuditLog({
        userId: user.id,
        action: "auth.login",
        entityType: "user",
        entityId: user.id,
        details: JSON.stringify({ method: "email_otp" }),
        ipAddress: getClientIp(req),
      });

      const sessionUser = await issueSession(req, res, user);
      return res.json({ user: sessionUser });
    } catch (error: any) {
      console.error("[EmailOTP] Verify failed:", error.message);
      return res.status(401).json({ error: error.message || "Verification failed" });
    }
  });

  // ═══════════════════════════════════════════════════════════════════════
  // LOGOUT
  // ═══════════════════════════════════════════════════════════════════════

  /**
   * POST /api/auth/logout
   * Clear the session cookie.
   */
  app.post("/api/auth/logout", (req: Request, res: Response) => {
    const cookieOptions = getSessionCookieOptions(req);
    res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });

    // Best-effort audit log (we may not know the user)
    db.createAuditLog({
      action: "auth.logout",
      ipAddress: getClientIp(req),
    }).catch(() => {});

    return res.json({ success: true });
  });
}
