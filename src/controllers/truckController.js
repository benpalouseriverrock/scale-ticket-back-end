// src/controllers/truckController.js
const db = require('../config/database');

exports.getAllTrucks = async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM trucks WHERE active = TRUE ORDER BY unit_number');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getTruckById = async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM trucks WHERE truck_id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Truck not found' });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createTruck = async (req, res) => {
  try {
    const { unit_number, configuration, tare_weight, identification_number } = req.body;
    if (!unit_number || !tare_weight) return res.status(400).json({ error: 'Missing required fields' });
    const query = `INSERT INTO trucks (unit_number, configuration, tare_weight, identification_number) VALUES ($1, $2, $3, $4) RETURNING *`;
    const result = await db.query(query, [unit_number, configuration, tare_weight, identification_number]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateTruck = async (req, res) => {
  try {
    const { unit_number, configuration, tare_weight, identification_number, active } = req.body;
    const query = `UPDATE trucks SET unit_number = $2, configuration = $3, tare_weight = $4, identification_number = $5, active = $6 WHERE truck_id = $1 RETURNING *`;
    const result = await db.query(query, [req.params.id, unit_number, configuration, tare_weight, identification_number, active]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Truck not found' });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateTruckTare = async (req, res) => {
  try {
    const { tare_weight } = req.body;
    if (!tare_weight) return res.status(400).json({ error: 'Tare weight required' });
    const query = `UPDATE trucks SET tare_weight = $2, last_updated = NOW() WHERE truck_id = $1 RETURNING *`;
    const result = await db.query(query, [req.params.id, tare_weight]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Truck not found' });
    res.json({ message: 'Tare weight updated', truck: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteTruck = async (req, res) => {
  try {
    const result = await db.query('DELETE FROM trucks WHERE truck_id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Truck not found' });
    res.json({ message: 'Truck deleted', truck: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
