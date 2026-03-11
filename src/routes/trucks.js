const express = require('express');
const router = express.Router();
const truckController = require('../controllers/truckController');
const { validateCreateTruck, validateUpdateTareWeight, handleValidationErrors } = require('../middleware/validators');

router.get('/', truckController.getAllTrucks);
router.get('/:id', truckController.getTruckById);
router.post('/', validateCreateTruck, handleValidationErrors, truckController.createTruck);
router.put('/:id', truckController.updateTruck);
router.post('/:id/tare', validateUpdateTareWeight, handleValidationErrors, truckController.updateTruckTare);
router.delete('/:id', truckController.deleteTruck);

module.exports = router;
