-- Migration 09: Add per_ton and per_load delivery methods
-- Run once against the scale_tickets database.
-- These new methods allow explicit $/ton and flat $/load pricing
-- without requiring a delivery_rates table lookup.

ALTER TYPE delivery_method_enum ADD VALUE IF NOT EXISTS 'per_ton';
ALTER TYPE delivery_method_enum ADD VALUE IF NOT EXISTS 'per_load';
