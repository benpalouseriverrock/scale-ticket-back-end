-- ============================================================================
-- DATABASE MIGRATION: Add Split Weight Entry Fields
-- ============================================================================
-- This migration adds truck_weight and pup_weight columns to the tickets table
-- to support the split weight entry feature (matching Excel form)
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. Add new columns to tickets table
-- ============================================================================

ALTER TABLE tickets 
  ADD COLUMN IF NOT EXISTS truck_weight DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS pup_weight DECIMAL(10,2);

-- ============================================================================
-- 2. Update existing records (if any exist)
-- ============================================================================
-- For existing tickets, assume gross_weight was all from truck (no pup)

UPDATE tickets 
SET 
  truck_weight = gross_weight,
  pup_weight = 0
WHERE truck_weight IS NULL;

-- ============================================================================
-- 3. Add comments to document the columns
-- ============================================================================

COMMENT ON COLUMN tickets.truck_weight IS 'Weight of truck from scale (user enters)';
COMMENT ON COLUMN tickets.pup_weight IS 'Weight of pup/trailer from scale (user enters)';
COMMENT ON COLUMN tickets.gross_weight IS 'Total gross weight (auto-calculated: truck_weight + pup_weight)';

-- ============================================================================
-- 4. Verification
-- ============================================================================

-- Check that columns were added
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns 
WHERE table_name = 'tickets' 
  AND column_name IN ('truck_weight', 'pup_weight', 'gross_weight')
ORDER BY column_name;

-- Show sample data (if any records exist)
SELECT 
  ticket_number,
  truck_weight,
  pup_weight,
  gross_weight,
  CASE 
    WHEN truck_weight + pup_weight = gross_weight THEN 'VALID'
    ELSE 'MISMATCH'
  END as validation
FROM tickets 
LIMIT 10;

COMMIT;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================
-- Migration complete. The tickets table now has:
-- - truck_weight: User-entered truck weight
-- - pup_weight: User-entered pup/trailer weight  
-- - gross_weight: Auto-calculated sum of truck + pup
-- ============================================================================
