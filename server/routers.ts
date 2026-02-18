import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as db from "./db";
import { createMembershipCheckout, createGiftVoucherCheckout, createBookingCheckout } from "./stripe";

// Admin-only procedure
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== 'admin') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Admin access required' });
  }
  return next({ ctx });
});

export const appRouter = router({
  system: systemRouter,
  
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  stripe: router({
    createMembershipCheckout: protectedProcedure
      .input(z.object({
        tierId: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        const tier = await db.getMembershipTierById(input.tierId);
        if (!tier) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Membership tier not found' });
        }

        const origin = ctx.req.headers.origin || `${ctx.req.protocol}://${ctx.req.get('host')}`;
        
        const session = await createMembershipCheckout({
          userId: ctx.user.id,
          userEmail: ctx.user.email || '',
          userName: ctx.user.name,
          tierId: tier.id,
          tierName: tier.name,
          tierPrice: tier.price,
          tierDuration: tier.duration,
          origin,
        });

        return { checkoutUrl: session.url };
      }),

    createGiftVoucherCheckout: protectedProcedure
      .input(z.object({
        amount: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const origin = ctx.req.headers.origin || `${ctx.req.protocol}://${ctx.req.get('host')}`;
        
        const session = await createGiftVoucherCheckout({
          userId: ctx.user.id,
          userEmail: ctx.user.email || '',
          userName: ctx.user.name,
          amount: input.amount,
          origin,
        });

        return { checkoutUrl: session.url };
      }),

    createBookingCheckout: protectedProcedure
      .input(z.object({
        bookingId: z.number(),
        serviceId: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        const service = await db.getServiceTypeById(input.serviceId);
        if (!service) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Service not found' });
        }

        const origin = ctx.req.headers.origin || `${ctx.req.protocol}://${ctx.req.get('host')}`;
        
        const session = await createBookingCheckout({
          userId: ctx.user.id,
          userEmail: ctx.user.email || '',
          userName: ctx.user.name,
          bookingId: input.bookingId,
          serviceName: service.name,
          servicePrice: service.price,
          origin,
        });

        return { checkoutUrl: session.url };
      }),
  }),

  membershipTiers: router({
    getAll: publicProcedure.query(async () => {
      return await db.getAllMembershipTiers();
    }),
    
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getMembershipTierById(input.id);
      }),
    
    create: adminProcedure
      .input(z.object({
        name: z.string(),
        description: z.string().optional(),
        duration: z.enum(["monthly", "quarterly", "annual"]),
        price: z.string(),
        sessionsPerWeek: z.number(),
        features: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        return await db.createMembershipTier(input);
      }),
  }),

  memberships: router({
    getMy: protectedProcedure.query(async ({ ctx }) => {
      return await db.getUserMemberships(ctx.user.id);
    }),
    
    getActive: protectedProcedure.query(async ({ ctx }) => {
      return await db.getActiveMembership(ctx.user.id);
    }),
    
    create: protectedProcedure
      .input(z.object({
        tierId: z.number(),
        startDate: z.date(),
        endDate: z.date(),
        stripeSubscriptionId: z.string().optional(),
        stripeCustomerId: z.string().optional(),
      }))
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
      .input(z.object({
        id: z.number(),
        status: z.enum(["active", "expired", "cancelled", "pending"]).optional(),
        sessionsUsed: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...updates } = input;
        await db.updateMembership(id, updates);
        return { success: true };
      }),
  }),

  serviceTypes: router({
    getAll: publicProcedure.query(async () => {
      return await db.getAllServiceTypes();
    }),
    
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getServiceTypeById(input.id);
      }),
    
    create: adminProcedure
      .input(z.object({
        name: z.string(),
        description: z.string().optional(),
        duration: z.number(),
        price: z.string(),
      }))
      .mutation(async ({ input }) => {
        return await db.createServiceType(input);
      }),
  }),

  bookings: router({
    getMy: protectedProcedure.query(async ({ ctx }) => {
      return await db.getUserBookings(ctx.user.id);
    }),
    
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getBookingById(input.id);
      }),
    
    create: protectedProcedure
      .input(z.object({
        serviceTypeId: z.number(),
        bookingDate: z.date(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return await db.createBooking({
          userId: ctx.user.id,
          ...input,
          status: "pending",
        });
      }),
    
    cancel: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const booking = await db.getBookingById(input.id);
        if (!booking || booking.userId !== ctx.user.id) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Booking not found' });
        }
        await db.updateBooking(input.id, { status: "cancelled" });
        return { success: true };
      }),
    
    getAll: adminProcedure.query(async () => {
      return await db.getAllBookings();
    }),
    
    updateStatus: adminProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["pending", "confirmed", "cancelled", "completed"]),
      }))
      .mutation(async ({ input }) => {
        await db.updateBooking(input.id, { status: input.status });
        return { success: true };
      }),
  }),

  giftVouchers: router({
    getByCode: publicProcedure
      .input(z.object({ code: z.string() }))
      .query(async ({ input }) => {
        return await db.getGiftVoucherByCode(input.code);
      }),
    
    create: protectedProcedure
      .input(z.object({
        code: z.string(),
        amount: z.string(),
        expiryDate: z.date(),
        stripePaymentIntentId: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        return await db.createGiftVoucher({
          ...input,
          purchasedBy: ctx.user.id,
          status: "active",
        });
      }),
    
    redeem: protectedProcedure
      .input(z.object({ code: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const voucher = await db.getGiftVoucherByCode(input.code);
        if (!voucher) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Voucher not found' });
        }
        if (voucher.status !== 'active') {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Voucher already redeemed or expired' });
        }
        if (new Date() > voucher.expiryDate) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Voucher has expired' });
        }
        
        await db.updateGiftVoucher(voucher.id, {
          status: "redeemed",
          redeemedBy: ctx.user.id,
        });
        
        return { success: true, amount: voucher.amount };
      }),
  }),

  admin: router({
    getUsers: adminProcedure.query(async () => {
      return await db.getAllUsers();
    }),
    
    getDashboardStats: adminProcedure.query(async () => {
      const users = await db.getAllUsers();
      const memberships = await db.getAllMemberships();
      const bookings = await db.getAllBookings();
      
      const activeMembers = memberships.filter(m => m.status === 'active').length;
      const totalBookings = bookings.length;
      const pendingBookings = bookings.filter(b => b.status === 'pending').length;
      
      return {
        totalUsers: users.length,
        activeMembers,
        totalBookings,
        pendingBookings,
      };
    }),
  }),
});

export type AppRouter = typeof appRouter;
