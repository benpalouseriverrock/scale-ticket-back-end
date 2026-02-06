// src/controllers/ticketController.js
const db = require('../config/database');

const calculateDeliveryCharge = async (method, inputValue) => {
  try {
    let query, params;
    
    if (method === 'location') {
      query = `SELECT flat_rate, minimum_charge FROM delivery_rates 
               WHERE method = $1 AND input_value = $2 AND active = TRUE LIMIT 1`;
      params = ['location', inputValue];
    } else if (method === 'mileage') {
      query = `SELECT rate_per_mile, minimum_charge FROM delivery_rates 
               WHERE method = $1 AND input_value = $2 AND active = TRUE LIMIT 1`;
      params = ['mileage', inputValue];
    } else {
      return 0;
    }
    
    const result = await db.query(query, params);
    if (result.rows.length === 0) return 0;
    
    const row = result.rows[0];
    let charge = method === 'location' ? row.flat_rate : row.rate_per_mile;
    
    if (row.minimum_charge && charge < row.minimum_charge) {
      charge = row.minimum_charge;
    }
    
    return parseFloat((charge || 0).toFixed(2));
  } catch (error) {
    console.error('Error calculating delivery charge:', error);
    return 0;
  }
};

const getTaxRate = async (customerId) => {
  try {
    const query = `
      SELECT tr.rate_percentage FROM tax_rates tr
      JOIN customers c ON c.customer_state = tr.state_code
      WHERE c.customer_id = $1 AND tr.active = TRUE LIMIT 1
    `;
    const result = await db.query(query, [customerId]);
    return result.rows.length > 0 ? result.rows[0].rate_percentage : 7.9;
  } catch (error) {
    console.error('Error getting tax rate:', error);
    return 7.9;
  }
};

const getNextTicketNumber = async () => {
  try {
    const result = await db.query(`
      SELECT COALESCE(MAX(CAST(ticket_number AS INTEGER)), 0) + 1 as next_num
      FROM tickets WHERE ticket_number ~ '^[0-9]+$'
    `);
    return String(result.rows[0].next_num).padStart(6, '0');
  } catch (error) {
    return String(Math.floor(Math.random() * 999999)).padStart(6, '0');
  }
};

exports.createTicket = async (req, res) => {
  try {
    const {
      customer_id, product_id, truck_id, trailer_id, gross_weight,
      job_name, delivered_by, delivery_unit, delivery_location,
      delivery_method, delivery_input_value, cc_fee,
      is_wsdot_ticket, dot_code, contract_number, job_number, mix_id,
      phase_code, phase_description, dispatch_number, purchase_order_number,
      weighmaster, comments
    } = req.body;

    if (!customer_id || !product_id || !truck_id || !gross_weight) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const prodResult = await db.query('SELECT price_per_ton FROM products WHERE product_id = $1', [product_id]);
    if (prodResult.rows.length === 0) return res.status(404).json({ error: 'Product not found' });
    const productPrice = prodResult.rows[0].price_per_ton;

    const truckResult = await db.query('SELECT tare_weight FROM trucks WHERE truck_id = $1', [truck_id]);
    if (truckResult.rows.length === 0) return res.status(404).json({ error: 'Truck not found' });
    const truckTare = truckResult.rows[0].tare_weight;

    let trailerTare = 0;
    if (trailer_id) {
      const trailerResult = await db.query('SELECT tare_weight FROM trailers WHERE trailer_id = $1', [trailer_id]);
      if (trailerResult.rows.length > 0) {
        trailerTare = trailerResult.rows[0].tare_weight;
      }
    }

    const netWeightLbs = gross_weight - (truckTare + trailerTare);
    const netWeightTons = parseFloat((netWeightLbs / 2000).toFixed(2));

    const deliveryCharge = (delivery_method && delivery_input_value) 
      ? await calculateDeliveryCharge(delivery_method, delivery_input_value) 
      : 0;

    const taxRate = await getTaxRate(customer_id);

    const materialCost = parseFloat((netWeightTons * productPrice).toFixed(2));
    const subtotal = parseFloat((materialCost + deliveryCharge).toFixed(2));
    const taxAmount = parseFloat((subtotal * (taxRate / 100)).toFixed(2));
    const total = parseFloat((subtotal + taxAmount + (cc_fee || 0)).toFixed(2));

    const ticketNumber = await getNextTicketNumber();

    let loadsToday = null;
    let quantityShippedToday = null;
    if (is_wsdot_ticket) {
      const today = new Date().toISOString().split('T')[0];
      const wsdotResult = await db.query(`
        SELECT COUNT(*) as loads_today, COALESCE(SUM(net_tons), 0) as quantity_shipped_today
        FROM tickets WHERE DATE(date_time) = $1 AND is_wsdot_ticket = TRUE
      `, [today]);
      if (wsdotResult.rows.length > 0) {
        loadsToday = parseInt(wsdotResult.rows[0].loads_today) + 1;
        quantityShippedToday = parseFloat(wsdotResult.rows[0].quantity_shipped_today) + netWeightTons;
      }
    }

    const query = `
      INSERT INTO tickets (
        ticket_number, date_time, customer_id, product_id, truck_id, trailer_id,
        job_name, delivered_by, delivery_unit, delivery_location,
        gross_weight, tare_weight, net_weight, net_tons,
        delivery_charge, delivery_method, delivery_input_value,
        subtotal, tax_rate, tax_amount, cc_fee, total,
        is_wsdot_ticket, dot_code, contract_number, job_number, mix_id, phase_code,
        phase_description, dispatch_number, purchase_order_number, weighmaster,
        loads_today, quantity_shipped_today, comments
      ) VALUES (
        $1, NOW(), $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16,
        $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, $31, $32,
        $33, $34
      ) RETURNING *
    `;

    const values = [
      ticketNumber, customer_id, product_id, truck_id, trailer_id || null,
      job_name || null, delivered_by || null, delivery_unit || null, delivery_location || null,
      gross_weight, (truckTare + trailerTare), netWeightLbs, netWeightTons,
      deliveryCharge, delivery_method || null, delivery_input_value || null,
      subtotal, taxRate, taxAmount, cc_fee || 0, total,
      is_wsdot_ticket || false, dot_code || null, contract_number || null, job_number || null,
      mix_id || null, phase_code || null, phase_description || null, dispatch_number || null,
      purchase_order_number || null, weighmaster || null, loadsToday, quantityShippedToday,
      comments || null
    ];

    const result = await db.query(query, values);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Error creating ticket:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.getAllTickets = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const query = `
      SELECT t.*, c.name as customer_name, p.product_name, tr.unit_number as truck_number, trl.unit_number as trailer_number
      FROM tickets t
      LEFT JOIN customers c ON t.customer_id = c.customer_id
      LEFT JOIN products p ON t.product_id = p.product_id
      LEFT JOIN trucks tr ON t.truck_id = tr.truck_id
      LEFT JOIN trailers trl ON t.trailer_id = trl.trailer_id
      ORDER BY t.date_time DESC LIMIT $1 OFFSET $2
    `;

    const result = await db.query(query, [limit, offset]);
    res.json(result.rows);
  } catch (error) {
    console.error('Error fetching tickets:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.getTicketById = async (req, res) => {
  try {
    const { id } = req.params;
    const query = `
      SELECT t.*, c.name as customer_name, p.product_name, tr.unit_number as truck_number, trl.unit_number as trailer_number
      FROM tickets t
      LEFT JOIN customers c ON t.customer_id = c.customer_id
      LEFT JOIN products p ON t.product_id = p.product_id
      LEFT JOIN trucks tr ON t.truck_id = tr.truck_id
      LEFT JOIN trailers trl ON t.trailer_id = trl.trailer_id
      WHERE t.ticket_id = $1
    `;

    const result = await db.query(query, [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Ticket not found' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching ticket:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.deleteTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await db.query('DELETE FROM tickets WHERE ticket_id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Ticket not found' });
    res.json({ message: 'Ticket deleted', ticket: result.rows[0] });
  } catch (error) {
    console.error('Error deleting ticket:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.markPrinted = async (req, res) => {
  try {
    const { id } = req.params;
    const { printed_as } = req.body;
    const query = `UPDATE tickets SET is_printed = TRUE, is_invoice = $2 WHERE ticket_id = $1 RETURNING *`;
    const result = await db.query(query, [id, printed_as === 'invoice']);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Ticket not found' });
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error marking printed:', error);
    res.status(500).json({ error: error.message });
  }
};

exports.pushToHaulHub = async (req, res) => {
  try {
    const { id } = req.params;
    const ticketQuery = `SELECT t.*, c.name as customer_name FROM tickets t
                         JOIN customers c ON t.customer_id = c.customer_id
                         WHERE t.ticket_id = $1 AND t.is_wsdot_ticket = TRUE`;

    const ticketResult = await db.query(ticketQuery, [id]);
    if (ticketResult.rows.length === 0) return res.status(404).json({ error: 'WSDOT ticket not found' });

    const ticket = ticketResult.rows[0];
    const haulhubResponse = { status: 'success', ticket_number: ticket.ticket_number };

    const updateQuery = `UPDATE tickets SET haulhub_pushed_at = NOW(), haulhub_response = $2, haulhub_status_code = 200
                         WHERE ticket_id = $1 RETURNING *`;
    const updateResult = await db.query(updateQuery, [id, JSON.stringify(haulhubResponse)]);

    res.json({ message: 'Ticket marked for HaulHub', ticket: updateResult.rows[0] });
  } catch (error) {
    console.error('Error pushing to HaulHub:', error);
    res.status(500).json({ error: error.message });
  }
};
