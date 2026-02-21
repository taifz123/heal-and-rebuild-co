# Heal & Rebuild Co

A full-stack wellness booking and membership platform built with React, Node.js, tRPC, and Stripe. Features session booking with quota enforcement, subscription management, multi-provider authentication, and a comprehensive admin dashboard. Designed for seamless deployment on [Replit](https://replit.com).

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite, TailwindCSS |
| Backend | Node.js, Express, tRPC |
| Database | MySQL (via Drizzle ORM) |
| Authentication | Email/password, Google OAuth, Email OTP (passwordless) |
| Payments | Stripe Checkout + Stripe Subscriptions |
| UI Components | shadcn/ui (Radix UI primitives) |
| Security | Rate limiting, JWT session cookies, audit logging |

---

## Features

### Customer-Facing
- **Session Booking** — Browse available time slots, book sessions with real-time capacity display
- **Weekly Quota Enforcement** — Concurrency-safe quota tracking tied to membership tier
- **Membership Plans** — Monthly, quarterly, and annual tiers with Stripe subscription checkout
- **Gift Vouchers** — Purchase and redeem gift vouchers via Stripe
- **Customer Dashboard** — View weekly usage, upcoming sessions, subscription status, and booking history
- **Cancellation Policy** — Cancel bookings up to 4 hours before session start for credit return

### Authentication
- **Email/Password** — Standard registration and login with bcrypt-hashed passwords
- **Google OAuth** — One-click sign-in via Google (optional, requires credentials)
- **Email OTP** — Passwordless login via one-time code sent to email (optional, requires SMTP)
- **Protected Routes** — Client-side route guards redirect unauthenticated users to login
- **User Status** — Active/suspended status with automatic blocking of suspended accounts

### Admin Dashboard (6 tabs + Audit Log)
- **Members** — Search, filter by status, view detail with usage stats, apply overrides (add/remove sessions, suspend/reactivate) with confirmation modals
- **Bookings** — Filter by status, confirm bookings, mark no-shows with confirmation dialogs
- **Session Slots** — Create and manage bookable time slots with capacity tracking
- **Subscriptions** — View all subscriptions with churn risk indicators (expiring soon, payment failed)
- **Revenue** — 30-day totals, transaction count, failed payments, link to Stripe Dashboard
- **Overrides** — Full audit trail of all admin actions on member accounts
- **Audit Log** — System-wide log of auth events, admin actions, and security events

### Security
- **Rate Limiting** — Per-IP rate limiting on auth endpoints (10 req/min) and general API (100 req/min)
- **Stripe Webhook Idempotency** — Deduplication via `webhook_events` table prevents double-processing
- **Audit Logging** — All auth events (login, register, failed attempts, OTP requests) logged with IP addresses
- **Confirmation Modals** — All risky admin actions (suspend, no-show, overrides) require explicit confirmation

### Automation
- **Weekly Quota Reset** — Automated cron job resets all usage counters every Monday at midnight (gym timezone)
- **Subscription Lifecycle** — Stripe webhooks handle activation, renewal, cancellation, and failed payments

---

## Getting Started on Replit

### 1. Fork or Import the Repository

Import this repository into Replit by clicking **Create Repl → Import from GitHub** and entering the repository URL.

### 2. Configure Secrets

In your Replit project, navigate to **Tools → Secrets** and add the following:

| Secret | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | MySQL connection string (`mysql://user:pass@host:3306/db`) |
| `JWT_SECRET` | Yes | Long random string for signing session tokens |
| `STRIPE_SECRET_KEY` | Yes | Stripe secret key (`sk_test_...` or `sk_live_...`) |
| `STRIPE_WEBHOOK_SECRET` | Yes | Stripe webhook signing secret (`whsec_...`) |
| `PORT` | Yes | `3000` (Replit default) |
| `GOOGLE_CLIENT_ID` | No | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | No | Google OAuth client secret |
| `SMTP_HOST` | No | SMTP server for email OTP (e.g., `smtp.gmail.com`) |
| `SMTP_PORT` | No | SMTP port (e.g., `587`) |
| `SMTP_USER` | No | SMTP username |
| `SMTP_PASS` | No | SMTP password |
| `SMTP_FROM` | No | From address for OTP emails |

See `.env.example` for the full list with descriptions.

### 3. Set Up the Database

This project requires a MySQL-compatible database. Recommended providers:

- [PlanetScale](https://planetscale.com) (serverless MySQL)
- [Railway](https://railway.app) (managed MySQL)
- [Aiven](https://aiven.io) (managed MySQL)

Once your `DATABASE_URL` secret is set, run the database migrations:

```bash
pnpm db:push
```

Then seed the database with membership tiers, service types, test users, and session slots:

```bash
node seed-data.mjs
```

This creates:
- 3 membership tiers (Essential, Premium, Elite)
- 4 service types
- 5 test users (1 admin + 4 regular)
- ~80 session slots over the next 2 weeks

**Test credentials:**
- Admin: `admin@healandrebuild.co` / `password123`
- Users: `jane@example.com`, `john@example.com`, `sarah@example.com`, `mike@example.com` / `password123`

### 4. Run the Application

Click the **Run** button in Replit. The development server will start on port 3000 and Replit will provide a public URL.

---

## Local Development

```bash
# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env
# Edit .env with your values

# Run database migrations
pnpm db:push

# Seed the database
node seed-data.mjs

# Start the development server
pnpm dev
```

The application will be available at `http://localhost:3000`.

---

## Production Build

```bash
# Build the frontend and bundle the server
pnpm build

# Start the production server
pnpm start
```

---

## Project Structure

```
heal-and-rebuild-co/
├── client/                    # React frontend (Vite)
│   ├── src/
│   │   ├── _core/hooks/       # Auth hooks (useAuth)
│   │   ├── components/        # Reusable UI components (shadcn/ui)
│   │   │   └── ProtectedRoute.tsx  # Route guard component
│   │   ├── pages/             # Page components
│   │   │   ├── Home.tsx       # Landing page
│   │   │   ├── Login.tsx      # Multi-provider login (password, Google, OTP)
│   │   │   ├── Register.tsx   # Registration with Google option
│   │   │   ├── Dashboard.tsx  # Member dashboard with quota display
│   │   │   ├── Book.tsx       # Session booking with slot calendar
│   │   │   ├── Admin.tsx      # Admin dashboard (7 tabs)
│   │   │   ├── Memberships.tsx
│   │   │   └── GiftVouchers.tsx
│   │   └── lib/               # tRPC client setup
├── server/                    # Express backend
│   ├── _core/
│   │   ├── auth.ts            # JWT authentication helpers
│   │   ├── authRoutes.ts      # Auth REST endpoints (login, register, Google, OTP)
│   │   ├── context.ts         # tRPC context creation
│   │   ├── index.ts           # Server entry point
│   │   ├── trpc.ts            # tRPC procedure definitions
│   │   └── vite.ts            # Vite dev middleware
│   ├── middleware/
│   │   └── rateLimit.ts       # Rate limiting middleware
│   ├── services/
│   │   ├── bookingService.ts  # Booking logic with quota enforcement
│   │   ├── adminService.ts    # Admin operations and dashboard stats
│   │   ├── googleAuthService.ts   # Google OAuth flow
│   │   ├── emailOtpService.ts     # Email OTP generation and verification
│   │   ├── timezoneService.ts     # Week-start calculations
│   │   └── weeklyResetService.ts  # Cron job for weekly quota reset
│   ├── db.ts                  # Database queries (Drizzle ORM)
│   ├── routers.ts             # tRPC API routes
│   ├── stripe.ts              # Stripe checkout helpers
│   └── webhook.ts             # Stripe webhook handler with idempotency
├── drizzle/                   # Database schema and migrations
│   ├── schema.ts              # Full schema (users, bookings, slots, subscriptions, etc.)
│   ├── 0000_*.sql             # Initial migration
│   ├── 0003_full_booking_system.sql  # Booking system tables
│   └── 0004_auth_security_audit.sql  # Auth accounts, audit logs, OTP
├── shared/                    # Shared types and constants
├── .replit                    # Replit run configuration
├── replit.nix                 # Replit Nix environment
├── .env.example               # Environment variable template
├── seed-data.mjs              # Comprehensive database seed script
├── load-test.mjs              # Load testing script
└── package.json
```

---

## Authentication

### Email/Password
- **Register** — `POST /api/auth/register` with `{ name, email, password }`
- **Login** — `POST /api/auth/login` with `{ email, password }`
- **Logout** — `POST /api/auth/logout`

Passwords are hashed with bcrypt (12 rounds). Sessions are stored as signed JWT cookies.

### Google OAuth
- **Initiate** — `GET /api/auth/google` (redirects to Google consent screen)
- **Callback** — `GET /api/auth/google/callback` (handles token exchange)

Requires `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` environment variables. Set the redirect URI in Google Cloud Console to `https://YOUR_DOMAIN/api/auth/google/callback`.

### Email OTP (Passwordless)
- **Request OTP** — `POST /api/auth/otp/request` with `{ email }`
- **Verify OTP** — `POST /api/auth/otp/verify` with `{ email, code }`

Requires SMTP configuration (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`). OTP codes expire after 10 minutes.

---

## Stripe Webhook Setup

To handle payment events, configure a Stripe webhook:

1. In the [Stripe Dashboard](https://dashboard.stripe.com/webhooks), create a new endpoint pointing to `https://your-replit-url.replit.app/api/stripe/webhook`.
2. Select these events:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
3. Copy the signing secret and add it as `STRIPE_WEBHOOK_SECRET` in your Replit Secrets.

---

## Admin Access

The seed data includes an admin user (`admin@healandrebuild.co` / `password123`). To grant admin access to another user:

```sql
UPDATE users SET role = 'admin' WHERE email = 'your@email.com';
```

---

## Load Testing

Run the load testing suite to verify rate limiting, concurrent booking safety, and input validation:

```bash
# Against local server
node load-test.mjs

# Against a deployed URL
node load-test.mjs https://your-app.replit.app
```

The test suite includes:
1. **Auth endpoint load** — 50 concurrent login attempts
2. **Concurrent booking stress** — Multiple users booking the same slot simultaneously
3. **Rate limit burst** — 100 rapid requests to verify rate limiting
4. **Input validation** — Malformed payloads, SQL injection, XSS attempts

---

## License

MIT
