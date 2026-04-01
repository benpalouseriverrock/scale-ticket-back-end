const express = require('express');
const router = express.Router();
const trailerController = require('../controllers/trailerController');
const { validateCreateTrailer, validateUpdateTareWeight, handleValidationErrors } = require('../middleware/validators');

router.get('/', trailerController.getAllTrailers);
router.get('/:id', trailerController.getTrailerById);
router.post('/', validateCreateTrailer, handleValidationErrors, trailerController.createTrailer);
router.put('/:id', trailerController.updateTrailer);
router.post('/:id/tare', validateUpdateTareWeight, handleValidationErrors, trailerController.updateTrailerTare);
router.delete('/:id', trailerController.deleteTrailer);

module.exports = router;
