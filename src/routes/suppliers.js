const express = require('express');
const router = express.Router();
const supplierController = require('../controllers/supplierController');
const { validateCreateSupplier, handleValidationErrors } = require('../middleware/validators');

router.get('/', supplierController.getAllSuppliers);
router.get('/:id', supplierController.getSupplierById);
router.post('/', validateCreateSupplier, handleValidationErrors, supplierController.createSupplier);
router.put('/:id', supplierController.updateSupplier);
router.delete('/:id', supplierController.deleteSupplier);

module.exports = router;
