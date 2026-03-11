const express = require('express');
const router = express.Router();
const {
  getCustomers, createCustomer, updateCustomer, deleteCustomer,
  getProducts, createProduct,
  getTrucks, createTruck, updateTareWeight,
  getTrailers,
  getTaxRates, getTaxRateByState,
  getDeliveryRates, getDeliveryRatesByMethod,
  getTickets, getTicketById, createTicket, updateTicket, deleteTicket
} = require('../controllers');

const {
  validateCreateCustomer,
  validateUpdateCustomer,
  validateCreateProduct,
  validateCreateTruck,
  validateUpdateTareWeight,
  validateCreateTicket,
  validateCreateTaxRate,
  validateCreateDeliveryRate,
  handleValidationErrors
} = require('../middleware/validators');

// ============================================================================
// CUSTOMER ROUTES
// ============================================================================

router.get('/customers', getCustomers);

router.get('/customers/:id', getCustomers);

router.post('/customers', 
  validateCreateCustomer, 
  handleValidationErrors, 
  createCustomer
);

router.put('/customers/:id', 
  validateUpdateCustomer, 
  handleValidationErrors, 
  updateCustomer
);

router.delete('/customers/:id', deleteCustomer);

// ============================================================================
// PRODUCT ROUTES
// ============================================================================

router.get('/products', getProducts);

router.get('/products/:id', getProducts);

router.post('/products', 
  validateCreateProduct, 
  handleValidationErrors, 
  createProduct
);

// ============================================================================
// TRUCK ROUTES
// ============================================================================

router.get('/trucks', getTrucks);

router.get('/trucks/:id', getTrucks);

router.post('/trucks', 
  validateCreateTruck, 
  handleValidationErrors, 
  createTruck
);

router.post('/trucks/:id/tare', 
  validateUpdateTareWeight, 
  handleValidationErrors, 
  updateTareWeight
);

// ============================================================================
// TRAILER ROUTES
// ============================================================================

router.get('/trailers', getTrailers);

router.get('/trailers/:id', getTrailers);

// ============================================================================
// TAX RATE ROUTES
// ============================================================================

router.get('/tax-rates', getTaxRates);

router.get('/tax-rates/state/:state', getTaxRateByState);

router.post('/tax-rates', 
  validateCreateTaxRate, 
  handleValidationErrors, 
  (req, res) => res.status(501).json({ error: 'Not implemented' })
);

// ============================================================================
// DELIVERY RATE ROUTES
// ============================================================================

router.get('/delivery-rates', getDeliveryRates);

router.get('/delivery-rates/method/:method', getDeliveryRatesByMethod);

router.post('/delivery-rates', 
  validateCreateDeliveryRate, 
  handleValidationErrors, 
  (req, res) => res.status(501).json({ error: 'Not implemented' })
);

// ============================================================================
// TICKET ROUTES (CRITICAL)
// ============================================================================

router.get('/tickets', getTickets);

router.get('/tickets/:id', getTicketById);

router.post('/tickets', 
  validateCreateTicket, 
  handleValidationErrors, 
  createTicket
);

router.put('/tickets/:id', updateTicket);

router.delete('/tickets/:id', deleteTicket);

// ============================================================================

module.exports = router;
