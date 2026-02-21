/**
 * Comprehensive seed data script for Heal & Rebuild Co.
 *
 * Seeds:
 * 1. Membership tiers (3 tiers)
 * 2. Service types (4 services)
 * 3. Test users (admin + regular users)
 * 4. Session slots (next 2 weeks of sessions)
 * 5. Auth accounts for test users
 *
 * Usage: node seed-data.mjs
 *
 * NOTE: Run AFTER db:push to ensure tables exist.
 *       Uses INSERT IGNORE to be idempotent (safe to re-run).
 */
import { drizzle } from 'drizzle-orm/mysql2';
import {
  membershipTiers,
  serviceTypes,
  users,
  sessionSlots,
  authAccounts,
} from './drizzle/schema.js';
import { sql } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import 'dotenv/config';

const db = drizzle(process.env.DATABASE_URL);

// ─── 1. Membership Tiers ────────────────────────────────────────────────────

const tiers = [
  {
    name: 'Essential',
    description: 'Perfect for those starting their wellness journey',
    duration: 'monthly',
    price: '99.00',
    sessionsPerWeek: 2,
    features: JSON.stringify([
      'Access to all gym equipment',
      '2 sessions per week',
      'Locker room access',
      'Basic wellness consultation',
    ]),
    isActive: true,
  },
  {
    name: 'Premium',
    description: 'For dedicated wellness enthusiasts',
    duration: 'quarterly',
    price: '249.00',
    sessionsPerWeek: 4,
    features: JSON.stringify([
      'Unlimited gym access',
      '4 sessions per week',
      'Priority booking',
      'Monthly wellness assessment',
      'Access to therapy services',
      'Complimentary towel service',
    ]),
    isActive: true,
  },
  {
    name: 'Elite',
    description: 'Complete wellness transformation',
    duration: 'annual',
    price: '899.00',
    sessionsPerWeek: 7,
    features: JSON.stringify([
      'Unlimited access to all facilities',
      'Daily sessions available',
      'Personal wellness coach',
      'Quarterly health assessments',
      'Priority therapy bookings',
      'Exclusive wellness events',
      'Guest passes (2 per month)',
      'Premium locker',
    ]),
    isActive: true,
  },
];

// ─── 2. Service Types ───────────────────────────────────────────────────────

const services = [
  {
    name: 'Strength Training Session',
    description: 'One-on-one strength and conditioning session with certified trainer',
    duration: 60,
    price: '75.00',
    isActive: true,
  },
  {
    name: 'Therapeutic Massage',
    description: 'Deep tissue massage for muscle recovery and relaxation',
    duration: 90,
    price: '120.00',
    isActive: true,
  },
  {
    name: 'Wellness Consultation',
    description: 'Comprehensive wellness assessment and personalized program design',
    duration: 45,
    price: '50.00',
    isActive: true,
  },
  {
    name: 'Physiotherapy Session',
    description: 'Injury rehabilitation and movement therapy',
    duration: 60,
    price: '95.00',
    isActive: true,
  },
];

// ─── 3. Test Users ──────────────────────────────────────────────────────────

const testPassword = await bcrypt.hash('password123', 12);

const testUsers = [
  {
    name: 'Admin User',
    email: 'admin@healandrebuild.co',
    passwordHash: testPassword,
    role: 'admin',
    status: 'active',
  },
  {
    name: 'Jane Smith',
    email: 'jane@example.com',
    passwordHash: testPassword,
    role: 'user',
    status: 'active',
  },
  {
    name: 'John Doe',
    email: 'john@example.com',
    passwordHash: testPassword,
    role: 'user',
    status: 'active',
  },
  {
    name: 'Sarah Wilson',
    email: 'sarah@example.com',
    passwordHash: testPassword,
    role: 'user',
    status: 'active',
  },
  {
    name: 'Mike Chen',
    email: 'mike@example.com',
    passwordHash: testPassword,
    role: 'user',
    status: 'active',
  },
];

// ─── 4. Session Slots (next 2 weeks) ───────────────────────────────────────

function generateSessionSlots() {
  const slots = [];
  const now = new Date();
  const trainers = ['Coach Alex', 'Coach Maria', 'Coach James', 'Coach Priya'];
  const sessionTypes = [
    { name: 'Morning HIIT', hour: 6, duration: 60, capacity: 12 },
    { name: 'Strength & Conditioning', hour: 8, duration: 75, capacity: 8 },
    { name: 'Yoga Flow', hour: 10, duration: 60, capacity: 15 },
    { name: 'Lunchtime Express', hour: 12, duration: 45, capacity: 10 },
    { name: 'Afternoon Pump', hour: 15, duration: 60, capacity: 10 },
    { name: 'Evening Circuit', hour: 17, duration: 60, capacity: 12 },
    { name: 'Late Night Stretch', hour: 19, duration: 45, capacity: 8 },
  ];

  for (let dayOffset = 0; dayOffset < 14; dayOffset++) {
    const date = new Date(now);
    date.setDate(date.getDate() + dayOffset);
    const dayOfWeek = date.getDay();

    // Skip Sunday (0)
    if (dayOfWeek === 0) continue;

    // Fewer sessions on Saturday
    const daySessions = dayOfWeek === 6
      ? sessionTypes.slice(0, 4)
      : sessionTypes;

    for (const session of daySessions) {
      const start = new Date(date);
      start.setHours(session.hour, 0, 0, 0);

      const end = new Date(start);
      end.setMinutes(end.getMinutes() + session.duration);

      const trainer = trainers[(dayOffset + session.hour) % trainers.length];

      slots.push({
        name: session.name,
        startsAtUtc: start,
        endsAtUtc: end,
        capacity: session.capacity,
        bookedCount: 0,
        trainerName: trainer,
        isActive: true,
      });
    }
  }

  return slots;
}

// ─── Execute Seed ───────────────────────────────────────────────────────────

async function seed() {
  console.log('🌱 Seeding database...\n');

  // 1. Membership Tiers
  try {
    // Use raw SQL for INSERT IGNORE
    for (const tier of tiers) {
      await db.execute(sql`
        INSERT IGNORE INTO membership_tiers (name, description, duration, price, sessions_per_week, features, is_active)
        VALUES (${tier.name}, ${tier.description}, ${tier.duration}, ${tier.price}, ${tier.sessionsPerWeek}, ${tier.features}, ${tier.isActive})
      `);
    }
    console.log('✓ Membership tiers seeded (3 tiers)');
  } catch (err) {
    console.log('⚠ Membership tiers:', err.message);
  }

  // 2. Service Types
  try {
    for (const svc of services) {
      await db.execute(sql`
        INSERT IGNORE INTO service_types (name, description, duration, price, is_active)
        VALUES (${svc.name}, ${svc.description}, ${svc.duration}, ${svc.price}, ${svc.isActive})
      `);
    }
    console.log('✓ Service types seeded (4 types)');
  } catch (err) {
    console.log('⚠ Service types:', err.message);
  }

  // 3. Test Users
  try {
    for (const u of testUsers) {
      await db.execute(sql`
        INSERT IGNORE INTO users (name, email, password_hash, role, user_status)
        VALUES (${u.name}, ${u.email}, ${u.passwordHash}, ${u.role}, ${u.status})
      `);
    }
    console.log(`✓ Test users seeded (${testUsers.length} users)`);
    console.log('  Admin: admin@healandrebuild.co / password123');
    console.log('  Users: jane@example.com, john@example.com, sarah@example.com, mike@example.com / password123');
  } catch (err) {
    console.log('⚠ Test users:', err.message);
  }

  // 4. Session Slots
  try {
    const slots = generateSessionSlots();
    for (const slot of slots) {
      await db.execute(sql`
        INSERT IGNORE INTO session_slots (name, starts_at_utc, ends_at_utc, capacity, booked_count, trainer_name, is_active)
        VALUES (${slot.name}, ${slot.startsAtUtc}, ${slot.endsAtUtc}, ${slot.capacity}, ${slot.bookedCount}, ${slot.trainerName}, ${slot.isActive})
      `);
    }
    console.log(`✓ Session slots seeded (${slots.length} slots over 2 weeks)`);
  } catch (err) {
    console.log('⚠ Session slots:', err.message);
  }

  console.log('\n✅ Seed complete!');
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
