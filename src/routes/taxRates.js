const express = require('express');
const router = express.Router();
const taxRateController = require('../controllers/taxRateController');
const { validateCreateTaxRate, handleValidationErrors } = require('../middleware/validators');

router.get('/', taxRateController.getAllTaxRates);
router.get('/:id', taxRateController.getTaxRateById);
router.get('/state/:state', taxRateController.getTaxRateByState);
router.post('/', validateCreateTaxRate, handleValidationErrors, taxRateController.createTaxRate);
router.put('/:id', taxRateController.updateTaxRate);
router.delete('/:id', taxRateController.deleteTaxRate);

module.exports = router;
