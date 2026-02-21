/**
 * This file previously contained Manus OAuth platform types
 * (AuthorizeRequest, ExchangeTokenRequest, GetUserInfoResponse, etc.).
 *
 * These have been removed as part of the migration to standard
 * email/password authentication for Replit deployment.
 *
 * Auth is now handled by bcrypt + JWT in:
 *   server/_core/auth.ts
 *   server/_core/authRoutes.ts
 */

export {};
