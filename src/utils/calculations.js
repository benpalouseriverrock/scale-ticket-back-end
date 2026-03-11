// src/utils/calculations.js

/**
 * Calculate net weight in pounds
 * @param {number} truckGross - Truck gross weight in lbs
 * @param {number} truckTare - Truck tare weight in lbs
 * @param {number} trailerGross - Trailer gross weight in lbs (optional)
 * @param {number} trailerTare - Trailer tare weight in lbs (optional)
 * @returns {number} Total net weight in lbs
 */
function calculateNetWeightLbs(truckGross, truckTare, trailerGross = 0, trailerTare = 0) {
  return (truckGross - truckTare) + (trailerGross - trailerTare);
}

/**
 * Convert pounds to tons
 * @param {number} weightLbs - Weight in pounds
 * @returns {number} Weight in tons (rounded to 2 decimals)
 */
function convertToTons(weightLbs) {
  return Math.round((weightLbs / 2000) * 100) / 100;
}

/**
 * Calculate material cost (weight × price per ton)
 * @param {number} netWeightTons - Net weight in tons
 * @param {number} pricePerTon - Price per ton
 * @returns {number} Material total (rounded to 2 decimals)
 */
function calculateMaterialTotal(netWeightTons, pricePerTon) {
  return Math.round((netWeightTons * pricePerTon) * 100) / 100;
}

/**
 * Calculate freight based on location or mileage
 * @param {string} calculationType - 'location' or 'mileage'
 * @param {number} netWeightTons - Net weight in tons
 * @param {number} freightRatePerTon - Freight rate per ton
 * @param {number} tripMinimum - Minimum trip charge
 * @param {number} miles - Miles traveled (for mileage-based calculation)
 * @returns {number} Freight total (rounded to 2 decimals)
 */
function calculateFreight(calculationType, netWeightTons, freightRatePerTon, tripMinimum = 0, miles = null) {
  let freight = 0;

  if (calculationType === 'location') {
    // Location-based: tons × rate, minimum trip charge applies
    freight = netWeightTons * freightRatePerTon;
    freight = Math.max(freight, tripMinimum); // Ensure minimum
  } else if (calculationType === 'mileage' && miles) {
    // Mileage-based: adjust rate based on distance
    // This is a simplified calculation; Ben may need to refine
    freight = netWeightTons * freightRatePerTon;
    freight = Math.max(freight, tripMinimum);
  }

  return Math.round(freight * 100) / 100;
}

/**
 * Calculate subtotal (material + freight)
 * @param {number} materialTotal - Material cost
 * @param {number} freightTotal - Freight cost
 * @returns {number} Subtotal (rounded to 2 decimals)
 */
function calculateSubtotal(materialTotal, freightTotal) {
  return Math.round((materialTotal + freightTotal) * 100) / 100;
}

/**
 * Calculate tax
 * @param {number} subtotal - Subtotal before tax
 * @param {number} taxRate - Tax rate as decimal (e.g., 0.079 for 7.9%)
 * @returns {number} Tax total (rounded to 2 decimals)
 */
function calculateTax(subtotal, taxRate) {
  return Math.round((subtotal * taxRate) * 100) / 100;
}

/**
 * Calculate grand total
 * @param {number} subtotal - Subtotal before tax
 * @param {number} taxTotal - Tax amount
 * @returns {number} Grand total (rounded to 2 decimals)
 */
function calculateGrandTotal(subtotal, taxTotal) {
  return Math.round((subtotal + taxTotal) * 100) / 100;
}

/**
 * Complete ticket calculation
 * Takes raw inputs and returns complete calculated ticket
 * @param {object} ticketData - Ticket input data
 * @returns {object} Complete ticket with all calculations
 */
function calculateCompleteTicket(ticketData) {
  const {
    truckGrossWeight,
    truckTareWeight,
    trailerGrossWeight = 0,
    trailerTareWeight = 0,
    productPricePerTon,
    freightCalculationType,
    freightRatePerTon,
    tripMinimum,
    deliveryMiles,
    taxRate = 0.079 // Default WA 7.9%
  } = ticketData;

  // Calculate net weight
  const netWeightLbs = calculateNetWeightLbs(
    truckGrossWeight,
    truckTareWeight,
    trailerGrossWeight,
    trailerTareWeight
  );
  const netWeightTons = convertToTons(netWeightLbs);

  // Calculate material cost
  const materialTotal = calculateMaterialTotal(netWeightTons, productPricePerTon);

  // Calculate freight
  const freightTotal = calculateFreight(
    freightCalculationType,
    netWeightTons,
    freightRatePerTon,
    tripMinimum,
    deliveryMiles
  );

  // Calculate subtotal
  const subtotal = calculateSubtotal(materialTotal, freightTotal);

  // Calculate tax
  const taxTotal = calculateTax(subtotal, taxRate);

  // Calculate grand total
  const grandTotal = calculateGrandTotal(subtotal, taxTotal);

  return {
    netWeightLbs,
    netWeightTons,
    materialTotal,
    freightTotal,
    subtotal,
    taxTotal,
    grandTotal
  };
}

/**
 * Parse tax code to decimal rate
 * @param {string} taxCode - Tax code like "WA - 7.9%", "ID - 6%", "Exmpt - 0%"
 * @returns {number} Tax rate as decimal (e.g., 0.079)
 */
function parseTaxCodeToRate(taxCode) {
  if (!taxCode) return 0;
  
  const match = taxCode.match(/(\d+(?:\.\d+)?)/);
  if (match) {
    return parseFloat(match[1]) / 100;
  }
  return 0;
}

module.exports = {
  calculateNetWeightLbs,
  convertToTons,
  calculateMaterialTotal,
  calculateFreight,
  calculateSubtotal,
  calculateTax,
  calculateGrandTotal,
  calculateCompleteTicket,
  parseTaxCodeToRate
};
