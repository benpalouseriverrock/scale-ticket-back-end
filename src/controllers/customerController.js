// src/controllers/customerController.js
const db = require('../config/database');

exports.getAllCustomers = async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM customers ORDER BY name');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getCustomerById = async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM customers WHERE customer_id = $1', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Customer not found' });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createCustomer = async (req, res) => {
  try {
    const { name, company, contact_first, contact_last, address_primary, customer_city, customer_state, customer_zipcode, tax_status, phone, email } = req.body;
    if (!name) return res.status(400).json({ error: 'Name required' });

    const query = `INSERT INTO customers (name, company, contact_first, contact_last, address_primary, customer_city, customer_state, customer_zipcode, tax_status, phone, email)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`;
    const result = await db.query(query, [name, company, contact_first, contact_last, address_primary, customer_city, customer_state, customer_zipcode, tax_status, phone, email]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, company, contact_first, contact_last, address_primary, customer_city, customer_state, customer_zipcode, tax_status, phone, email, balance, notes } = req.body;
    const query = `UPDATE customers SET name = $2, company = $3, contact_first = $4, contact_last = $5, address_primary = $6, customer_city = $7, customer_state = $8, customer_zipcode = $9, tax_status = $10, phone = $11, email = $12, balance = $13, notes = $14 WHERE customer_id = $1 RETURNING *`;
    const result = await db.query(query, [id, name, company, contact_first, contact_last, address_primary, customer_city, customer_state, customer_zipcode, tax_status, phone, email, balance, notes]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Customer not found' });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteCustomer = async (req, res) => {
  try {
    const result = await db.query('DELETE FROM customers WHERE customer_id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Customer not found' });
    res.json({ message: 'Customer deleted', customer: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
