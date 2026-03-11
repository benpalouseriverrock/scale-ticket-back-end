// src/routes/locations.js
const express = require('express');
const router = express.Router();
const locationController = require('../controllers/locationController');

// GET all locations
router.get('/', locationController.getAllLocations);

// GET location by ID
router.get('/:id', locationController.getLocationById);

// POST new location
router.post('/', locationController.createLocation);

// PUT update location
router.put('/:id', locationController.updateLocation);

// DELETE (soft) location
router.delete('/:id', locationController.deleteLocation);

module.exports = router;
