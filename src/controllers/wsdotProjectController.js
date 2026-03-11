// src/controllers/wsdotProjectController.js
// CRUD for reusable WSDOT project templates

const db = require('../config/database');

exports.getAll = async (req, res) => {
  try {
    const result = await db.query(
      'SELECT * FROM wsdot_projects WHERE is_active = TRUE ORDER BY project_name ASC'
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching WSDOT projects:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query('SELECT * FROM wsdot_projects WHERE project_id = $1', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Project not found' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching WSDOT project:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.create = async (req, res) => {
  try {
    const {
      project_name, contract_number, dot_code, job_number,
      mix_id, phase_code, phase_description, dispatch_number,
      purchase_order_number, weighmaster
    } = req.body;

    if (!project_name) {
      return res.status(400).json({ error: 'project_name is required' });
    }

    const result = await db.query(
      `INSERT INTO wsdot_projects
         (project_name, contract_number, dot_code, job_number, mix_id,
          phase_code, phase_description, dispatch_number, purchase_order_number, weighmaster)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [
        project_name, contract_number || null, dot_code || null, job_number || null,
        mix_id || null, phase_code || null, phase_description || null,
        dispatch_number || null, purchase_order_number || null, weighmaster || null
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating WSDOT project:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      project_name, contract_number, dot_code, job_number,
      mix_id, phase_code, phase_description, dispatch_number,
      purchase_order_number, weighmaster, is_active
    } = req.body;

    const existing = await db.query('SELECT * FROM wsdot_projects WHERE project_id = $1', [id]);
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Project not found' });

    const p = existing.rows[0];
    const result = await db.query(
      `UPDATE wsdot_projects SET
         project_name = $2, contract_number = $3, dot_code = $4, job_number = $5,
         mix_id = $6, phase_code = $7, phase_description = $8, dispatch_number = $9,
         purchase_order_number = $10, weighmaster = $11, is_active = $12
       WHERE project_id = $1 RETURNING *`,
      [
        id,
        project_name ?? p.project_name,
        contract_number ?? p.contract_number,
        dot_code ?? p.dot_code,
        job_number ?? p.job_number,
        mix_id ?? p.mix_id,
        phase_code ?? p.phase_code,
        phase_description ?? p.phase_description,
        dispatch_number ?? p.dispatch_number,
        purchase_order_number ?? p.purchase_order_number,
        weighmaster ?? p.weighmaster,
        is_active ?? p.is_active
      ]
    );
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating WSDOT project:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const { id } = req.params;
    // Soft-delete so historical tickets remain linked
    const result = await db.query(
      'UPDATE wsdot_projects SET is_active = FALSE WHERE project_id = $1 RETURNING *',
      [id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Project not found' });
    res.json({ message: 'Project deactivated', project: result.rows[0] });
  } catch (error) {
    console.error('Error deleting WSDOT project:', error);
    res.status(500).json({ error: error.message });
  }
};
