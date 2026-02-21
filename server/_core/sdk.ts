/**
 * This file previously contained the Manus OAuth SDK.
 * It has been replaced by the standard JWT-based authentication
 * system in `auth.ts` and `authRoutes.ts`.
 *
 * Authentication is now handled via:
 *   - POST /api/auth/register  → register with email + password
 *   - POST /api/auth/login     → login with email + password
 *   - POST /api/auth/logout    → clear session cookie
 *
 * Session tokens are signed JWTs stored as HttpOnly cookies.
 */

export {};
