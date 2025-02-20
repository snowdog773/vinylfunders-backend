const { CheckoutSession, PaymentIntent } = require("../schemas/schemas");

async function exportCsv(projectId) {
  try {
    const { mkConfig, generateCsv } = await import("export-to-csv");

    // First await the payment intents
    const paymentIntents = await PaymentIntent.find({
      projectId: projectId,
      isFunder: true,
      status: "succeeded",
    });

    // Use Promise.all to wait for all checkout sessions to be fetched
    const salesArray = await Promise.all(
      paymentIntents.map(async (e) => {
        const checkoutSession = await CheckoutSession.findOne({
          paymentIntentId: e.paymentIntentId,
        });

        const {
          name,
          address: { city, country, line1, line2, postal_code, state },
        } = checkoutSession.collectedInformation.shipping_details;

        return {
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
        };
      })
    );

    const csvConfig = mkConfig({ useKeysAsHeaders: true });
    const csv = generateCsv(csvConfig)(salesArray);
    return csv;
  } catch (error) {
    console.error("Error exporting CSV:", error);
    throw error;
  }
}

module.exports = exportCsv;
