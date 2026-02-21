import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerAuthRoutes } from "./authRoutes";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { ENV } from "./env";

async function startServer() {
  const app = express();
  const server = createServer(app);

  // CRITICAL: Stripe webhook MUST use raw body before JSON middleware
  app.use("/api/stripe/webhook", express.raw({ type: "application/json" }));

  // Configure body parser with larger size limit for file uploads
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Standard email/password auth routes
  registerAuthRoutes(app);

  // Stripe webhook
  const webhookRouter = await import("../webhook");
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
  });
}

startServer().catch(console.error);
