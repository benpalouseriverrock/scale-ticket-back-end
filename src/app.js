const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();

const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:4200')
  .split(',')
  .map(o => o.trim());

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: origin ${origin} not allowed`));
    }
  }
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/health', (req, res) => {
  res.json({ status: 'API running', timestamp: new Date().toISOString() });
});

app.use('/api/tickets', require('./routes/tickets'));
app.use('/api/customers', require('./routes/customers'));
app.use('/api/products', require('./routes/products'));
app.use('/api/trucks', require('./routes/trucks'));
app.use('/api/trailers', require('./routes/trailers'));
app.use('/api/suppliers', require('./routes/suppliers'));
app.use('/api/tax-rates', require('./routes/taxRates'));
app.use('/api/delivery-rates', require('./routes/deliveryRates'));
app.use('/api/wsdot-projects', require('./routes/wsdotProjects'));

app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Scale Ticket API running on port ${PORT}`);
  console.log(`📍 Database: ${process.env.DB_NAME || 'scale_tickets'}`);
  console.log(`🌐 CORS: ${allowedOrigins.join(', ')}`);
});

module.exports = app;
