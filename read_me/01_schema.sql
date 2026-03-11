-- ============================================================================
-- PALOUSE RIVER ROCK - SCALE TICKET SYSTEM
-- ============================================================================
-- DROP EXISTING OBJECTS (if they exist)
-- ============================================================================
DROP TABLE IF EXISTS tickets CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS suppliers CASCADE;
DROP TABLE IF EXISTS trucks CASCADE;
DROP TABLE IF EXISTS trailers CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS tax_rates CASCADE;
DROP TABLE IF EXISTS delivery_rates CASCADE;

-- Drop existing types
DROP TYPE IF EXISTS delivery_method_enum CASCADE;
DROP TYPE IF EXISTS tax_status_enum CASCADE;

-- ============================================================================
-- CREATE ENUM TYPES (PostgreSQL specific)
-- ============================================================================
CREATE TYPE delivery_method_enum AS ENUM ('location', 'mileage');
CREATE TYPE tax_status_enum AS ENUM ('taxable', 'exempt', 'sales_tax');

-- ============================================================================
-- TABLE 1: SUPPLIERS
-- ============================================================================
CREATE TABLE suppliers (
  supplier_id SERIAL PRIMARY KEY,
  supplier_name VARCHAR(255) NOT NULL,
  plant_name VARCHAR(255),
  contact_info TEXT,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- TABLE 2: PRODUCTS
-- ============================================================================
CREATE TABLE products (
  product_id SERIAL PRIMARY KEY,
  product_name VARCHAR(255) NOT NULL,
  supplier_id INT NOT NULL,
  price_per_ton DECIMAL(10,2) NOT NULL,
  material_category VARCHAR(100),
  mix_id VARCHAR(50),
  product_code VARCHAR(50),
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (supplier_id) REFERENCES suppliers(supplier_id)
);

-- Create indexes for products
CREATE INDEX idx_product_name ON products(product_name);
CREATE INDEX idx_product_supplier ON products(supplier_id);
CREATE INDEX idx_product_active ON products(active);

-- ============================================================================
-- TABLE 3: CUSTOMERS
-- ============================================================================
CREATE TABLE customers (
  customer_id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  company VARCHAR(255),
  contact_first VARCHAR(100),
  contact_last VARCHAR(100),
  address_primary VARCHAR(255),
  customer_address VARCHAR(255),
  customer_city VARCHAR(100),
  customer_state VARCHAR(2),
  customer_zipcode VARCHAR(10),
  address_billing_2 VARCHAR(255),
  address_billing_3 VARCHAR(255),
  address_billing_4 VARCHAR(255),
  phone VARCHAR(20),
  email VARCHAR(255),
  tax_status tax_status_enum,
  balance DECIMAL(10,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for customers
CREATE INDEX idx_customer_name ON customers(name);
CREATE INDEX idx_customer_state ON customers(customer_state);

-- ============================================================================
-- TABLE 4: TRUCKS
-- ============================================================================
CREATE TABLE trucks (
  truck_id SERIAL PRIMARY KEY,
  unit_number VARCHAR(50) UNIQUE NOT NULL,
  configuration VARCHAR(100),
  tare_weight DECIMAL(10,2) NOT NULL,
  identification_number VARCHAR(50),
  active BOOLEAN DEFAULT TRUE,
  last_updated TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for trucks
CREATE INDEX idx_truck_unit_number ON trucks(unit_number);
CREATE INDEX idx_truck_active ON trucks(active);

-- ============================================================================
-- TABLE 5: TRAILERS
-- ============================================================================
CREATE TABLE trailers (
  trailer_id SERIAL PRIMARY KEY,
  unit_number VARCHAR(50) UNIQUE NOT NULL,
  configuration VARCHAR(100),
  tare_weight DECIMAL(10,2) NOT NULL,
  active BOOLEAN DEFAULT TRUE,
  last_updated TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for trailers
CREATE INDEX idx_trailer_unit_number ON trailers(unit_number);
CREATE INDEX idx_trailer_active ON trailers(active);

-- ============================================================================
-- TABLE 6: TAX_RATES
-- ============================================================================
CREATE TABLE tax_rates (
  tax_rate_id SERIAL PRIMARY KEY,
  state_code VARCHAR(2) NOT NULL,
  location VARCHAR(100),
  rate_percentage DECIMAL(5,2) NOT NULL,
  description VARCHAR(255),
  active BOOLEAN DEFAULT TRUE
);

-- Create indexes for tax_rates
CREATE INDEX idx_tax_state_location ON tax_rates(state_code, location);

-- ============================================================================
-- TABLE 7: DELIVERY_RATES
-- ============================================================================
CREATE TABLE delivery_rates (
  delivery_rate_id SERIAL PRIMARY KEY,
  method delivery_method_enum NOT NULL,
  input_value VARCHAR(100) NOT NULL,
  rate_per_mile DECIMAL(10,2),
  flat_rate DECIMAL(10,2),
  minimum_charge DECIMAL(10,2),
  active BOOLEAN DEFAULT TRUE
);

-- Create indexes for delivery_rates
CREATE INDEX idx_delivery_method_value ON delivery_rates(method, input_value);

-- ============================================================================
-- TABLE 8: TICKETS (Main Transaction Table - 41 fields)
-- ============================================================================
CREATE TABLE tickets (
  -- Primary & Identifiers
  ticket_id SERIAL PRIMARY KEY,
  ticket_number VARCHAR(50) UNIQUE NOT NULL,
  date_time TIMESTAMP NOT NULL,
  
  -- Customer & Product References
  customer_id INT NOT NULL,
  product_id INT NOT NULL,
  truck_id INT NOT NULL,
  trailer_id INT,
  
  -- Core Ticket Fields (20 fields)
  job_name VARCHAR(255),
  delivered_by VARCHAR(100),
  delivery_unit VARCHAR(100),
  delivery_location VARCHAR(255),
  
  -- Weight Fields (single gross entry + calculated fields)
  gross_weight DECIMAL(10,2) NOT NULL,
  tare_weight DECIMAL(10,2) NOT NULL,
  net_weight DECIMAL(10,2) NOT NULL,
  net_tons DECIMAL(10,2) NOT NULL,
  
  -- Delivery Charge Fields
  delivery_charge DECIMAL(10,2) DEFAULT 0,
  delivery_method delivery_method_enum,
  delivery_input_value VARCHAR(100),
  
  -- Financial Fields (5 fields)
  subtotal DECIMAL(10,2),
  tax_rate DECIMAL(5,2),
  tax_amount DECIMAL(10,2),
  cc_fee DECIMAL(10,2),
  total DECIMAL(10,2),
  
  -- Invoice/Print Status
  is_invoice BOOLEAN DEFAULT FALSE,
  is_printed BOOLEAN DEFAULT FALSE,
  
  -- WSDOT/HaulHub Fields (16 fields)
  is_wsdot_ticket BOOLEAN DEFAULT FALSE,
  dot_code VARCHAR(50),
  contract_number VARCHAR(50),
  job_number VARCHAR(50),
  mix_id VARCHAR(50),
  phase_code VARCHAR(50),
  phase_description VARCHAR(255),
  dispatch_number VARCHAR(50),
  purchase_order_number VARCHAR(50),
  weighmaster VARCHAR(100),
  loads_today INT,
  quantity_shipped_today DECIMAL(10,2),
  
  -- HaulHub Integration Fields
  haulhub_pushed_at TIMESTAMP,
  haulhub_response TEXT,
  haulhub_status_code INT,
  comments TEXT,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Foreign Keys
  FOREIGN KEY (customer_id) REFERENCES customers(customer_id),
  FOREIGN KEY (product_id) REFERENCES products(product_id),
  FOREIGN KEY (truck_id) REFERENCES trucks(truck_id),
  FOREIGN KEY (trailer_id) REFERENCES trailers(trailer_id)
);

-- Create indexes for tickets
CREATE INDEX idx_ticket_number ON tickets(ticket_number);
CREATE INDEX idx_ticket_date_time ON tickets(date_time);
CREATE INDEX idx_ticket_customer ON tickets(customer_id);
CREATE INDEX idx_ticket_wsdot ON tickets(is_wsdot_ticket, haulhub_pushed_at);

-- ============================================================================
-- SEED DATA
-- ============================================================================

-- Suppliers
INSERT INTO suppliers (supplier_name, plant_name) VALUES
('Seubert', 'Seubert Plant'),
('Palouse River Rock', 'PRR Main'),
('Wilbur Ellis', 'WE Distribution');

-- Products (with supplier references)
INSERT INTO products (product_name, supplier_id, price_per_ton, material_category, mix_id, product_code) VALUES
('5/8"', 1, 5.50, 'Aggregate', 'MIX-001', 'P001'),
('3/4"', 1, 6.00, 'Aggregate', 'MIX-002', 'P002'),
('1-1/4"', 1, 7.50, 'Aggregate', 'MIX-003', 'P003'),
('3"', 1, 8.00, 'Aggregate', 'MIX-004', 'P004'),
('Pit Run', 2, 4.50, 'Aggregate', 'MIX-005', 'P005'),
('NQR', 2, 9.00, 'Aggregate', 'MIX-006', 'P006'),
('Chip Seal Rock', 2, 12.00, 'Aggregate', 'MIX-007', 'P007'),
('Drain 3/4"', 1, 10.50, 'Aggregate', 'MIX-008', 'P008'),
('Ballast 2"', 3, 20.00, 'Aggregate', 'MIX-009', 'P009');

-- Customers
INSERT INTO customers (name, company, address_primary, customer_city, customer_state, customer_zipcode, tax_status) VALUES
('Palouse River Rock', 'PRR Operations', '123 Main St', 'Moscow', 'WA', '99847', 'taxable'),
('WSDOT Contractor', 'DOT Projects', '456 State Ave', 'Olympia', 'WA', '98501', 'exempt'),
('General Contractor', 'BuildCo', '789 Oak Ln', 'Spokane', 'WA', '99201', 'taxable'),
('Idaho Gravel Works', 'IGW LLC', '321 Pine Rd', 'Boise', 'ID', '83702', 'taxable'),
('Oregon Paving Co', 'OPC Inc', '555 Cedar Blvd', 'Portland', 'OR', '97201', 'taxable');

-- Trucks
INSERT INTO trucks (unit_number, configuration, tare_weight, identification_number, active) VALUES
('4', '4-Dump', 30240, 'TRUCK-001', TRUE),
('6', '6-Dump', 35000, 'TRUCK-002', TRUE),
('7', '7-Dump', 38500, 'TRUCK-003', TRUE),
('8', '8-Dump', 42000, 'TRUCK-004', TRUE),
('13Gold', '13 KW Gold W/Side D', 45000, 'TRUCK-005', TRUE),
('6w/Tilt', '6 W/Tilt', 36000, 'TRUCK-006', TRUE),
('8w/Tilt', '8 W/Tilt', 40000, 'TRUCK-007', TRUE),
('8/Tilt+305', '8/Tilt+305', 52580, 'TRUCK-008', TRUE);

-- Trailers
INSERT INTO trailers (unit_number, configuration, tare_weight, active) VALUES
('None', 'No Trailer', 0, TRUE),
('4P', '4-Axle Pup', 8000, TRUE),
('6P', '6-Axle Pup', 10000, TRUE),
('7P', '7-Axle Pup', 11000, TRUE),
('13P', '13-Axle Pup', 12000, TRUE),
('2B', '2-Axle Belly', 6500, TRUE),
('3B', '3-Axle Belly', 8500, TRUE),
('32Dump', '32 Dump', 14760, TRUE),
('Tilt-30', '30 Tilt', 9000, TRUE),
('48Lowboy', '48 Lowboy', 10000, TRUE);

-- Tax Rates
INSERT INTO tax_rates (state_code, location, rate_percentage, description) VALUES
('WA', 'Washington', 8.5, 'Washington State Tax'),
('ID', 'Idaho', 5.0, 'Idaho State Tax'),
('OR', 'Oregon', 0.0, 'Oregon No Sales Tax');

-- Delivery Rates (Location-based)
INSERT INTO delivery_rates (method, input_value, flat_rate, minimum_charge) VALUES
('location', 'Albion', 6.50, 20.00),
('location', 'Almota', 8.00, 25.00),
('location', 'Colfax', 10.00, 30.00),
('location', 'Diamond', 12.00, 35.00),
('location', 'Dusty', 9.50, 28.00),
('location', 'Endicott', 7.50, 22.00),
('location', 'Farmington', 11.00, 32.00),
('location', 'Garfield', 13.50, 40.00),
('location', 'Lacrosse', 14.00, 42.00),
('location', 'Lancaster', 15.00, 45.00),
('location', 'Winona', 16.00, 48.00);

-- Delivery Rates (Mileage-based)
INSERT INTO delivery_rates (method, input_value, rate_per_mile, minimum_charge) VALUES
('mileage', '0-5', 2.00, 15.00),
('mileage', '5-10', 2.50, 20.00),
('mileage', '10-15', 3.00, 25.00),
('mileage', '15-20', 3.50, 30.00),
('mileage', '20+', 4.00, 40.00);

-- ============================================================================
-- VERIFICATION QUERIES (Run after creation)
-- ============================================================================

-- SELECT 'Suppliers' as table_name, COUNT(*) as count FROM suppliers
-- UNION ALL
-- SELECT 'Products', COUNT(*) FROM products
-- UNION ALL
-- SELECT 'Customers', COUNT(*) FROM customers
-- UNION ALL
-- SELECT 'Trucks', COUNT(*) FROM trucks
-- UNION ALL
-- SELECT 'Trailers', COUNT(*) FROM trailers
-- UNION ALL
-- SELECT 'Tax Rates', COUNT(*) FROM tax_rates
-- UNION ALL
-- SELECT 'Delivery Rates', COUNT(*) FROM delivery_rates
-- UNION ALL
-- SELECT 'Tickets', COUNT(*) FROM tickets;

-- ============================================================================