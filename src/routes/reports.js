const express = require('express');
const router = express.Router();
const { getMonthlyReport, getAvailableMonths } = require('../controllers/reportController');

router.get('/monthly', getMonthlyReport);
router.get('/available-months', getAvailableMonths);

module.exports = router;
