/**
 * Email OTP (One-Time Password) Service
 *
 * Implements passwordless email login:
 * 1. User enters email
 * 2. Server generates a 6-digit OTP, stores it, and sends it via email
 * 3. User enters OTP
 * 4. Server verifies OTP and issues session
 *
 * Security:
 * - OTPs expire after 10 minutes
 * - Max 5 verification attempts per OTP
 * - Previous OTPs for the same email are invalidated on new request
 * - Rate limited at the route level (see authRoutes.ts)
 */
import * as db from "../db";

const OTP_EXPIRY_MINUTES = 10;
const MAX_OTP_ATTEMPTS = 5;

/**
 * Generate a cryptographically random 6-digit OTP
 */
function generateOtpCode(): string {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return String(array[0] % 1000000).padStart(6, "0");
}

/**
 * Request an OTP for the given email.
 * Invalidates any existing unused OTPs for this email.
 * Returns the generated code (to be sent via email).
 */
export async function requestOtp(email: string): Promise<{ code: string; expiresAt: Date }> {
  // Invalidate any existing OTPs for this email
  await db.invalidateOtpsForEmail(email);

  const code = generateOtpCode();
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  await db.createEmailOtp({
    email,
    code,
    expiresAt,
    used: false,
    attempts: 0,
  });

  return { code, expiresAt };
}

/**
 * Verify an OTP code for the given email.
 * Returns the user on success, or throws an error.
 */
export async function verifyOtp(
  email: string,
  code: string
): Promise<{ user: NonNullable<Awaited<ReturnType<typeof db.getUserByEmail>>> }> {
  const otp = await db.getLatestEmailOtp(email);

  if (!otp) {
    throw new Error("No valid OTP found. Please request a new code.");
  }

  // Check max attempts
  if (otp.attempts >= MAX_OTP_ATTEMPTS) {
    await db.markOtpUsed(otp.id);
    throw new Error("Too many attempts. Please request a new code.");
  }

  // Increment attempts
  await db.incrementOtpAttempts(otp.id);

  // Verify code
  if (otp.code !== code) {
    const remaining = MAX_OTP_ATTEMPTS - otp.attempts - 1;
    throw new Error(
      remaining > 0
        ? `Invalid code. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`
        : "Invalid code. Please request a new code."
    );
  }

  // Mark OTP as used
  await db.markOtpUsed(otp.id);

  // Find or create user
  let user = await db.getUserByEmail(email);

  if (user) {
    // Check if user is suspended
    if (user.status === "suspended") {
      throw new Error("Your account has been suspended. Please contact support.");
    }
    await db.updateUserLastSignedIn(user.id);
  } else {
    // Create new user (OTP-based registration)
    user = await db.createUser({
      name: null,
      email,
      passwordHash: null,
      role: "user",
      status: "active",
      lastSignedIn: new Date(),
    });

    if (!user) throw new Error("Failed to create user account");

    // Create email auth_account
    await db.createAuthAccount({
      userId: user.id,
      provider: "email",
      providerUserId: email,
      verified: true,
    });
  }

  return { user };
}

/**
 * Send OTP via email.
 *
 * In production, integrate with a real email service (Resend, SendGrid, SES, etc.).
 * For now, this logs the OTP to console and returns success.
 *
 * To integrate Resend:
 *   import { Resend } from 'resend';
 *   const resend = new Resend(process.env.RESEND_API_KEY);
 */
export async function sendOtpEmail(email: string, code: string): Promise<boolean> {
  // Check if Resend is configured
  if (process.env.RESEND_API_KEY) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: process.env.EMAIL_FROM || "Heal & Rebuild Co <noreply@healandrebuild.co>",
          to: [email],
          subject: `Your login code: ${code}`,
          html: `
            <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 20px;">
              <h2 style="font-weight: 300; margin-bottom: 24px;">Heal & Rebuild Co</h2>
              <p>Your one-time login code is:</p>
              <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; text-align: center; padding: 24px; background: #f4f4f5; border-radius: 8px; margin: 16px 0;">
                ${code}
              </div>
              <p style="color: #71717a; font-size: 14px;">This code expires in 10 minutes. If you didn't request this, you can safely ignore this email.</p>
            </div>
          `,
        }),
      });

      if (!res.ok) {
        const errBody = await res.text();
        console.error("[EmailOTP] Resend API error:", errBody);
        return false;
      }

      console.log(`[EmailOTP] Code sent to ${email} via Resend`);
      return true;
    } catch (err) {
      console.error("[EmailOTP] Failed to send via Resend:", err);
      return false;
    }
  }

  // Fallback: log to console (development mode)
  console.log(`\n╔══════════════════════════════════════════╗`);
  console.log(`║  EMAIL OTP for ${email}`);
  console.log(`║  Code: ${code}`);
  console.log(`║  Expires in ${OTP_EXPIRY_MINUTES} minutes`);
  console.log(`╚══════════════════════════════════════════╝\n`);

  return true;
}
