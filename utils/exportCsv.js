const { CheckoutSession, PaymentIntent } = require("../schemas/schemas");

async function exportCsv(projectId) {
  try {
    const { mkConfig, generateCsv } = await import("export-to-csv");

    const paymentIntents = await PaymentIntent.find({
      projectId: projectId,
      isFunder: true,
      status: "succeeded", // avoid sending failed payments
    });

    const salesArray = [];

    for (const e of paymentIntents) {
      const checkoutSession = await CheckoutSession.findOne({
        paymentIntentId: e.paymentIntentId,
      });

      const {
        name,
        address: { city, country, line1, line2, postal_code, state },
      } = checkoutSession.collectedInformation.shipping_details;

      salesArray.push({
        name,
        line1,
        line2,
        city,
        state,
        country,
        postal_code,
        email: checkoutSession.customerDetails.email,
        amount: e.amount,
        currency: e.currency,
        paymentMethod: e.paymentMethod,
        paymentIntentId: e.paymentIntentId,
      });
    }

    const csvConfig = mkConfig({ useKeysAsHeaders: true });
    const csv = generateCsv(csvConfig)(salesArray);
    return csv; // Return CSV string
  } catch (error) {
    console.error("Error exporting CSV:", error);
    throw error;
  }
}

module.exports = exportCsv;
