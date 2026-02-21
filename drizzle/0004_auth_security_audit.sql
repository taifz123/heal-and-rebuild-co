-- Migration: Add auth_accounts, email_otps, audit_logs tables and user status column
-- This migration adds multi-provider auth, passwordless email OTP, audit logging,
-- and user status (active/suspended) support.

-- 1. Add user_status column to users table
ALTER TABLE `users` ADD COLUMN `user_status` enum('active','suspended') NOT NULL DEFAULT 'active';

-- 2. Create auth_accounts table for multi-provider authentication
CREATE TABLE IF NOT EXISTS `auth_accounts` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `user_id` int NOT NULL,
  `provider` varchar(50) NOT NULL,
  `provider_user_id` varchar(320) NOT NULL,
  `verified` boolean NOT NULL DEFAULT false,
  `created_at` timestamp NOT NULL DEFAULT (now()),
  UNIQUE INDEX `uq_provider_user` (`provider`, `provider_user_id`)
);

-- 3. Create email_otps table for passwordless email login
CREATE TABLE IF NOT EXISTS `email_otps` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `email` varchar(320) NOT NULL,
  `code` varchar(10) NOT NULL,
  `expires_at` timestamp NOT NULL,
  `used` boolean NOT NULL DEFAULT false,
  `attempts` int NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT (now())
);

-- 4. Create audit_logs table for general-purpose audit trail
CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id` int AUTO_INCREMENT PRIMARY KEY,
  `user_id` int,
  `action` varchar(100) NOT NULL,
  `entity_type` varchar(50),
  `entity_id` int,
  `details` text,
  `ip_address` varchar(45),
  `created_at` timestamp NOT NULL DEFAULT (now())
);
