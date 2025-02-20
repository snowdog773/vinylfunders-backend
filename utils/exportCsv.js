const { CheckoutSession, PaymentIntent } = require("../schemas/schemas");

async function exportCsv(projectId) {
  try {
    const { mkConfig, generateCsv } = await import("export-to-csv");

    const paymentIntents = await PaymentIntent.find({
      projectId: projectId,
      isFunder: true,
      status: "succeeded",
    });
    console.log("Payment Intents found:", paymentIntents.length);

    const salesArray = await Promise.all(
      paymentIntents.map(async (e) => {
        const checkoutSession = await CheckoutSession.findOne({
          paymentIntentId: e.paymentIntentId,
        });
        console.log("Checkout Session found:", checkoutSession?._id);

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
    console.log("Sales Array built:", salesArray.length);
    console.log("First sale item:", salesArray[0]);

    const csvConfig = mkConfig({
      useKeysAsHeaders: true,
      fieldSeparator: ",",
      decimalSeparator: ".",
      showTitle: false,
      useBom: true,
    });

    const csv = generateCsv(csvConfig)(salesArray);
    console.log("CSV generated length:", csv.length);
    return csv;
  } catch (error) {
    console.error("Error exporting CSV:", error);
    throw error;
  }
}

module.exports = exportCsv;
