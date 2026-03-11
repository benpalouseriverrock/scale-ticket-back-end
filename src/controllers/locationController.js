// src/controllers/locationController.js
const pool = require('../config/db');

async function getAllLocations(req, res) {
  try {
    const result = await pool.query(
      'SELECT * FROM delivery_locations WHERE is_active = true ORDER BY location_name ASC'
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching locations:', err);
    res.status(500).json({ error: 'Failed to fetch locations' });
  }
}

async function getLocationById(req, res) {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM delivery_locations WHERE id = $1', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Location not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error fetching location:', err);
    res.status(500).json({ error: 'Failed to fetch location' });
  }
}

async function createLocation(req, res) {
  try {
    const { location_name, freight_rate_per_ton, distance_miles, trip_rate_minimum, tax_code } = req.body;
    if (!location_name || !freight_rate_per_ton) {
      return res.status(400).json({ error: 'Location name and freight rate required' });
    }
    const result = await pool.query(
      'INSERT INTO delivery_locations (location_name, freight_rate_per_ton, distance_miles, trip_rate_minimum, tax_code, is_active) VALUES ($1, $2, $3, $4, $5, true) RETURNING *',
      [location_name, freight_rate_per_ton, distance_miles, trip_rate_minimum, tax_code]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creating location:', err);
    res.status(500).json({ error: 'Failed to create location' });
  }
}

async function updateLocation(req, res) {
  try {
    const { id } = req.params;
    const { location_name, freight_rate_per_ton, distance_miles, trip_rate_minimum, tax_code } = req.body;
    const result = await pool.query(
      `UPDATE delivery_locations SET 
        location_name = COALESCE($1, location_name),
        freight_rate_per_ton = COALESCE($2, freight_rate_per_ton),
        distance_miles = COALESCE($3, distance_miles),
        trip_rate_minimum = COALESCE($4, trip_rate_minimum),
        tax_code = COALESCE($5, tax_code),
        updated_at = NOW()
      WHERE id = $6 RETURNING *`,
      [location_name, freight_rate_per_ton, distance_miles, trip_rate_minimum, tax_code, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Location not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error updating location:', err);
    res.status(500).json({ error: 'Failed to update location' });
  }
}

async function deleteLocation(req, res) {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'UPDATE delivery_locations SET is_active = false, updated_at = NOW() WHERE id = $1 RETURNING *',
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Location not found' });
    }
    res.json({ message: 'Location deactivated', location: result.rows[0] });
  } catch (err) {
    console.error('Error deleting location:', err);
    res.status(500).json({ error: 'Failed to delete location' });
  }
}

module.exports = {
  getAllLocations,
  getLocationById,
  createLocation,
  updateLocation,
  deleteLocation
};
