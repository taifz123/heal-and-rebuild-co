# Heal & Rebuild Co

A full-stack wellness booking and membership platform built with React, Node.js, tRPC, and Stripe. Designed for seamless deployment on [Replit](https://replit.com).

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript, Vite, TailwindCSS |
| Backend | Node.js, Express, tRPC |
| Database | MySQL (via Drizzle ORM) |
| Authentication | Email/password with JWT session cookies |
| Payments | Stripe Checkout |
| UI Components | shadcn/ui (Radix UI primitives) |

---

## Features

- **Membership Plans** — Monthly, quarterly, and annual tiers with Stripe checkout
- **Session Booking** — Book gym sessions, therapy, and wellness services
- **Gift Vouchers** — Purchase and redeem gift vouchers via Stripe
- **Customer Dashboard** — View active memberships and upcoming bookings
- **Admin Panel** — Manage users, bookings, memberships, and view analytics
- **Email/Password Auth** — Self-contained authentication with bcrypt and JWT

---

## Getting Started on Replit

### 1. Fork or Import the Repository

Import this repository into Replit by clicking **Create Repl → Import from GitHub** and entering the repository URL.

### 2. Configure Secrets

In your Replit project, navigate to **Tools → Secrets** and add the following environment variables:

| Secret | Description |
|---|---|
| `DATABASE_URL` | MySQL connection string (e.g., `mysql://user:pass@host:3306/db`) |
| `JWT_SECRET` | A long, random string for signing session tokens |
| `STRIPE_SECRET_KEY` | Your Stripe secret key (`sk_test_...` or `sk_live_...`) |
| `STRIPE_WEBHOOK_SECRET` | Your Stripe webhook signing secret (`whsec_...`) |
| `PORT` | `3000` (Replit default) |

See `.env.example` for the full list of available variables.

### 3. Set Up the Database

This project requires a MySQL-compatible database. Recommended providers that work well with Replit:

- [PlanetScale](https://planetscale.com) (serverless MySQL)
- [Railway](https://railway.app) (managed MySQL)
- [Aiven](https://aiven.io) (managed MySQL)

Once your `DATABASE_URL` secret is set, run the database migrations:

```bash
pnpm db:push
```

Then seed the initial membership tiers and service types:

```bash
pnpm db:seed
```

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

# Seed initial data
pnpm db:seed

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
├── client/              # React frontend (Vite)
│   ├── src/
│   │   ├── _core/       # Auth hooks
│   │   ├── components/  # Reusable UI components (shadcn/ui)
│   │   ├── pages/       # Page components (Home, Login, Dashboard, etc.)
│   │   └── lib/         # tRPC client setup
├── server/              # Express backend
│   ├── _core/           # Auth, context, tRPC setup, Vite middleware
│   ├── db.ts            # Database queries (Drizzle ORM)
│   ├── routers.ts       # tRPC API routes
│   ├── stripe.ts        # Stripe checkout helpers
│   └── webhook.ts       # Stripe webhook handler
├── drizzle/             # Database schema and migrations
├── shared/              # Shared types and constants
├── .replit              # Replit run configuration
├── replit.nix           # Replit Nix environment
├── .env.example         # Environment variable template
└── seed-tiers.mjs       # Database seed script
```

---

## Authentication

Authentication uses a standard email/password flow:

- **Register** — `POST /api/auth/register` with `{ name, email, password }`
- **Login** — `POST /api/auth/login` with `{ email, password }`
- **Logout** — `POST /api/auth/logout`

Passwords are hashed with bcrypt (12 rounds). Sessions are stored as signed JWT cookies.

---

## Stripe Webhook Setup

To handle payment events (membership activation, gift voucher creation), configure a Stripe webhook:

1. In the [Stripe Dashboard](https://dashboard.stripe.com/webhooks), create a new endpoint pointing to `https://your-replit-url.replit.app/api/stripe/webhook`.
2. Select the `checkout.session.completed` event.
3. Copy the signing secret and add it as `STRIPE_WEBHOOK_SECRET` in your Replit Secrets.

---

## Admin Access

To grant admin access to a user, update their `role` to `admin` directly in the database:

```sql
UPDATE users SET role = 'admin' WHERE email = 'your@email.com';
```

---

## License

MIT
