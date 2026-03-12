// src/controllers/ticketController.js
// ✅ UPDATED: Now handles split weight entry (truck_weight + pup_weight)

const db = require('../config/database');
const haulhubService = require('../services/haulhubService');

const calculateDeliveryCharge = async (method, inputValue, tons = 1) => {
  try {
    // per_load: inputValue IS the flat charge — no DB lookup needed
    if (method === 'per_load') {
      return parseFloat(parseFloat(inputValue || 0).toFixed(2));
    }

    // per_ton: inputValue IS the rate — multiply by tons
    if (method === 'per_ton') {
      const rate = parseFloat(inputValue) || 0;
      return parseFloat((rate * tons).toFixed(2));
    }

    // ⭐ CORRECTED: Both methods query flat_rate column (rate_per_mile is NULL in database!)
    const query = `
      SELECT flat_rate, minimum_charge
      FROM delivery_rates
      WHERE method = $1 AND input_value = $2 AND active = TRUE
      LIMIT 1
    `;

    const result = await db.query(query, [method, inputValue]);
    if (result.rows.length === 0) return 0;

    const row = result.rows[0];
    let charge = 0;

    if (method === 'location') {
      // ⭐ CRITICAL: flat_rate contains $/ton rate - MUST multiply by tons!
      // Example: Colfax = $6.5/ton, for 10 tons = 10 × $6.5 = $65
      charge = (row.flat_rate || 0) * tons;

    } else if (method === 'mileage') {
      // ⭐ CRITICAL: flat_rate contains rate for this mileage range - use directly
      // Example: 11-15 miles = $3.25 (don't multiply by tons)
      charge = row.flat_rate || 0;
    } else {
      return 0;
    }

    // Apply minimum charge if applicable
    if (row.minimum_charge && charge < row.minimum_charge) {
      charge = row.minimum_charge;
    }

    return parseFloat(charge.toFixed(2));

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

/**
 * Push a ticket to HaulHub and record the result in the database.
 * Fetches related customer, product, supplier, and truck data to build the payload.
 */
const pushTicketToHaulHub = async (ticket) => {
  try {
    // Fetch related records needed for the HaulHub payload
    const [customerRes, productRes, truckRes] = await Promise.all([
      db.query(
        `SELECT c.*, s.supplier_name, s.plant_name, s.supplier_id
         FROM customers c
         LEFT JOIN products p ON p.product_id = $2
         LEFT JOIN suppliers s ON s.supplier_id = p.supplier_id
         WHERE c.customer_id = $1`,
        [ticket.customer_id, ticket.product_id]
      ),
      db.query('SELECT * FROM products WHERE product_id = $1', [ticket.product_id]),
      db.query('SELECT * FROM trucks WHERE truck_id = $1', [ticket.truck_id]),
    ]);

    const customer = customerRes.rows[0] || {};
    const product = productRes.rows[0] || {};
    const supplier = {
      supplier_id: customer.supplier_id,
      supplier_name: customer.supplier_name,
      plant_name: customer.plant_name,
    };
    const truck = truckRes.rows[0] || null;

    const payload = haulhubService.buildHaulHubPayload(ticket, customer, product, supplier, truck);

    console.log('HaulHub payload:', JSON.stringify(payload, null, 2));

    const response = await haulhubService.postToHaulHub(payload);

    console.log('HaulHub response:', response.statusCode, JSON.stringify(response.body));

    // Record the response in the database
    await db.query(
      `UPDATE tickets
       SET haulhub_pushed_at = NOW(),
           haulhub_response = $2,
           haulhub_status_code = $3
       WHERE ticket_id = $1`,
      [ticket.ticket_id, JSON.stringify(response.body), response.statusCode]
    );

    return response;
  } catch (error) {
    console.error('HaulHub push failed for ticket', ticket.ticket_id, ':', error.message);

    // Record the failure
    await db.query(
      `UPDATE tickets
       SET haulhub_response = $2,
           haulhub_status_code = $3
       WHERE ticket_id = $1`,
      [ticket.ticket_id, JSON.stringify({ error: error.message }), 0]
    ).catch(() => {});

    return { statusCode: 0, body: { error: error.message } };
  }
};

// ============================================================================
// CREATE TICKET - Updated to handle split weight entry
// ============================================================================
exports.createTicket = async (req, res) => {
  try {
    const {
      customer_id, product_id, truck_id, trailer_id,
      truck_weight,      // ✅ NEW: User enters truck weight
      pup_weight,        // ✅ NEW: User enters pup/trailer weight
      gross_weight,      // ✅ Should be truck_weight + pup_weight from frontend
      job_name, delivered_by, delivery_unit, delivery_location,
      delivery_method, delivery_input_value, cc_fee,
      is_wsdot_ticket, dot_code, contract_number, job_number, mix_id,
      phase_code, phase_description, dispatch_number, purchase_order_number,
      weighmaster, comments,
      manual_tare_override
    } = req.body;

    // ✅ VALIDATION: Check required fields
    if (!customer_id || !product_id || !truck_id) {
      return res.status(400).json({ error: 'Missing required fields: customer, product, truck' });
    }

    // ✅ VALIDATION: Check weight fields
    if (!truck_weight || truck_weight <= 0) {
      return res.status(400).json({ error: 'Truck weight is required and must be greater than 0' });
    }

    // ✅ STEP 1: Calculate gross weight from split weights
    const truckWeightLbs = parseFloat(truck_weight) || 0;
    const pupWeightLbs = parseFloat(pup_weight) || 0;
    const grossWeightLbs = truckWeightLbs + pupWeightLbs;

    console.log('Weight Entry:', {
      truck_weight: truckWeightLbs,
      pup_weight: pupWeightLbs,
      gross_weight_calculated: grossWeightLbs,
      gross_weight_from_frontend: gross_weight
    });

    // Get product info
    const prodResult = await db.query(
      'SELECT price_per_ton, product_name FROM products WHERE product_id = $1', 
      [product_id]
    );
    if (prodResult.rows.length === 0) return res.status(404).json({ error: 'Product not found' });
    const productPrice = prodResult.rows[0].price_per_ton;
    const productName = prodResult.rows[0].product_name;

    // Get truck tare
    const truckResult = await db.query('SELECT tare_weight FROM trucks WHERE truck_id = $1', [truck_id]);
    if (truckResult.rows.length === 0) return res.status(404).json({ error: 'Truck not found' });
    const truckTare = parseFloat(truckResult.rows[0].tare_weight) || 0;

    // Get trailer tare
    let trailerTare = 0;
    if (trailer_id) {
      const trailerResult = await db.query('SELECT tare_weight FROM trailers WHERE trailer_id = $1', [trailer_id]);
      if (trailerResult.rows.length > 0) {
        trailerTare = parseFloat(trailerResult.rows[0].tare_weight) || 0;
      }
    }

    // ✅ STEP 2: Calculate tare (with manual override option)
    const totalTare = (manual_tare_override && manual_tare_override > 0) ? 
                      parseFloat(manual_tare_override) : 
                      parseFloat(truckTare) + parseFloat(trailerTare);
    
    // ✅ STEP 3: Calculate net weight
    const netWeightLbs = grossWeightLbs - totalTare;
    const netWeightTons = parseFloat((netWeightLbs / 2000).toFixed(2));

    // ✅ STEP 4: Calculate material cost (with Pickup Load special handling)
    const isPickupLoad = (productName === 'Pickup Load');
    const materialCost = isPickupLoad ? 
                        parseFloat(productPrice.toFixed(2)) : 
                        parseFloat((netWeightTons * productPrice).toFixed(2));

    // ✅ STEP 5: Calculate delivery charge (PASS TONS for location-based!)
    const deliveryCharge = (delivery_method && delivery_input_value) 
      ? await calculateDeliveryCharge(delivery_method, delivery_input_value, netWeightTons) 
      : 0;

    // ✅ STEP 6: Calculate tax
    const taxRate = await getTaxRate(customer_id);
    const subtotal = parseFloat((materialCost + deliveryCharge).toFixed(2));
    const taxAmount = parseFloat((subtotal * (taxRate / 100)).toFixed(2));
    
    // ✅ STEP 7: Calculate total
    const total = parseFloat((subtotal + taxAmount + (parseFloat(cc_fee) || 0)).toFixed(2));

    // ✅ STEP 8: Generate ticket number
    const ticketNumber = await getNextTicketNumber();

    // Handle WSDOT ticket data
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

    // ✅ STEP 9: Insert ticket with split weight fields
    const query = `
      INSERT INTO tickets (
        ticket_number, date_time, customer_id, product_id, truck_id, trailer_id,
        job_name, delivered_by, delivery_unit, delivery_location,
        truck_weight, pup_weight, gross_weight, tare_weight, net_weight, net_tons,
        delivery_charge, delivery_method, delivery_input_value,
        subtotal, tax_rate, tax_amount, cc_fee, total,
        is_wsdot_ticket, dot_code, contract_number, job_number, mix_id, phase_code,
        phase_description, dispatch_number, purchase_order_number, weighmaster,
        loads_today, quantity_shipped_today, comments
      ) VALUES (
        $1, NOW(), $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15,
        $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, $29,
        $30, $31, $32, $33, $34, $35, $36
      ) RETURNING *
    `;

    const values = [
      ticketNumber, customer_id, product_id, truck_id, trailer_id || null,
      job_name || null, delivered_by || null, delivery_unit || null, delivery_location || null,
      truckWeightLbs, pupWeightLbs, grossWeightLbs, totalTare, netWeightLbs, netWeightTons,
      deliveryCharge, delivery_method || null, delivery_input_value || null,
      subtotal, taxRate, taxAmount, parseFloat(cc_fee) || 0, total,
      is_wsdot_ticket || false, dot_code || null, contract_number || null, job_number || null,
      mix_id || null, phase_code || null, phase_description || null, dispatch_number || null,
      purchase_order_number || null, weighmaster || null, loadsToday, quantityShippedToday,
      comments || null
    ];

    const result = await db.query(query, values);
    const createdTicket = result.rows[0];

    // Push to HaulHub if integration is enabled and this is a WSDOT ticket
    let haulhubResult = null;
    if (is_wsdot_ticket && haulhubService.isEnabled()) {
      haulhubResult = await pushTicketToHaulHub(createdTicket);

      // Re-fetch the ticket to include haulhub fields in the response
      const refreshed = await db.query('SELECT * FROM tickets WHERE ticket_id = $1', [createdTicket.ticket_id]);
      if (refreshed.rows.length > 0) {
        return res.status(201).json({
          ...refreshed.rows[0],
          haulhub_push: {
            attempted: true,
            status_code: haulhubResult.statusCode,
            success: haulhubResult.statusCode === 201 || haulhubResult.statusCode === 200,
          },
        });
      }
    }

    res.status(201).json(createdTicket);
  } catch (error) {
    console.error('Error creating ticket:', error);
    res.status(500).json({ error: error.message });
  }
};

// ============================================================================
// UPDATE TICKET - Updated to handle split weight entry
// ============================================================================
exports.updateTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      customer_id, product_id, truck_id, trailer_id,
      truck_weight,      // ✅ NEW: User enters truck weight
      pup_weight,        // ✅ NEW: User enters pup/trailer weight
      gross_weight,      // ✅ Should be truck_weight + pup_weight
      job_name, delivered_by, delivery_unit, delivery_location,
      delivery_method, delivery_input_value, cc_fee,
      is_wsdot_ticket, dot_code, contract_number, job_number, mix_id,
      phase_code, phase_description, dispatch_number, purchase_order_number,
      weighmaster, comments,
      manual_tare_override
    } = req.body;

    // Verify ticket exists
    const existing = await db.query('SELECT * FROM tickets WHERE ticket_id = $1', [id]);
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Ticket not found' });

    const ticket = existing.rows[0];
    const effectiveCustomerId = customer_id || ticket.customer_id;
    const effectiveProductId = product_id || ticket.product_id;
    const effectiveTruckId = truck_id || ticket.truck_id;
    const effectiveTrailerId = trailer_id !== undefined ? trailer_id : ticket.trailer_id;

    // ✅ Calculate gross from split weights (use provided values or existing)
    const truckWeightLbs = truck_weight !== undefined ? parseFloat(truck_weight) : parseFloat(ticket.truck_weight);
    const pupWeightLbs = pup_weight !== undefined ? parseFloat(pup_weight) : parseFloat(ticket.pup_weight);
    const grossWeightLbs = truckWeightLbs + pupWeightLbs;

    // Get product info
    const prodResult = await db.query(
      'SELECT price_per_ton, product_name FROM products WHERE product_id = $1',
      [effectiveProductId]
    );
    if (prodResult.rows.length === 0) return res.status(404).json({ error: 'Product not found' });
    const productPrice = prodResult.rows[0].price_per_ton;
    const productName = prodResult.rows[0].product_name;

    // Get truck tare
    const truckResult = await db.query('SELECT tare_weight FROM trucks WHERE truck_id = $1', [effectiveTruckId]);
    if (truckResult.rows.length === 0) return res.status(404).json({ error: 'Truck not found' });
    const truckTare = parseFloat(truckResult.rows[0].tare_weight) || 0;

    // Get trailer tare
    let trailerTare = 0;
    if (effectiveTrailerId) {
      const trailerResult = await db.query('SELECT tare_weight FROM trailers WHERE trailer_id = $1', [effectiveTrailerId]);
      if (trailerResult.rows.length > 0) {
        trailerTare = parseFloat(trailerResult.rows[0].tare_weight) || 0;
      }
    }

    // Calculate tare (with manual override)
    const totalTare = (manual_tare_override && manual_tare_override > 0) ?
                      parseFloat(manual_tare_override) :
                      truckTare + trailerTare;

    // Calculate net weight
    const netWeightLbs = grossWeightLbs - totalTare;
    const netWeightTons = parseFloat((netWeightLbs / 2000).toFixed(2));

    // Calculate material cost (with Pickup Load special handling)
    const isPickupLoad = (productName === 'Pickup Load');
    const materialCost = isPickupLoad ?
                        parseFloat(productPrice.toFixed(2)) :
                        parseFloat((netWeightTons * productPrice).toFixed(2));

    // Calculate delivery charge (PASS TONS for location-based!)
    const effectiveDeliveryMethod = delivery_method !== undefined ? delivery_method : ticket.delivery_method;
    const effectiveDeliveryInputValue = delivery_input_value !== undefined ? delivery_input_value : ticket.delivery_input_value;
    const deliveryCharge = (effectiveDeliveryMethod && effectiveDeliveryInputValue)
      ? await calculateDeliveryCharge(effectiveDeliveryMethod, effectiveDeliveryInputValue, netWeightTons)
      : 0;

    // Calculate tax
    const taxRate = await getTaxRate(effectiveCustomerId);
    const subtotal = parseFloat((materialCost + deliveryCharge).toFixed(2));
    const taxAmount = parseFloat((subtotal * (taxRate / 100)).toFixed(2));

    // Calculate total
    const effectiveCcFee = cc_fee !== undefined ? parseFloat(cc_fee) || 0 : parseFloat(ticket.cc_fee) || 0;
    const total = parseFloat((subtotal + taxAmount + effectiveCcFee).toFixed(2));

    // Update ticket
    const query = `
      UPDATE tickets SET
        customer_id = $2, product_id = $3, truck_id = $4, trailer_id = $5,
        truck_weight = $6, pup_weight = $7, gross_weight = $8,
        tare_weight = $9, net_weight = $10, net_tons = $11,
        delivery_charge = $12, delivery_method = $13, delivery_input_value = $14,
        subtotal = $15, tax_rate = $16, tax_amount = $17, cc_fee = $18, total = $19,
        job_name = $20, delivered_by = $21, delivery_unit = $22, delivery_location = $23,
        is_wsdot_ticket = $24, dot_code = $25, contract_number = $26, job_number = $27,
        mix_id = $28, phase_code = $29, phase_description = $30, dispatch_number = $31,
        purchase_order_number = $32, weighmaster = $33, comments = $34
      WHERE ticket_id = $1 RETURNING *
    `;

    const values = [
      id,
      effectiveCustomerId, effectiveProductId, effectiveTruckId, effectiveTrailerId || null,
      truckWeightLbs, pupWeightLbs, grossWeightLbs,
      totalTare, netWeightLbs, netWeightTons,
      deliveryCharge, effectiveDeliveryMethod || null, effectiveDeliveryInputValue || null,
      subtotal, taxRate, taxAmount, effectiveCcFee, total,
      job_name !== undefined ? job_name : ticket.job_name,
      delivered_by !== undefined ? delivered_by : ticket.delivered_by,
      delivery_unit !== undefined ? delivery_unit : ticket.delivery_unit,
      delivery_location !== undefined ? delivery_location : ticket.delivery_location,
      is_wsdot_ticket !== undefined ? is_wsdot_ticket : ticket.is_wsdot_ticket,
      dot_code !== undefined ? dot_code : ticket.dot_code,
      contract_number !== undefined ? contract_number : ticket.contract_number,
      job_number !== undefined ? job_number : ticket.job_number,
      mix_id !== undefined ? mix_id : ticket.mix_id,
      phase_code !== undefined ? phase_code : ticket.phase_code,
      phase_description !== undefined ? phase_description : ticket.phase_description,
      dispatch_number !== undefined ? dispatch_number : ticket.dispatch_number,
      purchase_order_number !== undefined ? purchase_order_number : ticket.purchase_order_number,
      weighmaster !== undefined ? weighmaster : ticket.weighmaster,
      comments !== undefined ? comments : ticket.comments
    ];

    const result = await db.query(query, values);
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error updating ticket:', error);
    res.status(500).json({ error: error.message });
  }
};

// ============================================================================
// Other exports (getAll, getById, delete, etc.)
// ============================================================================
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

    if (!haulhubService.isEnabled()) {
      return res.status(400).json({ error: 'HaulHub integration is not enabled. Set HAULHUB_ENABLED=true and provide a valid HAULHUB_API_TOKEN.' });
    }

    const ticketQuery = `SELECT t.* FROM tickets t WHERE t.ticket_id = $1 AND t.is_wsdot_ticket = TRUE`;
    const ticketResult = await db.query(ticketQuery, [id]);
    if (ticketResult.rows.length === 0) {
      return res.status(404).json({ error: 'WSDOT ticket not found' });
    }

    const ticket = ticketResult.rows[0];
    const response = await pushTicketToHaulHub(ticket);

    // Re-fetch to get the updated haulhub fields
    const refreshed = await db.query('SELECT * FROM tickets WHERE ticket_id = $1', [id]);

    res.json({
      message: response.statusCode === 201 ? 'Ticket submitted to HaulHub' : 'HaulHub responded',
      haulhub_status: response.statusCode,
      haulhub_response: response.body,
      ticket: refreshed.rows[0],
    });
  } catch (error) {
    console.error('Error pushing to HaulHub:', error);
    res.status(500).json({ error: error.message });
  }
};
