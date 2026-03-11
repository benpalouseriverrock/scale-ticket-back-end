const https = require('https');
const http = require('http');
const { URL } = require('url');

const HAULHUB_ENABLED = process.env.HAULHUB_ENABLED === 'true';
const HAULHUB_API_TOKEN = process.env.HAULHUB_API_TOKEN;
const HAULHUB_API_ENDPOINT = process.env.HAULHUB_API_ENDPOINT || 'https://app.haulhub.com/integrations/api/v1/tickets';

/**
 * Build the HaulHub Aggregate/Asphalt ticket payload from local ticket + related data.
 */
function buildHaulHubPayload(ticket, customer, product, supplier, truck) {
  const now = new Date().toISOString();
  const ticketTimestamp = ticket.date_time
    ? new Date(ticket.date_time).toISOString()
    : now;

  const grossLbs = parseFloat(ticket.gross_weight) || 0;
  const tareLbs = parseFloat(ticket.tare_weight) || 0;
  const netLbs = parseFloat(ticket.net_weight) || 0;
  const netTons = parseFloat(ticket.net_tons) || 0;
  const grossTons = parseFloat((grossLbs / 2000).toFixed(2));
  const tareTons = parseFloat((tareLbs / 2000).toFixed(2));

  return {
    tickets: [
      {
        slip_number: String(ticket.ticket_number),
        dot_code: ticket.dot_code || '',
        dispatched_at: ticketTimestamp,
        last_updated: ticketTimestamp,
        timestamp: ticketTimestamp,
        source_timestamp: now,
        timezone: process.env.HAULHUB_TIMEZONE || 'America/Los_Angeles',

        // Weights in tons
        gross_amount: grossTons,
        tare_amount: tareTons,
        net_amount: netTons,
        quantity_uom_code: 'ton',

        // Weights in lbs
        gross2_amount: grossLbs,
        tare2_amount: tareLbs,
        net2_amount: netLbs,
        uom2: 'lbs',

        // Customer info
        client_id: String(ticket.customer_id),
        client_name: customer.name || '',
        customer_name: customer.name || '',
        customer_address: customer.address_primary || customer.customer_address || '',
        customer_city: customer.customer_city || '',
        customer_state: customer.customer_state || '',
        customer_zipcode: customer.customer_zipcode || '',
        customer_phone: customer.phone || '',

        // Job / contract info
        comments: ticket.comments || '',
        contract_number: ticket.contract_number || '',
        job: ticket.job_name || ticket.job_number || '',
        job_number: ticket.job_number || '',
        dispatch_number: ticket.dispatch_number || '',
        purchase_order_number: ticket.purchase_order_number || '',

        // Material info
        line_item_description: product.product_name || '',
        line_item_quantity: netTons,
        material_category: product.material_category || '',
        material_number: product.product_code || String(product.product_id),
        mix_id: ticket.mix_id || product.mix_id || '',
        product_code: product.product_code || String(product.product_id),
        phase_code: ticket.phase_code || '',
        phase_description: ticket.phase_description || '',

        // Daily totals
        loads_today: ticket.loads_today || 1,
        quantity_shipped_today: parseFloat(ticket.quantity_shipped_today) || netTons,
        tonnage: netTons,

        // Supplier / plant info (from env config)
        supplier: process.env.HAULHUB_SUPPLIER_NAME || supplier.supplier_name || '',
        plant_id: process.env.HAULHUB_PLANT_ID || String(supplier.supplier_id || '1'),
        plant_name: process.env.HAULHUB_PLANT_NAME || supplier.plant_name || '',
        plant_alias: process.env.HAULHUB_PLANT_ALIAS || supplier.plant_name || '',
        plant_address: process.env.HAULHUB_PLANT_ADDRESS || '',
        plant_city: process.env.HAULHUB_PLANT_CITY || '',
        plant_state: process.env.HAULHUB_PLANT_STATE || '',
        plant_zipcode: process.env.HAULHUB_PLANT_ZIPCODE || '',
        plant_latitude: parseFloat(process.env.HAULHUB_PLANT_LATITUDE) || 0,
        plant_longitude: parseFloat(process.env.HAULHUB_PLANT_LONGITUDE) || 0,
        plant_portable: process.env.HAULHUB_PLANT_PORTABLE === 'true',
        plant_dayphone: process.env.HAULHUB_PLANT_DAYPHONE || '',

        // Truck / fleet info
        fleet_id: process.env.HAULHUB_FLEET_ID || '1',
        truck_id: truck ? String(truck.unit_number) : String(ticket.truck_id),
        truck_name: truck ? truck.unit_number : String(ticket.truck_id),

        // Status flags
        void: false,
        return_slip_flag: false,
        original_slip_number: '',
        weighmaster: ticket.weighmaster || '',
      },
    ],
  };
}

/**
 * POST the payload to HaulHub's ticket ingest endpoint.
 * Returns { statusCode, body } on success or throws on network error.
 */
function postToHaulHub(payload) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify(payload);
    const parsed = new URL(HAULHUB_API_ENDPOINT);
    const transport = parsed.protocol === 'https:' ? https : http;

    const options = {
      hostname: parsed.hostname,
      port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      path: parsed.pathname + parsed.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-hh-api-token': HAULHUB_API_TOKEN,
        'Content-Length': Buffer.byteLength(body),
      },
    };

    const req = transport.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        let parsed;
        try {
          parsed = JSON.parse(data);
        } catch {
          parsed = { raw: data };
        }
        resolve({ statusCode: res.statusCode, body: parsed });
      });
    });

    req.on('error', (err) => reject(err));
    req.setTimeout(30000, () => {
      req.destroy();
      reject(new Error('HaulHub API request timed out'));
    });
    req.write(body);
    req.end();
  });
}

/**
 * Check whether HaulHub integration is enabled.
 */
function isEnabled() {
  return HAULHUB_ENABLED && !!HAULHUB_API_TOKEN && HAULHUB_API_TOKEN !== 'your_api_token_here';
}

module.exports = {
  isEnabled,
  buildHaulHubPayload,
  postToHaulHub,
};
