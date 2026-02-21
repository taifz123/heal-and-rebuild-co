import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, adminProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as db from "./db";
import {
  createMembershipCheckout,
  createGiftVoucherCheckout,
  createBookingCheckout,
  createStripeSubscriptionSession,
} from "./stripe";
import {
  createBookingWithQuota,
  cancelBookingWithQuota,
  getUserBookingSummary,
} from "./services/bookingService";
import {
  applyAdminOverride,
  getDashboardStats,
  getMemberDetail,
} from "./services/adminService";

export const appRouter = router({
  system: systemRouter,

  // ─── Auth ─────────────────────────────────────────────────────────────────
  auth: router({
    me: publicProcedure.query((opts) => {
      if (!opts.ctx.user) return null;
      const { id, name, email, role } = opts.ctx.user;
      return { id, name, email, role };
    }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ─── Stripe Checkout ──────────────────────────────────────────────────────
  stripe: router({
    createMembershipCheckout: protectedProcedure
      .input(z.object({ tierId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const tier = await db.getMembershipTierById(input.tierId);
        if (!tier) throw new TRPCError({ code: "NOT_FOUND", message: "Membership tier not found" });
        const origin = ctx.req.headers.origin || `${ctx.req.protocol}://${ctx.req.get("host")}`;
        const session = await createMembershipCheckout({
          userId: ctx.user.id,
          userEmail: ctx.user.email || "",
          userName: ctx.user.name,
          tierId: tier.id,
          tierName: tier.name,
          tierPrice: tier.price,
          tierDuration: tier.duration,
          origin,
        });
        return { checkoutUrl: session.url };
      }),

    createSubscriptionCheckout: protectedProcedure
      .input(z.object({ tierId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const tier = await db.getMembershipTierById(input.tierId);
        if (!tier) throw new TRPCError({ code: "NOT_FOUND", message: "Membership tier not found" });
        // Check for existing active subscription
        const existing = await db.getActiveSubscription(ctx.user.id);
        if (existing) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "You already have an active subscription. Cancel it first to switch plans.",
          });
        }
        const session = await createStripeSubscriptionSession(ctx.user, tier);
        return { checkoutUrl: session.url };
      }),

    createGiftVoucherCheckout: protectedProcedure
      .input(z.object({ amount: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const origin = ctx.req.headers.origin || `${ctx.req.protocol}://${ctx.req.get("host")}`;
        const session = await createGiftVoucherCheckout({
          userId: ctx.user.id,
          userEmail: ctx.user.email || "",
          userName: ctx.user.name,
          amount: input.amount,
          origin,
        });
        return { checkoutUrl: session.url };
      }),

    createBookingCheckout: protectedProcedure
      .input(z.object({ bookingId: z.number(), serviceId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const service = await db.getServiceTypeById(input.serviceId);
        if (!service) throw new TRPCError({ code: "NOT_FOUND", message: "Service not found" });
        const origin = ctx.req.headers.origin || `${ctx.req.protocol}://${ctx.req.get("host")}`;
        const session = await createBookingCheckout({
          userId: ctx.user.id,
          userEmail: ctx.user.email || "",
          userName: ctx.user.name,
          bookingId: input.bookingId,
          serviceName: service.name,
          servicePrice: service.price,
          origin,
        });
        return { checkoutUrl: session.url };
      }),
  }),

  // ─── Membership Tiers ─────────────────────────────────────────────────────
  membershipTiers: router({
    getAll: publicProcedure.query(async () => {
      return await db.getAllMembershipTiers();
    }),
    getById: publicProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      return await db.getMembershipTierById(input.id);
    }),
    create: adminProcedure
      .input(
        z.object({
          name: z.string(),
          description: z.string().optional(),
          duration: z.enum(["weekly", "monthly", "quarterly", "annual"]),
          price: z.string(),
          sessionsPerWeek: z.number(),
          features: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        return await db.createMembershipTier(input);
      }),
  }),

  // ─── Memberships (legacy one-time) ────────────────────────────────────────
  memberships: router({
    getMy: protectedProcedure.query(async ({ ctx }) => {
      return await db.getUserMemberships(ctx.user.id);
    }),
    getActive: protectedProcedure.query(async ({ ctx }) => {
      return await db.getActiveMembership(ctx.user.id);
    }),
    create: protectedProcedure
      .input(
        z.object({
          tierId: z.number(),
          startDate: z.date(),
          endDate: z.date(),
          stripeSubscriptionId: z.string().optional(),
          stripeCustomerId: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        return await db.createMembership({
          userId: ctx.user.id,
          ...input,
          status: "active",
          sessionsUsed: 0,
        });
      }),
    getAll: adminProcedure.query(async () => {
      return await db.getAllMemberships();
    }),
    update: adminProcedure
      .input(
        z.object({
          id: z.number(),
          status: z.enum(["active", "expired", "cancelled", "pending"]).optional(),
          sessionsUsed: z.number().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...updates } = input;
        await db.updateMembership(id, updates);
        return { success: true };
      }),
  }),

  // ─── Subscriptions (recurring) ────────────────────────────────────────────
  subscriptions: router({
    getMy: protectedProcedure.query(async ({ ctx }) => {
      return await db.getUserSubscriptions(ctx.user.id);
    }),
    getActive: protectedProcedure.query(async ({ ctx }) => {
      return await db.getActiveSubscription(ctx.user.id);
    }),
    getAll: adminProcedure.query(async () => {
      return await db.getAllSubscriptions();
    }),
  }),

  // ─── Session Slots ────────────────────────────────────────────────────────
  sessionSlots: router({
    getAvailable: publicProcedure
      .input(
        z
          .object({
            from: z.string().optional(),
            to: z.string().optional(),
          })
          .optional()
      )
      .query(async ({ input }) => {
        const now = new Date();
        const from = input?.from ? new Date(input.from) : now;
        const defaultTo = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
        const to = input?.to ? new Date(input.to) : defaultTo;
        return await db.getAvailableSessionSlots(from, to);
      }),
    getAll: adminProcedure
      .input(
        z
          .object({
            from: z.string().optional(),
            to: z.string().optional(),
          })
          .optional()
      )
      .query(async ({ input }) => {
        const from = input?.from ? new Date(input.from) : undefined;
        const to = input?.to ? new Date(input.to) : undefined;
        return await db.getAllSessionSlots(from, to);
      }),
    create: adminProcedure
      .input(
        z.object({
          name: z.string().min(1),
          serviceTypeId: z.number().optional(),
          startsAtUtc: z.string(),
          endsAtUtc: z.string(),
          capacity: z.number().min(1).default(10),
          trainerName: z.string().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const result = await db.createSessionSlot({
          name: input.name,
          serviceTypeId: input.serviceTypeId ?? null,
          startsAtUtc: new Date(input.startsAtUtc),
          endsAtUtc: new Date(input.endsAtUtc),
          capacity: input.capacity,
          trainerName: input.trainerName ?? null,
        });
        return result;
      }),
    update: adminProcedure
      .input(
        z.object({
          id: z.number(),
          name: z.string().optional(),
          capacity: z.number().min(1).optional(),
          trainerName: z.string().optional(),
          isActive: z.boolean().optional(),
        })
      )
      .mutation(async ({ input }) => {
        const { id, ...updates } = input;
        await db.updateSessionSlot(id, updates);
        return { success: true };
      }),
  }),

  // ─── Service Types ────────────────────────────────────────────────────────
  serviceTypes: router({
    getAll: publicProcedure.query(async () => {
      return await db.getAllServiceTypes();
    }),
    getById: publicProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      return await db.getServiceTypeById(input.id);
    }),
    create: adminProcedure
      .input(
        z.object({
          name: z.string(),
          description: z.string().optional(),
          duration: z.number(),
          price: z.string(),
        })
      )
      .mutation(async ({ input }) => {
        return await db.createServiceType(input);
      }),
  }),

  // ─── Bookings (with quota enforcement) ────────────────────────────────────
  bookings: router({
    getMy: protectedProcedure.query(async ({ ctx }) => {
      return await db.getUserBookings(ctx.user.id);
    }),
    getSummary: protectedProcedure.query(async ({ ctx }) => {
      return await getUserBookingSummary(ctx.user.id);
    }),
    getById: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
      return await db.getBookingById(input.id);
    }),
    book: protectedProcedure
      .input(
        z.object({
          sessionSlotId: z.number(),
          serviceTypeId: z.number(),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        const result = await createBookingWithQuota({
          userId: ctx.user.id,
          sessionSlotId: input.sessionSlotId,
          serviceTypeId: input.serviceTypeId,
          notes: input.notes,
        });
        if (!result.success) {
          throw new TRPCError({ code: "BAD_REQUEST", message: result.error });
        }
        return result;
      }),
    cancel: protectedProcedure
      .input(z.object({ id: z.number(), reason: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        const result = await cancelBookingWithQuota(input.id, ctx.user.id, input.reason);
        if (!result.success) {
          throw new TRPCError({ code: "BAD_REQUEST", message: result.error });
        }
        return result;
      }),
    // Legacy create (without slot/quota — kept for backward compat)
    create: protectedProcedure
      .input(
        z.object({
          serviceTypeId: z.number(),
          bookingDate: z.date(),
          notes: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        return await db.createBooking({
          userId: ctx.user.id,
          ...input,
          status: "pending",
        });
      }),
    getAll: adminProcedure.query(async () => {
      return await db.getAllBookings();
    }),
    updateStatus: adminProcedure
      .input(
        z.object({
          id: z.number(),
          status: z.enum(["pending", "confirmed", "cancelled", "completed", "no_show"]),
        })
      )
      .mutation(async ({ input }) => {
        await db.updateBooking(input.id, { status: input.status });
        return { success: true };
      }),
  }),

  // ─── Gift Vouchers ────────────────────────────────────────────────────────
  giftVouchers: router({
    getByCode: publicProcedure.input(z.object({ code: z.string() })).query(async ({ input }) => {
      return await db.getGiftVoucherByCode(input.code);
    }),
    create: protectedProcedure
      .input(
        z.object({
          code: z.string(),
          amount: z.string(),
          expiryDate: z.date(),
          stripePaymentIntentId: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        return await db.createGiftVoucher({
          ...input,
          purchasedBy: ctx.user.id,
          status: "active",
        });
      }),
    redeem: protectedProcedure.input(z.object({ code: z.string() })).mutation(async ({ ctx, input }) => {
      const voucher = await db.getGiftVoucherByCode(input.code);
      if (!voucher) throw new TRPCError({ code: "NOT_FOUND", message: "Voucher not found" });
      if (voucher.status !== "active")
        throw new TRPCError({ code: "BAD_REQUEST", message: "Voucher already redeemed or expired" });
      if (new Date() > voucher.expiryDate)
        throw new TRPCError({ code: "BAD_REQUEST", message: "Voucher has expired" });
      await db.updateGiftVoucher(voucher.id, { status: "redeemed", redeemedBy: ctx.user.id });
      return { success: true, amount: voucher.amount };
    }),
  }),

  // ─── Admin ────────────────────────────────────────────────────────────────
  admin: router({
    getDashboardStats: adminProcedure.query(async () => {
      return await getDashboardStats();
    }),
    getUsers: adminProcedure.query(async () => {
      return await db.getAllUsers();
    }),
    searchUsers: adminProcedure.input(z.object({ query: z.string() })).query(async ({ input }) => {
      return await db.searchUsers(input.query);
    }),
    getMemberDetail: adminProcedure
      .input(z.object({ userId: z.number() }))
      .query(async ({ input }) => {
        return await getMemberDetail(input.userId);
      }),
    applyOverride: adminProcedure
      .input(
        z.object({
          userId: z.number(),
          changeType: z.enum(["add_sessions", "remove_sessions", "suspend", "reactivate"]),
          sessionDelta: z.number().optional(),
          reason: z.string().min(1),
        })
      )
      .mutation(async ({ ctx, input }) => {
        return await applyAdminOverride({
          userId: input.userId,
          adminUserId: ctx.user.id,
          changeType: input.changeType,
          sessionDelta: input.sessionDelta,
          reason: input.reason,
        });
      }),
    getOverrides: adminProcedure
      .input(z.object({ userId: z.number().optional() }).optional())
      .query(async ({ input }) => {
        if (input?.userId) return await db.getAdminOverridesForUser(input.userId);
        return await db.getAllAdminOverrides();
      }),
    getRevenue: adminProcedure
      .input(z.object({ from: z.string().optional(), to: z.string().optional() }).optional())
      .query(async ({ input }) => {
        const from = input?.from ? new Date(input.from) : undefined;
        const to = input?.to ? new Date(input.to) : undefined;
        return await db.getRevenueSummary(from, to);
      }),
    getPaymentTransactions: adminProcedure
      .input(
        z
          .object({
            userId: z.number().optional(),
            from: z.string().optional(),
            to: z.string().optional(),
          })
          .optional()
      )
      .query(async ({ input }) => {
        return await db.getPaymentTransactions({
          userId: input?.userId,
          from: input?.from ? new Date(input.from) : undefined,
          to: input?.to ? new Date(input.to) : undefined,
        });
      }),
  }),
});

export type AppRouter = typeof appRouter;
