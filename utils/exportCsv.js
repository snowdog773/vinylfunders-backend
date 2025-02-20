import { CheckoutSession, PaymentIntent } from "../schemas/schemas";

export async function exportCsv(projectId) {
  try {
    const paymentIntents = await PaymentIntent.find({
      projectId: projectId,
      isFunder: true,
    });
    const salesArray = [];
    paymentIntents.forEach(async (e) => {
      const checkoutSession = await CheckoutSession.findOne({
        paymentIntentId: e._id,
      });
      const {
        name,
        address: { city, country, line1, line2, postal_code, state },
      } = checkoutSession.collectedInformation.shipping_details;
      console.table({ name, line1, line2, city, state, country, postal_code });
    });
  } catch (error) {
    console.error("Error exporting CSV:", error);
  }
}
