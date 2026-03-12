const { body, query, validationResult } = require('express-validator');
const db = require('../config/database');

/**
 * VALIDATION MIDDLEWARE FOR SCALE TICKET SYSTEM
 * 
 * Handles:
 * - Required fields
 * - Numeric ranges
 * - Foreign key validation
 * - Business logic validation
 * - String length and format
 */

// ============================================================================
// CUSTOMER VALIDATORS
// ============================================================================

const validateCreateCustomer = [
  body('name')
    .trim()
    .notEmpty().withMessage('Customer name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Customer name must be 2-100 characters'),
  
  body('company')
    .trim()
    .notEmpty().withMessage('Company name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Company name must be 2-100 characters'),
  
  body('contact_first')
    .optional()
    .trim()
    .isLength({ max: 50 }).withMessage('First name must be max 50 characters'),
  
  body('contact_last')
    .optional()
    .trim()
    .isLength({ max: 50 }).withMessage('Last name must be max 50 characters'),
  
  body('address_primary')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Address must be max 100 characters'),
  
  body('customer_city')
    .optional()
    .trim()
    .isLength({ max: 50 }).withMessage('City must be max 50 characters'),
  
  body('customer_state')
    .optional()
    .trim()
    .isLength({ min: 2, max: 2 }).withMessage('State must be 2-letter abbreviation (WA, ID, OR, etc.)')
    .matches(/^[A-Z]{2}$/).withMessage('State must be uppercase letters only'),
  
  body('customer_zipcode')
    .optional()
    .trim()
    .matches(/^\d{5}(?:-\d{4})?$/).withMessage('Zipcode must be valid format (12345 or 12345-6789)'),
  
  body('tax_status')
    .optional()
    .isIn(['taxable', 'exempt']).withMessage('Tax status must be taxable or exempt'),
  
  body('phone')
    .optional()
    .trim()
    .matches(/^[\d\-\+\(\)\s]+$/).withMessage('Phone number format invalid'),
  
  body('email')
    .optional()
    .trim()
    .isEmail().withMessage('Email must be valid format')
];

const validateUpdateCustomer = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('Customer name must be 2-100 characters'),
  
  body('company')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('Company name must be 2-100 characters'),
  
  body('customer_state')
    .optional()
    .trim()
    .isLength({ min: 2, max: 2 }).withMessage('State must be 2-letter code')
    .matches(/^[A-Z]{2}$/).withMessage('State must be uppercase letters only'),
  
  body('tax_status')
    .optional()
    .isIn(['taxable', 'exempt']).withMessage('Tax status must be taxable or exempt')
];

// ============================================================================
// PRODUCT VALIDATORS
// ============================================================================

const validateCreateProduct = [
  body('product_name')
    .trim()
    .notEmpty().withMessage('Product name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Product name must be 2-100 characters'),
  
  body('supplier_id')
    .notEmpty().withMessage('Supplier ID is required')
    .isInt({ min: 1 }).withMessage('Supplier ID must be a positive integer')
    .custom(async (value) => {
      const result = await db.query('SELECT supplier_id FROM suppliers WHERE supplier_id = $1', [value]);
      if (result.rows.length === 0) {
        throw new Error('Supplier ID does not exist');
      }
    }),
  
  body('price_per_ton')
    .notEmpty().withMessage('Price per ton is required')
    .isFloat({ min: 0.01 }).withMessage('Price per ton must be greater than 0')
    .toFloat(),
  
  body('material_category')
    .optional()
    .trim()
    .isLength({ max: 50 }).withMessage('Material category must be max 50 characters'),
  
  body('product_code')
    .optional()
    .trim()
    .isLength({ max: 20 }).withMessage('Product code must be max 20 characters')
];

// ============================================================================
// TRUCK VALIDATORS
// ============================================================================

const validateCreateTruck = [
  body('unit_number')
    .trim()
    .notEmpty().withMessage('Unit number is required')
    .isLength({ min: 1, max: 20 }).withMessage('Unit number must be 1-20 characters'),
  
  body('configuration')
    .optional()
    .trim()
    .isLength({ max: 50 }).withMessage('Configuration must be max 50 characters'),
  
  body('tare_weight')
    .notEmpty().withMessage('Tare weight is required')
    .isInt({ min: 5000, max: 50000 }).withMessage('Tare weight must be between 5000-50000 lbs'),
    // Reasonable range for truck tares
];

const validateUpdateTareWeight = [
  body('tare_weight')
    .notEmpty().withMessage('Tare weight is required')
    .isInt({ min: 5000, max: 50000 }).withMessage('Tare weight must be between 5000-50000 lbs')
];

// ============================================================================
// TICKET VALIDATORS (CRITICAL)
// ============================================================================

const validateCreateTicket = [
  // Required fields
  body('customer_id')
    .notEmpty().withMessage('Customer ID is required')
    .isInt({ min: 1 }).withMessage('Customer ID must be a positive integer')
    .custom(async (value) => {
      const result = await db.query('SELECT customer_id FROM customers WHERE customer_id = $1', [value]);
      if (result.rows.length === 0) {
        throw new Error('Customer ID does not exist');
      }
    }),
  
  body('product_id')
    .notEmpty().withMessage('Product ID is required')
    .isInt({ min: 1 }).withMessage('Product ID must be a positive integer')
    .custom(async (value) => {
      const result = await db.query('SELECT product_id FROM products WHERE product_id = $1', [value]);
      if (result.rows.length === 0) {
        throw new Error('Product ID does not exist');
      }
    }),
  
  body('truck_id')
    .notEmpty().withMessage('Truck ID is required')
    .isInt({ min: 1 }).withMessage('Truck ID must be a positive integer')
    .custom(async (value) => {
      const result = await db.query('SELECT truck_id FROM trucks WHERE truck_id = $1', [value]);
      if (result.rows.length === 0) {
        throw new Error('Truck ID does not exist');
      }
    }),
  
  // Optional trailer
  body('trailer_id')
    .optional()
    .isInt({ min: 1 }).withMessage('Trailer ID must be a positive integer')
    .custom(async (value) => {
      if (!value) return true;
      const result = await db.query('SELECT trailer_id FROM trailers WHERE trailer_id = $1', [value]);
      if (result.rows.length === 0) {
        throw new Error('Trailer ID does not exist');
      }
    }),
  
  // Gross weight validation
  body('gross_weight')
    .notEmpty().withMessage('Gross weight is required')
    .isFloat({ min: 0.01 }).withMessage('Gross weight must be greater than 0')
    .toFloat(),
  
  // Delivery method validation
  body('delivery_method')
    .optional()
    .isIn(['location', 'mileage', 'per_load', 'per_ton']).withMessage('Delivery method must be location, mileage, per_load, or per_ton'),

  body('delivery_input_value')
    .optional()
    .trim()
    .if(() => body('delivery_method').notEmpty())
    .notEmpty().withMessage('Delivery input required when delivery method specified')
    .custom(async (value, { req }) => {
      if (!value || !req.body.delivery_method) return true;

      const method = req.body.delivery_method;

      // per_load and per_ton use the input value as the rate directly — no DB lookup needed
      if (method === 'per_load' || method === 'per_ton') return true;

      // Validate delivery method has matching rate
      const query = 'SELECT delivery_rate_id FROM delivery_rates WHERE method = $1 AND input_value = $2';
      const result = await db.query(query, [method, value]);
      if (result.rows.length === 0) {
        throw new Error(`Delivery ${method} "${value}" does not exist in rates`);
      }
    }),
  
  // Optional fields with format validation
  body('delivered_by')
    .optional()
    .trim()
    .isLength({ max: 50 }).withMessage('Delivered by must be max 50 characters'),
  
  body('job_name')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Job name must be max 100 characters'),
  
  body('delivery_unit')
    .optional()
    .trim()
    .isLength({ max: 50 }).withMessage('Delivery unit must be max 50 characters'),
  
  body('delivery_location')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Delivery location must be max 100 characters'),
  
  body('cc_fee')
    .optional()
    .isFloat({ min: 0 }).withMessage('CC fee must be 0 or greater')
    .toFloat(),
  
  // WSDOT fields
  body('is_wsdot_ticket')
    .optional()
    .isBoolean().withMessage('is_wsdot_ticket must be true or false'),
  
  body('dot_code')
    .optional()
    .trim()
    .isLength({ max: 50 }).withMessage('DOT code must be max 50 characters'),
  
  body('job_number')
    .optional()
    .trim()
    .isLength({ max: 50 }).withMessage('Job number must be max 50 characters'),
  
  body('contract_number')
    .optional()
    .trim()
    .isLength({ max: 50 }).withMessage('Contract number must be max 50 characters'),
  
  body('purchase_order_number')
    .optional()
    .trim()
    .isLength({ max: 50 }).withMessage('PO number must be max 50 characters'),
  
  body('dispatch_number')
    .optional()
    .trim()
    .isLength({ max: 50 }).withMessage('Dispatch number must be max 50 characters'),
  
  body('mix_id')
    .optional()
    .trim()
    .isLength({ max: 50 }).withMessage('Mix ID must be max 50 characters'),
  
  body('phase_code')
    .optional()
    .trim()
    .isLength({ max: 20 }).withMessage('Phase code must be max 20 characters'),
  
  body('phase_description')
    .optional()
    .trim()
    .isLength({ max: 200 }).withMessage('Phase description must be max 200 characters'),
  
  body('weighmaster')
    .optional()
    .trim()
    .isLength({ max: 50 }).withMessage('Weighmaster must be max 50 characters'),
  
  body('comments')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Comments must be max 500 characters')
];

// ============================================================================
// TAX RATE VALIDATORS
// ============================================================================

const validateCreateTaxRate = [
  body('state_code')
    .trim()
    .notEmpty().withMessage('State code is required')
    .isLength({ min: 2, max: 2 }).withMessage('State code must be 2 letters')
    .matches(/^[A-Z]{2}$/).withMessage('State code must be uppercase letters'),
  
  body('tax_rate')
    .notEmpty().withMessage('Tax rate is required')
    .isFloat({ min: 0, max: 100 }).withMessage('Tax rate must be between 0-100')
    .toFloat()
];

// ============================================================================
// TRAILER VALIDATORS
// ============================================================================

const validateCreateTrailer = [
  body('unit_number')
    .trim()
    .notEmpty().withMessage('Unit number is required')
    .isLength({ min: 1, max: 20 }).withMessage('Unit number must be 1-20 characters'),

  body('configuration')
    .optional()
    .trim()
    .isLength({ max: 50 }).withMessage('Configuration must be max 50 characters'),

  body('tare_weight')
    .notEmpty().withMessage('Tare weight is required')
    .isInt({ min: 0, max: 30000 }).withMessage('Tare weight must be between 0-30000 lbs')
];

// ============================================================================
// SUPPLIER VALIDATORS
// ============================================================================

const validateCreateSupplier = [
  body('supplier_name')
    .trim()
    .notEmpty().withMessage('Supplier name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Supplier name must be 2-100 characters'),

  body('plant_name')
    .optional()
    .trim()
    .isLength({ max: 100 }).withMessage('Plant name must be max 100 characters'),

  body('contact_info')
    .optional()
    .trim()
    .isLength({ max: 500 }).withMessage('Contact info must be max 500 characters')
];

// ============================================================================
// DELIVERY RATE VALIDATORS
// ============================================================================

const validateCreateDeliveryRate = [
  body('method')
    .notEmpty().withMessage('Method is required')
    .isIn(['location', 'mileage']).withMessage('Method must be location or mileage'),
  
  body('delivery_location')
    .if((value, { req }) => req.body.method === 'location')
    .trim()
    .notEmpty().withMessage('Delivery location required for location method')
    .isLength({ min: 2, max: 50 }).withMessage('Delivery location must be 2-50 characters'),
  
  body('mileage_range')
    .if((value, { req }) => req.body.method === 'mileage')
    .trim()
    .notEmpty().withMessage('Mileage range required for mileage method')
    .matches(/^\d+-\d+$/).withMessage('Mileage range format: "0-5", "5-10", etc.'),
  
  body('flat_rate')
    .if((value, { req }) => req.body.method === 'location')
    .notEmpty().withMessage('Flat rate required for location method')
    .isFloat({ min: 0.01 }).withMessage('Flat rate must be greater than 0')
    .toFloat(),
  
  body('rate_per_mile')
    .if((value, { req }) => req.body.method === 'mileage')
    .notEmpty().withMessage('Rate per mile required for mileage method')
    .isFloat({ min: 0.01 }).withMessage('Rate per mile must be greater than 0')
    .toFloat()
];

// ============================================================================
// ERROR HANDLER MIDDLEWARE
// ============================================================================

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array().map(err => ({
        field: err.param,
        message: err.msg,
        value: err.value
      }))
    });
  }
  
  next();
};

// ============================================================================
// EXPORT ALL VALIDATORS
// ============================================================================

module.exports = {
  // Customer validators
  validateCreateCustomer,
  validateUpdateCustomer,

  // Product validators
  validateCreateProduct,

  // Truck validators
  validateCreateTruck,
  validateUpdateTareWeight,

  // Trailer validators
  validateCreateTrailer,

  // Supplier validators
  validateCreateSupplier,

  // Ticket validators (CRITICAL)
  validateCreateTicket,

  // Tax rate validators
  validateCreateTaxRate,

  // Delivery rate validators
  validateCreateDeliveryRate,

  // Error handler
  handleValidationErrors
};
