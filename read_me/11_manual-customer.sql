-- Migration 11: Add manual_customer_name to tickets
-- Allows tickets to be created without a customer in the database.
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS manual_customer_name VARCHAR(255);
ALTER TABLE tickets ALTER COLUMN customer_id DROP NOT NULL;
