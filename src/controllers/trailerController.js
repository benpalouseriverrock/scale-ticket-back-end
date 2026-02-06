// src/controllers/trailerController.js
const db = require('../config/database');

exports.getAllTrailers = async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM trailers WHERE active = TRUE ORDER BY unit_number');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getTrailerById = async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM trailers WHERE trailer_id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Trailer not found' });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createTrailer = async (req, res) => {
  try {
    const { unit_number, configuration, tare_weight } = req.body;
    if (!unit_number || !tare_weight) return res.status(400).json({ error: 'Missing required fields' });
    const query = `INSERT INTO trailers (unit_number, configuration, tare_weight) VALUES ($1, $2, $3) RETURNING *`;
    const result = await db.query(query, [unit_number, configuration, tare_weight]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateTrailer = async (req, res) => {
  try {
    const { unit_number, configuration, tare_weight, active } = req.body;
    const query = `UPDATE trailers SET unit_number = $2, configuration = $3, tare_weight = $4, active = $5 WHERE trailer_id = $1 RETURNING *`;
    const result = await db.query(query, [req.params.id, unit_number, configuration, tare_weight, active]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Trailer not found' });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteTrailer = async (req, res) => {
  try {
    const result = await db.query('DELETE FROM trailers WHERE trailer_id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Trailer not found' });
    res.json({ message: 'Trailer deleted', trailer: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
