// src/controllers/productController.js
const db = require('../config/database');

exports.getAllProducts = async (req, res) => {
  try {
    const result = await db.query(`SELECT p.*, s.supplier_name FROM products p LEFT JOIN suppliers s ON p.supplier_id = s.supplier_id ORDER BY p.product_name`);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getProductById = async (req, res) => {
  try {
    const result = await db.query(`SELECT p.*, s.supplier_name FROM products p LEFT JOIN suppliers s ON p.supplier_id = s.supplier_id WHERE p.product_id = $1`, [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Product not found' });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.createProduct = async (req, res) => {
  try {
    const { product_name, supplier_id, price_per_ton, material_category, mix_id, product_code } = req.body;
    if (!product_name || !supplier_id || !price_per_ton) return res.status(400).json({ error: 'Missing required fields' });
    const query = `INSERT INTO products (product_name, supplier_id, price_per_ton, material_category, mix_id, product_code) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`;
    const result = await db.query(query, [product_name, supplier_id, price_per_ton, material_category, mix_id, product_code]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateProduct = async (req, res) => {
  try {
    const { product_name, supplier_id, price_per_ton, material_category, mix_id, product_code, active } = req.body;
    const query = `UPDATE products SET product_name = $2, supplier_id = $3, price_per_ton = $4, material_category = $5, mix_id = $6, product_code = $7, active = $8 WHERE product_id = $1 RETURNING *`;
    const result = await db.query(query, [req.params.id, product_name, supplier_id, price_per_ton, material_category, mix_id, product_code, active]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Product not found' });
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    const result = await db.query('DELETE FROM products WHERE product_id = $1 RETURNING *', [req.params.id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Product not found' });
    res.json({ message: 'Product deleted', product: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
