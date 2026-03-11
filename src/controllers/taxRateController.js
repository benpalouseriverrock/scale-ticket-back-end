// src/controllers/taxRateController.js
const db = require('../config/database');

exports.getAllTaxRates = async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM tax_rates WHERE active = TRUE ORDER BY state_code, location');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getTaxRateById = async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM tax_rates WHERE tax_rate_id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Tax rate not found' });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getTaxRateByState = async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM tax_rates WHERE state_code = $1 AND active = TRUE', [req.params.state]);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createTaxRate = async (req, res) => {
  try {
    const { state_code, location, rate_percentage, description } = req.body;
    if (!state_code || !rate_percentage) return res.status(400).json({ error: 'Missing required fields' });
    const query = `INSERT INTO tax_rates (state_code, location, rate_percentage, description) VALUES ($1, $2, $3, $4) RETURNING *`;
    const result = await db.query(query, [state_code, location, rate_percentage, description]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateTaxRate = async (req, res) => {
  try {
    const { state_code, location, rate_percentage, description, active } = req.body;
    const query = `UPDATE tax_rates SET state_code = $2, location = $3, rate_percentage = $4, description = $5, active = $6 WHERE tax_rate_id = $1 RETURNING *`;
    const result = await db.query(query, [req.params.id, state_code, location, rate_percentage, description, active]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Tax rate not found' });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteTaxRate = async (req, res) => {
  try {
    const result = await db.query('DELETE FROM tax_rates WHERE tax_rate_id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Tax rate not found' });
    res.json({ message: 'Tax rate deleted', tax_rate: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
