// src/controllers/deliveryRateController.js
const db = require('../config/database');

exports.getAllDeliveryRates = async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM delivery_rates WHERE active = TRUE ORDER BY method, input_value');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getDeliveryRateById = async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM delivery_rates WHERE delivery_rate_id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Delivery rate not found' });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getDeliveryRatesByMethod = async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM delivery_rates WHERE method = $1 AND active = TRUE ORDER BY input_value', [req.params.method]);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createDeliveryRate = async (req, res) => {
  try {
    const { method, input_value, rate_per_mile, flat_rate, minimum_charge } = req.body;
    if (!method || !input_value) return res.status(400).json({ error: 'Missing required fields' });
    const query = `INSERT INTO delivery_rates (method, input_value, rate_per_mile, flat_rate, minimum_charge) VALUES ($1, $2, $3, $4, $5) RETURNING *`;
    const result = await db.query(query, [method, input_value, rate_per_mile, flat_rate, minimum_charge]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateDeliveryRate = async (req, res) => {
  try {
    const { method, input_value, rate_per_mile, flat_rate, minimum_charge, active } = req.body;
    const query = `UPDATE delivery_rates SET method = $2, input_value = $3, rate_per_mile = $4, flat_rate = $5, minimum_charge = $6, active = $7 WHERE delivery_rate_id = $1 RETURNING *`;
    const result = await db.query(query, [req.params.id, method, input_value, rate_per_mile, flat_rate, minimum_charge, active]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Delivery rate not found' });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteDeliveryRate = async (req, res) => {
  try {
    const result = await db.query('DELETE FROM delivery_rates WHERE delivery_rate_id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Delivery rate not found' });
    res.json({ message: 'Delivery rate deleted', delivery_rate: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
