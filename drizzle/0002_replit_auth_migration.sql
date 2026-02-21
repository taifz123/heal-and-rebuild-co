-- Migration: Switch from Manus OAuth (openId) to standard email/password auth
-- ─────────────────────────────────────────────────────────────────────────────
-- This migration modifies the `users` table to remove Manus-specific columns
-- (openId, loginMethod) and add a password_hash column for bcrypt passwords.
--
-- Run this migration AFTER deploying the updated application code.
-- ─────────────────────────────────────────────────────────────────────────────

-- Step 1: Add password_hash column for bcrypt-hashed passwords
ALTER TABLE `users`
  ADD COLUMN `password_hash` varchar(255) NULL AFTER `email`;

-- Step 2: Make email NOT NULL (it is now the primary identifier)
ALTER TABLE `users`
  MODIFY COLUMN `email` varchar(320) NOT NULL;

-- Step 3: Add UNIQUE constraint on email (if not already present)
ALTER TABLE `users`
  ADD CONSTRAINT `users_email_unique` UNIQUE (`email`);

-- Step 4: Drop the Manus-specific unique constraint on openId
ALTER TABLE `users`
  DROP INDEX `users_openId_unique`;

-- Step 5: Drop the Manus-specific columns
ALTER TABLE `users`
  DROP COLUMN `openId`,
  DROP COLUMN `loginMethod`;
