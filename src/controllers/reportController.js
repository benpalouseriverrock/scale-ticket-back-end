const db = require('../config/database');

/**
 * GET /api/reports/monthly?year=2025&month=3
 * Returns summary + line-item breakdown for a given month.
 */
const getMonthlyReport = async (req, res) => {
  const year = parseInt(req.query.year) || new Date().getFullYear();
  const month = parseInt(req.query.month) || new Date().getMonth() + 1;

  if (month < 1 || month > 12) {
    return res.status(400).json({ error: 'month must be 1–12' });
  }

  try {
    // Summary totals for the month
    const summaryQuery = `
      SELECT
        COUNT(*)::int                       AS ticket_count,
        COALESCE(SUM(net_tons), 0)::numeric AS total_tons,
        COALESCE(SUM(total), 0)::numeric    AS total_revenue
      FROM tickets
      WHERE EXTRACT(YEAR  FROM date_time) = $1
        AND EXTRACT(MONTH FROM date_time) = $2
    `;
    const summaryResult = await db.query(summaryQuery, [year, month]);
    const summary = summaryResult.rows[0];

    // Per-customer breakdown
    const customerQuery = `
      SELECT
        COALESCE(c.name, t.manual_customer_name, 'Unknown') AS customer_name,
        COUNT(*)::int                          AS ticket_count,
        COALESCE(SUM(t.net_tons), 0)::numeric  AS total_tons,
        COALESCE(SUM(t.total), 0)::numeric     AS total_revenue
      FROM tickets t
      LEFT JOIN customers c ON c.customer_id = t.customer_id
      WHERE EXTRACT(YEAR  FROM t.date_time) = $1
        AND EXTRACT(MONTH FROM t.date_time) = $2
      GROUP BY customer_name
      ORDER BY total_revenue DESC
    `;
    const customerResult = await db.query(customerQuery, [year, month]);

    // Per-product breakdown
    const productQuery = `
      SELECT
        p.product_name                         AS product_name,
        COUNT(*)::int                          AS ticket_count,
        COALESCE(SUM(t.net_tons), 0)::numeric  AS total_tons,
        COALESCE(SUM(t.total), 0)::numeric     AS total_revenue
      FROM tickets t
      JOIN products p ON p.product_id = t.product_id
      WHERE EXTRACT(YEAR  FROM t.date_time) = $1
        AND EXTRACT(MONTH FROM t.date_time) = $2
      GROUP BY p.product_name
      ORDER BY total_tons DESC
    `;
    const productResult = await db.query(productQuery, [year, month]);

    // Daily breakdown
    const dailyQuery = `
      SELECT
        EXTRACT(DAY FROM date_time)::int        AS day,
        COUNT(*)::int                           AS ticket_count,
        COALESCE(SUM(net_tons), 0)::numeric     AS total_tons,
        COALESCE(SUM(total), 0)::numeric        AS total_revenue
      FROM tickets
      WHERE EXTRACT(YEAR  FROM date_time) = $1
        AND EXTRACT(MONTH FROM date_time) = $2
      GROUP BY day
      ORDER BY day
    `;
    const dailyResult = await db.query(dailyQuery, [year, month]);

    res.json({
      year,
      month,
      summary: {
        ticket_count: summary.ticket_count,
        total_tons: parseFloat(summary.total_tons),
        total_revenue: parseFloat(summary.total_revenue)
      },
      by_customer: customerResult.rows.map(r => ({
        customer_name: r.customer_name,
        ticket_count: r.ticket_count,
        total_tons: parseFloat(r.total_tons),
        total_revenue: parseFloat(r.total_revenue)
      })),
      by_product: productResult.rows.map(r => ({
        product_name: r.product_name,
        ticket_count: r.ticket_count,
        total_tons: parseFloat(r.total_tons),
        total_revenue: parseFloat(r.total_revenue)
      })),
      daily: dailyResult.rows.map(r => ({
        day: r.day,
        ticket_count: r.ticket_count,
        total_tons: parseFloat(r.total_tons),
        total_revenue: parseFloat(r.total_revenue)
      }))
    });
  } catch (err) {
    console.error('Monthly report error:', err);
    res.status(500).json({ error: 'Failed to generate report' });
  }
};

/**
 * GET /api/reports/available-months
 * Returns list of year/month combos that have tickets.
 */
const getAvailableMonths = async (req, res) => {
  try {
    const result = await db.query(`
      SELECT DISTINCT
        EXTRACT(YEAR  FROM date_time)::int AS year,
        EXTRACT(MONTH FROM date_time)::int AS month
      FROM tickets
      ORDER BY year DESC, month DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Available months error:', err);
    res.status(500).json({ error: 'Failed to fetch available months' });
  }
};

module.exports = { getMonthlyReport, getAvailableMonths };
