import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerAuthRoutes } from "./authRoutes";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { ENV } from "./env";
import { startWeeklyResetScheduler } from "../services/weeklyResetService";
import { generalApiRateLimit, webhookRateLimit } from "../middleware/rateLimit";

async function startServer() {
  const app = express();
  const server = createServer(app);

  // Trust proxy (Replit runs behind a reverse proxy)
  app.set("trust proxy", 1);

  // CRITICAL: Stripe webhook MUST use raw body before JSON middleware
  app.use("/api/stripe/webhook", express.raw({ type: "application/json" }));

  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Global rate limiting on API routes (auth routes have their own stricter limits)
  app.use("/api/trpc", generalApiRateLimit);

  // Auth routes (Google OAuth, Email OTP, Password — each with own rate limits)
  registerAuthRoutes(app);

  // Stripe webhook (with webhook-specific rate limiting)
  const webhookRouter = await import("../webhook");
  app.use("/api/stripe/webhook", webhookRateLimit);
  app.use(webhookRouter.default);

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  // Development mode uses Vite dev server; production mode serves static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const port = ENV.port;

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);

    // Log auth configuration
    const googleEnabled = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
    const resendEnabled = !!process.env.RESEND_API_KEY;
    console.log(`Auth methods: password=yes, google=${googleEnabled ? "yes" : "no"}, emailOtp=yes (resend=${resendEnabled ? "yes" : "console"})`);

    // Start the weekly quota reset scheduler
    startWeeklyResetScheduler();
  });
}

startServer().catch(console.error);
