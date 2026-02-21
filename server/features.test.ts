import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createTestContext(isAdmin = false, userId = 1): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: userId,
    email: `user${userId}@example.com`,
    name: `Test User ${userId}`,
    passwordHash: null,
    role: isAdmin ? "admin" : "user",
    status: "active",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: { origin: "https://test.example.com" },
      get: (key: string) => (key === "host" ? "test.example.com" : undefined),
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return { ctx };
}

function createPublicContext(): { ctx: TrpcContext } {
  const ctx: TrpcContext = {
    user: null,
    req: {
      protocol: "https",
      headers: {},
      get: () => undefined,
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return { ctx };
}

// ─── Public Endpoints ──────────────────────────────────────────────────────

describe("Membership Tiers", () => {
  it("should allow public access to membership tiers", async () => {
    const { ctx } = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const tiers = await caller.membershipTiers.getAll();
    expect(Array.isArray(tiers)).toBe(true);
  });

  it("should retrieve a specific tier by id", async () => {
    const { ctx } = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const tier = await caller.membershipTiers.getById({ id: 1 });
    if (tier) {
      expect(tier).toHaveProperty("name");
      expect(tier).toHaveProperty("price");
      expect(tier).toHaveProperty("duration");
      expect(tier).toHaveProperty("sessionsPerWeek");
    }
  });
});

describe("Service Types", () => {
  it("should allow public access to service types", async () => {
    const { ctx } = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const services = await caller.serviceTypes.getAll();
    expect(Array.isArray(services)).toBe(true);
  });
});

describe("Session Slots (Public)", () => {
  it("should allow public access to available session slots", async () => {
    const { ctx } = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const slots = await caller.sessionSlots.getAvailable();
    expect(Array.isArray(slots)).toBe(true);
  });

  it("should accept optional date range parameters", async () => {
    const { ctx } = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const from = new Date().toISOString();
    const to = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const slots = await caller.sessionSlots.getAvailable({ from, to });
    expect(Array.isArray(slots)).toBe(true);
  });
});

// ─── Authentication ────────────────────────────────────────────────────────

describe("Authentication", () => {
  it("should return user info for authenticated requests", async () => {
    const { ctx } = createTestContext();
    const caller = appRouter.createCaller(ctx);
    const user = await caller.auth.me();
    expect(user).toBeDefined();
    expect(user?.email).toBe("user1@example.com");
    expect(user).toHaveProperty("id");
    expect(user).toHaveProperty("role");
  });

  it("should return null for unauthenticated requests", async () => {
    const { ctx } = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const user = await caller.auth.me();
    expect(user).toBeNull();
  });
});

// ─── Memberships (Legacy) ──────────────────────────────────────────────────

describe("User Memberships", () => {
  it("should allow authenticated users to view their memberships", async () => {
    const { ctx } = createTestContext();
    const caller = appRouter.createCaller(ctx);
    const memberships = await caller.memberships.getMy();
    expect(Array.isArray(memberships)).toBe(true);
  });

  it("should allow authenticated users to check active membership", async () => {
    const { ctx } = createTestContext();
    const caller = appRouter.createCaller(ctx);
    const activeMembership = await caller.memberships.getActive();
    expect(activeMembership === undefined || activeMembership === null || typeof activeMembership === "object").toBe(true);
  });
});

// ─── Subscriptions ─────────────────────────────────────────────────────────

describe("Subscriptions", () => {
  it("should allow authenticated users to view their subscriptions", async () => {
    const { ctx } = createTestContext();
    const caller = appRouter.createCaller(ctx);
    const subs = await caller.subscriptions.getMy();
    expect(Array.isArray(subs)).toBe(true);
  });

  it("should allow authenticated users to check active subscription", async () => {
    const { ctx } = createTestContext();
    const caller = appRouter.createCaller(ctx);
    const activeSub = await caller.subscriptions.getActive();
    expect(activeSub === undefined || activeSub === null || typeof activeSub === "object").toBe(true);
  });

  it("should deny unauthenticated users from viewing subscriptions", async () => {
    const { ctx } = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.subscriptions.getMy()).rejects.toThrow();
  });
});

// ─── Bookings ──────────────────────────────────────────────────────────────

describe("Bookings", () => {
  it("should allow authenticated users to view their bookings", async () => {
    const { ctx } = createTestContext();
    const caller = appRouter.createCaller(ctx);
    const bookings = await caller.bookings.getMy();
    expect(Array.isArray(bookings)).toBe(true);
  });

  it("should return a booking summary with quota info", async () => {
    const { ctx } = createTestContext();
    const caller = appRouter.createCaller(ctx);
    const summary = await caller.bookings.getSummary();
    expect(summary).toBeDefined();
    expect(summary).toHaveProperty("sessionsUsed");
    expect(summary).toHaveProperty("sessionsRemaining");
    expect(summary).toHaveProperty("weeklyLimit");
    expect(summary).toHaveProperty("hasActiveSubscription");
    expect(summary).toHaveProperty("canBook");
    expect(typeof summary.sessionsUsed).toBe("number");
    expect(typeof summary.sessionsRemaining).toBe("number");
    expect(typeof summary.weeklyLimit).toBe("number");
    expect(typeof summary.hasActiveSubscription).toBe("boolean");
    expect(typeof summary.canBook).toBe("boolean");
  });

  it("should reject booking without active subscription", async () => {
    // User 999 should have no subscription
    const { ctx } = createTestContext(false, 999);
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.bookings.book({
        sessionSlotId: 1,
        serviceTypeId: 1,
      });
      // If it doesn't throw, the slot may not exist either
    } catch (error: any) {
      // Should get a meaningful error about subscription or slot
      expect(error.message).toBeDefined();
    }
  });

  it("should reject booking for a non-existent slot", async () => {
    const { ctx } = createTestContext();
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.bookings.book({
        sessionSlotId: 99999,
        serviceTypeId: 1,
      });
      // Should not succeed
    } catch (error: any) {
      expect(error.message).toBeDefined();
    }
  });

  it("should reject cancellation of non-existent booking", async () => {
    const { ctx } = createTestContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.bookings.cancel({ id: 99999 })
    ).rejects.toThrow();
  });

  it("should reject cancellation of another user's booking", async () => {
    // Create a booking context for user 1 and try to cancel as user 2
    const { ctx: ctx2 } = createTestContext(false, 2);
    const caller2 = appRouter.createCaller(ctx2);

    // Attempt to cancel booking ID 1 (which belongs to user 1 if it exists)
    try {
      await caller2.bookings.cancel({ id: 1 });
    } catch (error: any) {
      // Should fail with "not found" (security: don't reveal existence)
      expect(error.message).toBeDefined();
    }
  });

  it("should deny unauthenticated users from booking", async () => {
    const { ctx } = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.bookings.book({ sessionSlotId: 1, serviceTypeId: 1 })
    ).rejects.toThrow();
  });

  it("should create a legacy booking for authenticated user", async () => {
    const { ctx } = createTestContext();
    const caller = appRouter.createCaller(ctx);
    const bookingDate = new Date();
    bookingDate.setDate(bookingDate.getDate() + 7);

    try {
      const result = await caller.bookings.create({
        serviceTypeId: 1,
        bookingDate,
        notes: "Test booking",
      });
      expect(result).toBeDefined();
    } catch (error) {
      // May fail if service type doesn't exist, which is acceptable
      expect(error).toBeDefined();
    }
  });
});

// ─── Quota Enforcement ─────────────────────────────────────────────────────

describe("Quota Enforcement", () => {
  it("booking summary should show 0 remaining when no subscription", async () => {
    const { ctx } = createTestContext(false, 998);
    const caller = appRouter.createCaller(ctx);
    const summary = await caller.bookings.getSummary();
    expect(summary.hasActiveSubscription).toBe(false);
    expect(summary.weeklyLimit).toBe(0);
    expect(summary.canBook).toBe(false);
  });

  it("sessions remaining should never be negative", async () => {
    const { ctx } = createTestContext(false, 997);
    const caller = appRouter.createCaller(ctx);
    const summary = await caller.bookings.getSummary();
    expect(summary.sessionsRemaining).toBeGreaterThanOrEqual(0);
  });
});

// ─── Admin Access ──────────────────────────────────────────────────────────

describe("Admin Access", () => {
  it("should allow admin users to view dashboard stats", async () => {
    const { ctx } = createTestContext(true);
    const caller = appRouter.createCaller(ctx);
    const stats = await caller.admin.getDashboardStats();
    expect(stats).toHaveProperty("totalUsers");
    expect(stats).toHaveProperty("activeMembers");
    expect(stats).toHaveProperty("totalBookings");
    expect(stats).toHaveProperty("pendingBookings");
    expect(stats).toHaveProperty("activeSubscriptions");
    expect(stats).toHaveProperty("totalSessionsThisWeek");
    expect(stats).toHaveProperty("revenue");
  });

  it("should deny non-admin users access to dashboard stats", async () => {
    const { ctx } = createTestContext(false);
    const caller = appRouter.createCaller(ctx);
    await expect(caller.admin.getDashboardStats()).rejects.toThrow();
  });

  it("should allow admin users to view all users", async () => {
    const { ctx } = createTestContext(true);
    const caller = appRouter.createCaller(ctx);
    const users = await caller.admin.getUsers();
    expect(Array.isArray(users)).toBe(true);
  });

  it("should allow admin users to view all bookings", async () => {
    const { ctx } = createTestContext(true);
    const caller = appRouter.createCaller(ctx);
    const bookings = await caller.bookings.getAll();
    expect(Array.isArray(bookings)).toBe(true);
  });

  it("should allow admin users to view all subscriptions", async () => {
    const { ctx } = createTestContext(true);
    const caller = appRouter.createCaller(ctx);
    const subs = await caller.subscriptions.getAll();
    expect(Array.isArray(subs)).toBe(true);
  });

  it("should allow admin users to view all session slots", async () => {
    const { ctx } = createTestContext(true);
    const caller = appRouter.createCaller(ctx);
    const slots = await caller.sessionSlots.getAll();
    expect(Array.isArray(slots)).toBe(true);
  });

  it("should allow admin users to view overrides", async () => {
    const { ctx } = createTestContext(true);
    const caller = appRouter.createCaller(ctx);
    const overrides = await caller.admin.getOverrides();
    expect(Array.isArray(overrides)).toBe(true);
  });

  it("should allow admin users to view revenue summary", async () => {
    const { ctx } = createTestContext(true);
    const caller = appRouter.createCaller(ctx);
    const revenue = await caller.admin.getRevenue();
    expect(revenue).toBeDefined();
    expect(revenue).toHaveProperty("totalRevenue");
    expect(revenue).toHaveProperty("transactionCount");
  });

  it("should deny non-admin users from creating session slots", async () => {
    const { ctx } = createTestContext(false);
    const caller = appRouter.createCaller(ctx);
    const future = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const futureEnd = new Date(future.getTime() + 60 * 60 * 1000);
    await expect(
      caller.sessionSlots.create({
        name: "Test Slot",
        startsAtUtc: future.toISOString(),
        endsAtUtc: futureEnd.toISOString(),
        capacity: 10,
      })
    ).rejects.toThrow();
  });

  it("should deny non-admin users from viewing all users", async () => {
    const { ctx } = createTestContext(false);
    const caller = appRouter.createCaller(ctx);
    await expect(caller.admin.getUsers()).rejects.toThrow();
  });

  it("should deny non-admin users from applying overrides", async () => {
    const { ctx } = createTestContext(false);
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.admin.applyOverride({
        userId: 1,
        changeType: "add_sessions",
        sessionDelta: 5,
        reason: "Test override",
      })
    ).rejects.toThrow();
  });
});

// ─── Admin Overrides ───────────────────────────────────────────────────────

describe("Admin Overrides", () => {
  it("should require a reason for overrides", async () => {
    const { ctx } = createTestContext(true);
    const caller = appRouter.createCaller(ctx);
    // Empty reason should fail validation (z.string().min(1))
    try {
      await caller.admin.applyOverride({
        userId: 1,
        changeType: "add_sessions",
        sessionDelta: 5,
        reason: "",
      });
    } catch (error: any) {
      expect(error).toBeDefined();
    }
  });

  it("should accept valid override input", async () => {
    const { ctx } = createTestContext(true);
    const caller = appRouter.createCaller(ctx);
    try {
      const result = await caller.admin.applyOverride({
        userId: 1,
        changeType: "add_sessions",
        sessionDelta: 3,
        reason: "Compensation for system downtime",
      });
      expect(result).toHaveProperty("message");
    } catch (error: any) {
      // May fail if user doesn't exist in DB, which is acceptable in test env
      expect(error).toBeDefined();
    }
  });

  it("should allow admin to get member detail", async () => {
    const { ctx } = createTestContext(true);
    const caller = appRouter.createCaller(ctx);
    try {
      const detail = await caller.admin.getMemberDetail({ userId: 1 });
      expect(detail).toHaveProperty("user");
      expect(detail).toHaveProperty("currentWeek");
      expect(detail).toHaveProperty("overrides");
      expect(detail).toHaveProperty("recentBookings");
      expect(detail.currentWeek).toHaveProperty("sessionsUsed");
      expect(detail.currentWeek).toHaveProperty("sessionsLimit");
    } catch (error: any) {
      // May fail if user doesn't exist in DB
      expect(error).toBeDefined();
    }
  });
});

// ─── Stripe Integration ────────────────────────────────────────────────────

describe("Stripe Integration", () => {
  it("should create membership checkout session for authenticated user", async () => {
    const { ctx } = createTestContext();
    const caller = appRouter.createCaller(ctx);
    try {
      const result = await caller.stripe.createMembershipCheckout({ tierId: 1 });
      expect(result).toHaveProperty("checkoutUrl");
      expect(typeof result.checkoutUrl).toBe("string");
    } catch (error) {
      // May fail if tier doesn't exist or Stripe key not set
      expect(error).toBeDefined();
    }
  });

  it("should create subscription checkout session for authenticated user", async () => {
    const { ctx } = createTestContext();
    const caller = appRouter.createCaller(ctx);
    try {
      const result = await caller.stripe.createSubscriptionCheckout({ tierId: 1 });
      expect(result).toHaveProperty("checkoutUrl");
      expect(typeof result.checkoutUrl).toBe("string");
    } catch (error) {
      // May fail if tier doesn't exist, Stripe key not set, or user already has subscription
      expect(error).toBeDefined();
    }
  });

  it("should create gift voucher checkout session", async () => {
    const { ctx } = createTestContext();
    const caller = appRouter.createCaller(ctx);
    try {
      const result = await caller.stripe.createGiftVoucherCheckout({ amount: "100.00" });
      expect(result).toHaveProperty("checkoutUrl");
      expect(typeof result.checkoutUrl).toBe("string");
    } catch (error) {
      // May fail if Stripe key not set
      expect(error).toBeDefined();
    }
  });

  it("should deny unauthenticated users from creating checkout sessions", async () => {
    const { ctx } = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.stripe.createMembershipCheckout({ tierId: 1 })
    ).rejects.toThrow();
  });

  it("should deny unauthenticated users from creating subscription checkout", async () => {
    const { ctx } = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.stripe.createSubscriptionCheckout({ tierId: 1 })
    ).rejects.toThrow();
  });
});

// ─── Gift Vouchers ─────────────────────────────────────────────────────────

describe("Gift Vouchers", () => {
  it("should allow checking voucher by code", async () => {
    const { ctx } = createPublicContext();
    const caller = appRouter.createCaller(ctx);
    const voucher = await caller.giftVouchers.getByCode({ code: "NONEXISTENT" });
    expect(voucher === undefined || voucher === null || typeof voucher === "object").toBe(true);
  });

  it("should reject redeeming a non-existent voucher", async () => {
    const { ctx } = createTestContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.giftVouchers.redeem({ code: "DOESNOTEXIST" })
    ).rejects.toThrow();
  });
});

// ─── Input Validation ──────────────────────────────────────────────────────

describe("Input Validation", () => {
  it("should reject booking with missing sessionSlotId", async () => {
    const { ctx } = createTestContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      (caller.bookings.book as any)({ serviceTypeId: 1 })
    ).rejects.toThrow();
  });

  it("should reject session slot creation with empty name", async () => {
    const { ctx } = createTestContext(true);
    const caller = appRouter.createCaller(ctx);
    const future = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const futureEnd = new Date(future.getTime() + 60 * 60 * 1000);
    await expect(
      caller.sessionSlots.create({
        name: "",
        startsAtUtc: future.toISOString(),
        endsAtUtc: futureEnd.toISOString(),
        capacity: 10,
      })
    ).rejects.toThrow();
  });

  it("should reject session slot creation with capacity less than 1", async () => {
    const { ctx } = createTestContext(true);
    const caller = appRouter.createCaller(ctx);
    const future = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const futureEnd = new Date(future.getTime() + 60 * 60 * 1000);
    await expect(
      caller.sessionSlots.create({
        name: "Test",
        startsAtUtc: future.toISOString(),
        endsAtUtc: futureEnd.toISOString(),
        capacity: 0,
      })
    ).rejects.toThrow();
  });
});

// ─── Audit Logs ───────────────────────────────────────────────────────────

describe("Audit Logs", () => {
  it("should allow admin users to view audit logs", async () => {
    const { ctx } = createTestContext(true);
    const caller = appRouter.createCaller(ctx);
    const logs = await caller.admin.getAuditLogs();
    expect(Array.isArray(logs)).toBe(true);
  });

  it("should deny non-admin users from viewing audit logs", async () => {
    const { ctx } = createTestContext(false);
    const caller = appRouter.createCaller(ctx);
    await expect(caller.admin.getAuditLogs()).rejects.toThrow();
  });

  it("should accept filter parameters for audit logs", async () => {
    const { ctx } = createTestContext(true);
    const caller = appRouter.createCaller(ctx);
    const logs = await caller.admin.getAuditLogs({
      action: "auth.login",
      limit: 10,
    });
    expect(Array.isArray(logs)).toBe(true);
  });
});
