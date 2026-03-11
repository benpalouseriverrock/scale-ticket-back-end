// src/controllers/supplierController.js
const db = require('../config/database');

exports.getAllSuppliers = async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM suppliers WHERE active = TRUE ORDER BY supplier_name');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getSupplierById = async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM suppliers WHERE supplier_id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Supplier not found' });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createSupplier = async (req, res) => {
  try {
    const { supplier_name, plant_name, contact_info } = req.body;
    if (!supplier_name) return res.status(400).json({ error: 'Supplier name required' });
    const query = `INSERT INTO suppliers (supplier_name, plant_name, contact_info) VALUES ($1, $2, $3) RETURNING *`;
    const result = await db.query(query, [supplier_name, plant_name, contact_info]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateSupplier = async (req, res) => {
  try {
    const { supplier_name, plant_name, contact_info, active } = req.body;
    const query = `UPDATE suppliers SET supplier_name = $2, plant_name = $3, contact_info = $4, active = $5 WHERE supplier_id = $1 RETURNING *`;
    const result = await db.query(query, [req.params.id, supplier_name, plant_name, contact_info, active]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Supplier not found' });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteSupplier = async (req, res) => {
  try {
    const result = await db.query('DELETE FROM suppliers WHERE supplier_id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Supplier not found' });
    res.json({ message: 'Supplier deleted', supplier: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
