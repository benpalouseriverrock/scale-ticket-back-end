const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticketController');
const { validateCreateTicket, handleValidationErrors } = require('../middleware/validators');

router.get('/', ticketController.getAllTickets);
router.get('/:id', ticketController.getTicketById);
router.post('/', validateCreateTicket, handleValidationErrors, ticketController.createTicket);
router.put('/:id', ticketController.updateTicket);
router.delete('/:id', ticketController.deleteTicket);
router.post('/:id/print', ticketController.markPrinted);
router.post('/:id/haulhub', ticketController.pushToHaulHub);

module.exports = router;
