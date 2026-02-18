import { drizzle } from 'drizzle-orm/mysql2';
import { membershipTiers, serviceTypes } from './drizzle/schema.js';
import 'dotenv/config';

const db = drizzle(process.env.DATABASE_URL);

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
      'Basic wellness consultation'
    ]),
    isActive: true
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
      'Complimentary towel service'
    ]),
    isActive: true
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
      'Premium locker'
    ]),
    isActive: true
  }
];

const services = [
  {
    name: 'Strength Training Session',
    description: 'One-on-one strength and conditioning session with certified trainer',
    duration: 60,
    price: '75.00',
    isActive: true
  },
  {
    name: 'Therapeutic Massage',
    description: 'Deep tissue massage for muscle recovery and relaxation',
    duration: 90,
    price: '120.00',
    isActive: true
  },
  {
    name: 'Wellness Consultation',
    description: 'Comprehensive wellness assessment and personalized program design',
    duration: 45,
    price: '50.00',
    isActive: true
  },
  {
    name: 'Physiotherapy Session',
    description: 'Injury rehabilitation and movement therapy',
    duration: 60,
    price: '95.00',
    isActive: true
  }
];

try {
  await db.insert(membershipTiers).values(tiers);
  console.log('✓ Membership tiers inserted');
  
  await db.insert(serviceTypes).values(services);
  console.log('✓ Service types inserted');
  
  process.exit(0);
} catch (err) {
  console.error('Error:', err);
  process.exit(1);
}
