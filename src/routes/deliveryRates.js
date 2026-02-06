const express = require('express');
const router = express.Router();
const deliveryRateController = require('../controllers/deliveryRateController');

router.get('/', deliveryRateController.getAllDeliveryRates);
router.get('/:id', deliveryRateController.getDeliveryRateById);
router.get('/method/:method', deliveryRateController.getDeliveryRatesByMethod);
router.post('/', deliveryRateController.createDeliveryRate);
router.put('/:id', deliveryRateController.updateDeliveryRate);
router.delete('/:id', deliveryRateController.deleteDeliveryRate);

module.exports = router;
