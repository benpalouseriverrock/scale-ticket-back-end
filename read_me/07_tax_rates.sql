-- ============================================================================
-- TAX RATES INSERT STATEMENTS
-- Based on Excel Data sheet tax information
-- ============================================================================

-- Washington State tax rate (default)
INSERT INTO tax_rates (tax_rate_id, state_code, rate_percentage, active) VALUES (1, 'WA', 7.9, TRUE);

-- Idaho tax rate
INSERT INTO tax_rates (tax_rate_id, state_code, rate_percentage, active) VALUES (2, 'ID', 6.0, TRUE);

-- Oregon (no sales tax)
INSERT INTO tax_rates (tax_rate_id, state_code, rate_percentage, active) VALUES (3, 'OR', 0, TRUE);

-- Montana (no sales tax)
INSERT INTO tax_rates (tax_rate_id, state_code, rate_percentage, active) VALUES (4, 'MT', 0, TRUE);

-- ============================================================================
-- Total Records: 4
-- ============================================================================
