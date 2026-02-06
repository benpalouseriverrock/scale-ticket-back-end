const express = require('express');
const router = express.Router();
const truckController = require('../controllers/truckController');

router.get('/', truckController.getAllTrucks);
router.get('/:id', truckController.getTruckById);
router.post('/', truckController.createTruck);
router.put('/:id', truckController.updateTruck);
router.post('/:id/tare', truckController.updateTruckTare);
router.delete('/:id', truckController.deleteTruck);

module.exports = router;
