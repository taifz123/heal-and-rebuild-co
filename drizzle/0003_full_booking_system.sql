-- Migration: Full booking system with session slots, weekly usage, admin overrides,
--            webhook events, payment transactions, and subscriptions.
-- ─────────────────────────────────────────────────────────────────────────────────

-- 1. Subscriptions table (recurring billing)
CREATE TABLE IF NOT EXISTS `subscriptions` (
  `id` int AUTO_INCREMENT NOT NULL,
  `user_id` int NOT NULL,
  `tier_id` int NOT NULL,
  `payment_provider` varchar(50) NOT NULL DEFAULT 'stripe',
  `provider_subscription_id` varchar(255),
  `provider_customer_id` varchar(255),
  `status` enum('active','past_due','unpaid','cancelled','suspended','pending') NOT NULL DEFAULT 'pending',
  `current_period_start` timestamp,
  `current_period_end` timestamp,
  `suspended_at` timestamp,
  `cancelled_at` timestamp,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `subscriptions_id` PRIMARY KEY(`id`)
);

-- 2. Session slots table (concrete time-boxed classes)
CREATE TABLE IF NOT EXISTS `session_slots` (
  `id` int AUTO_INCREMENT NOT NULL,
  `service_type_id` int,
  `name` varchar(200) NOT NULL,
  `starts_at_utc` timestamp NOT NULL,
  `ends_at_utc` timestamp NOT NULL,
  `capacity` int NOT NULL DEFAULT 10,
  `booked_count` int NOT NULL DEFAULT 0,
  `trainer_name` varchar(200),
  `is_active` boolean NOT NULL DEFAULT true,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `session_slots_id` PRIMARY KEY(`id`)
);

-- 3. Weekly usage table (per-user per-week quota tracking)
CREATE TABLE IF NOT EXISTS `weekly_usage` (
  `id` int AUTO_INCREMENT NOT NULL,
  `user_id` int NOT NULL,
  `week_start_date` date NOT NULL,
  `sessions_used` int NOT NULL DEFAULT 0,
  `sessions_limit_snapshot` int,
  `updated_at` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT `weekly_usage_id` PRIMARY KEY(`id`),
  CONSTRAINT `uq_user_week` UNIQUE(`user_id`, `week_start_date`)
);

-- 4. Admin overrides table (audit trail)
CREATE TABLE IF NOT EXISTS `admin_overrides` (
  `id` int AUTO_INCREMENT NOT NULL,
  `user_id` int NOT NULL,
  `admin_user_id` int NOT NULL,
  `change_type` enum('add_sessions','remove_sessions','suspend','reactivate') NOT NULL,
  `session_delta` int,
  `reason` text NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `admin_overrides_id` PRIMARY KEY(`id`)
);

-- 5. Webhook events table (idempotency)
CREATE TABLE IF NOT EXISTS `webhook_events` (
  `id` int AUTO_INCREMENT NOT NULL,
  `provider` varchar(50) NOT NULL,
  `event_id` varchar(255) NOT NULL,
  `event_type` varchar(100) NOT NULL,
  `status` enum('processing','processed','failed') NOT NULL DEFAULT 'processing',
  `processed_at` timestamp,
  `payload` text,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `webhook_events_id` PRIMARY KEY(`id`),
  CONSTRAINT `uq_provider_event` UNIQUE(`provider`, `event_id`)
);

-- 6. Payment transactions table (normalized payment log)
CREATE TABLE IF NOT EXISTS `payment_transactions` (
  `id` int AUTO_INCREMENT NOT NULL,
  `user_id` int NOT NULL,
  `provider` varchar(50) NOT NULL DEFAULT 'stripe',
  `provider_transaction_id` varchar(255),
  `amount` decimal(10,2) NOT NULL,
  `currency` varchar(10) NOT NULL DEFAULT 'usd',
  `type` enum('membership','booking','gift_voucher','subscription','refund') NOT NULL,
  `status` enum('succeeded','failed','pending','refunded') NOT NULL DEFAULT 'pending',
  `metadata` text,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  CONSTRAINT `payment_transactions_id` PRIMARY KEY(`id`)
);

-- 7. Add new columns to bookings table
ALTER TABLE `bookings`
  ADD COLUMN IF NOT EXISTS `session_slot_id` int AFTER `user_id`,
  ADD COLUMN IF NOT EXISTS `cancelled_at` timestamp AFTER `notes`,
  ADD COLUMN IF NOT EXISTS `cancellation_reason` text AFTER `cancelled_at`;

-- 8. Add stripe_price_id to membership_tiers
ALTER TABLE `membership_tiers`
  ADD COLUMN IF NOT EXISTS `stripe_price_id` varchar(255) AFTER `features`;

-- 9. Add 'weekly' to membership_tiers duration if not present
-- (MySQL enums need ALTER to add values; handled by drizzle push)

-- 10. Update bookings status enum to include no_show
-- (Handled by drizzle push for enum changes)
