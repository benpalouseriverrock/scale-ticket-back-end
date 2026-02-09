const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');
const { validateCreateCustomer, validateUpdateCustomer, handleValidationErrors } = require('../middleware/validators');

router.get('/', customerController.getAllCustomers);
router.get('/:id', customerController.getCustomerById);
router.post('/', validateCreateCustomer, handleValidationErrors, customerController.createCustomer);
router.put('/:id', validateUpdateCustomer, handleValidationErrors, customerController.updateCustomer);
router.delete('/:id', customerController.deleteCustomer);

module.exports = router;
