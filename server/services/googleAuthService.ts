/**
 * Google OAuth 2.0 Authentication Service
 *
 * Implements the Authorization Code flow:
 * 1. Client redirects to Google consent screen
 * 2. Google redirects back with authorization code
 * 3. Server exchanges code for tokens
 * 4. Server verifies ID token and extracts user info
 * 5. Server creates/links auth_account and issues session
 */
import * as db from "../db";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo";

export interface GoogleUserInfo {
  sub: string; // Google user ID
  email: string;
  email_verified: boolean;
  name?: string;
  picture?: string;
}

function getGoogleClientId(): string {
  const id = process.env.GOOGLE_CLIENT_ID;
  if (!id) throw new Error("GOOGLE_CLIENT_ID is not configured");
  return id;
}

function getGoogleClientSecret(): string {
  const secret = process.env.GOOGLE_CLIENT_SECRET;
  if (!secret) throw new Error("GOOGLE_CLIENT_SECRET is not configured");
  return secret;
}

function getGoogleRedirectUri(): string {
  // In Replit, the REPL_SLUG and REPL_OWNER env vars help construct the URL
  // But we prefer an explicit env var for flexibility
  const uri = process.env.GOOGLE_REDIRECT_URI;
  if (!uri) {
    // Fallback: construct from the request origin (set at runtime)
    const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
    return `${baseUrl}/api/auth/google/callback`;
  }
  return uri;
}

/**
 * Generate the Google OAuth consent URL
 */
export function getGoogleAuthUrl(state?: string): string {
  const params = new URLSearchParams({
    client_id: getGoogleClientId(),
    redirect_uri: getGoogleRedirectUri(),
    response_type: "code",
    scope: "openid email profile",
    access_type: "offline",
    prompt: "consent",
    ...(state ? { state } : {}),
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/**
 * Exchange authorization code for tokens
 */
async function exchangeCodeForTokens(code: string): Promise<{ access_token: string; id_token?: string }> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: getGoogleClientId(),
      client_secret: getGoogleClientSecret(),
      redirect_uri: getGoogleRedirectUri(),
      grant_type: "authorization_code",
    }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    console.error("[GoogleAuth] Token exchange failed:", errBody);
    throw new Error("Failed to exchange authorization code");
  }

  return res.json();
}

/**
 * Fetch user info from Google using access token
 */
async function fetchGoogleUserInfo(accessToken: string): Promise<GoogleUserInfo> {
  const res = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    throw new Error("Failed to fetch Google user info");
  }

  return res.json();
}

/**
 * Handle Google OAuth callback:
 * - Exchange code for tokens
 * - Get user info
 * - Find or create user + auth_account
 * - Return the user record
 */
export async function handleGoogleCallback(code: string) {
  const tokens = await exchangeCodeForTokens(code);
  const googleUser = await fetchGoogleUserInfo(tokens.access_token);

  if (!googleUser.email) {
    throw new Error("Google account does not have an email address");
  }

  // Check if this Google account is already linked
  const existingAccount = await db.getAuthAccount("google", googleUser.sub);

  if (existingAccount) {
    // User already linked — update last sign in and return
    const user = await db.getUserById(existingAccount.userId);
    if (!user) throw new Error("Linked user not found");

    // Check if user is suspended
    if (user.status === "suspended") {
      throw new Error("Your account has been suspended. Please contact support.");
    }

    await db.updateUserLastSignedIn(user.id);
    return user;
  }

  // Check if a user with this email already exists (link accounts)
  let user = await db.getUserByEmail(googleUser.email);

  if (user) {
    // Check if user is suspended
    if (user.status === "suspended") {
      throw new Error("Your account has been suspended. Please contact support.");
    }

    // Link Google to existing user
    await db.createAuthAccount({
      userId: user.id,
      provider: "google",
      providerUserId: googleUser.sub,
      verified: true,
    });
    await db.updateUserLastSignedIn(user.id);
    return user;
  }

  // Create new user + auth_account
  const newUser = await db.createUser({
    name: googleUser.name || null,
    email: googleUser.email,
    passwordHash: null, // Google users don't need a password
    role: "user",
    status: "active",
    lastSignedIn: new Date(),
  });

  if (!newUser) throw new Error("Failed to create user");

  await db.createAuthAccount({
    userId: newUser.id,
    provider: "google",
    providerUserId: googleUser.sub,
    verified: true,
  });

  // Also create an email auth_account so they can use OTP later
  await db.createAuthAccount({
    userId: newUser.id,
    provider: "email",
    providerUserId: googleUser.email,
    verified: googleUser.email_verified,
  });

  return newUser;
}

/**
 * Check if Google OAuth is configured
 */
export function isGoogleAuthEnabled(): boolean {
  return !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}
