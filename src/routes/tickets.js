const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticketController');

router.get('/', ticketController.getAllTickets);
router.get('/:id', ticketController.getTicketById);
router.post('/', ticketController.createTicket);
router.delete('/:id', ticketController.deleteTicket);
router.post('/:id/print', ticketController.markPrinted);
router.post('/:id/haulhub', ticketController.pushToHaulHub);

module.exports = router;
