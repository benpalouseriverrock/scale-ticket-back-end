-- ============================================================================
-- SCALE TICKET SYSTEM - COMPLETE DATA IMPORT
-- Master SQL Script - Run this file to import ALL Excel data
-- ============================================================================
-- 
-- Extracted from: ScaleTicket2023__1_.xlsm
-- Date: 2026-02-12
-- 
-- This script imports all master data in the correct order:
--   1. Suppliers (4 records)
--   2. Tax Rates (4 records)
--   3. Products (21 records)
--   4. Trucks (16 records)
--   5. Trailers (10 records)
--   6. Delivery Rates (26 records)
--   7. Customers (1,806 records)
-- 
-- TOTAL: 1,887 records
-- 
-- ============================================================================

-- Disable triggers and constraints temporarily for faster import
SET session_replication_role = 'replica';

-- ============================================================================
-- CLEANUP (Optional - uncomment to delete existing data)
-- ============================================================================
-- TRUNCATE TABLE tickets CASCADE;
-- TRUNCATE TABLE customers CASCADE;
-- TRUNCATE TABLE products CASCADE;
-- TRUNCATE TABLE trucks CASCADE;
-- TRUNCATE TABLE trailers CASCADE;
-- TRUNCATE TABLE delivery_rates CASCADE;
-- TRUNCATE TABLE suppliers CASCADE;
-- TRUNCATE TABLE tax_rates CASCADE;

-- Reset sequences
-- ALTER SEQUENCE customers_customer_id_seq RESTART WITH 1;
-- ALTER SEQUENCE products_product_id_seq RESTART WITH 1;
-- ALTER SEQUENCE trucks_truck_id_seq RESTART WITH 1;
-- ALTER SEQUENCE trailers_trailer_id_seq RESTART WITH 1;
-- ALTER SEQUENCE delivery_rates_delivery_rate_id_seq RESTART WITH 1;
-- ALTER SEQUENCE suppliers_supplier_id_seq RESTART WITH 1;
-- ALTER SEQUENCE tax_rates_tax_rate_id_seq RESTART WITH 1;

-- ============================================================================
-- 1. SUPPLIERS (Must be first - Products depend on it)
-- ============================================================================
\echo '============================================'
\echo 'Importing Suppliers...'
\echo '============================================'
\i 02_suppliers.sql

-- ============================================================================
-- 2. TAX RATES (Must be before Customers)
-- ============================================================================
\echo '============================================'
\echo 'Importing Tax Rates...'
\echo '============================================'
\i 07_tax_rates.sql

-- ============================================================================
-- 3. PRODUCTS (Depends on Suppliers)
-- ============================================================================
\echo '============================================'
\echo 'Importing Products...'
\echo '============================================'
\i 03_products.sql

-- ============================================================================
-- 4. TRUCKS
-- ============================================================================
\echo '============================================'
\echo 'Importing Trucks...'
\echo '============================================'
\i 04_trucks.sql

-- ============================================================================
-- 5. TRAILERS
-- ============================================================================
\echo '============================================'
\echo 'Importing Trailers...'
\echo '============================================'
\i 05_trailers.sql

-- ============================================================================
-- 6. DELIVERY RATES
-- ============================================================================
\echo '============================================'
\echo 'Importing Delivery Rates...'
\echo '============================================'
\i 06_delivery_rates.sql

-- ============================================================================
-- 7. CUSTOMERS (Last - Large dataset)
-- ============================================================================
\echo '============================================'
\echo 'Importing Customers (this may take a moment)...'
\echo '============================================'
\i 01_customers.sql

-- Re-enable triggers and constraints
SET session_replication_role = 'origin';

-- Update sequences to current max values
SELECT setval('suppliers_supplier_id_seq', (SELECT MAX(supplier_id) FROM suppliers));
SELECT setval('tax_rates_tax_rate_id_seq', (SELECT MAX(tax_rate_id) FROM tax_rates));
SELECT setval('products_product_id_seq', (SELECT MAX(product_id) FROM products));
SELECT setval('trucks_truck_id_seq', (SELECT MAX(truck_id) FROM trucks));
SELECT setval('trailers_trailer_id_seq', (SELECT MAX(trailer_id) FROM trailers));
SELECT setval('delivery_rates_delivery_rate_id_seq', (SELECT MAX(delivery_rate_id) FROM delivery_rates));
SELECT setval('customers_customer_id_seq', (SELECT MAX(customer_id) FROM customers));

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
\echo ''
\echo '============================================'
\echo 'IMPORT COMPLETE - Verification:'
\echo '============================================'

SELECT 'Suppliers' as table_name, COUNT(*) as record_count FROM suppliers
UNION ALL
SELECT 'Tax Rates', COUNT(*) FROM tax_rates
UNION ALL
SELECT 'Products', COUNT(*) FROM products
UNION ALL
SELECT 'Trucks', COUNT(*) FROM trucks
UNION ALL
SELECT 'Trailers', COUNT(*) FROM trailers
UNION ALL
SELECT 'Delivery Rates', COUNT(*) FROM delivery_rates
UNION ALL
SELECT 'Customers', COUNT(*) FROM customers
ORDER BY record_count DESC;

\echo ''
\echo '============================================'
\echo 'Sample Data Verification:'
\echo '============================================'

\echo ''
\echo 'First 5 Customers:'
SELECT customer_id, name, customer_city, customer_state FROM customers ORDER BY customer_id LIMIT 5;

\echo ''
\echo 'All Products:'
SELECT product_id, product_name, price_per_ton, supplier_id FROM products ORDER BY product_id;

\echo ''
\echo 'All Trucks:'
SELECT truck_id, unit_number, tare_weight FROM trucks ORDER BY truck_id;

\echo ''
\echo 'All Trailers:'
SELECT trailer_id, unit_number, tare_weight FROM trailers ORDER BY trailer_id;

\echo ''
\echo 'Delivery Rates by Location:'
SELECT input_value, flat_rate, rate_per_ton FROM delivery_rates WHERE method = 'location' ORDER BY input_value;

\echo ''
\echo '============================================'
\echo 'DATA IMPORT SUCCESSFUL!'
\echo '============================================'
