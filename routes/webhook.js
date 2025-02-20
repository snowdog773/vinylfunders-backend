const express = require("express");
const router = express.Router();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const {
  PaymentIntent,
  CheckoutSession,
  WebhookLog,
} = require("../schemas/schemas");

router.post(
  "/",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    try {
      const sig = req.headers["stripe-signature"];

      let event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_ENDPOINT_SECRET
      );
      res.status(200).json({ received: true }); //return quickly to avoid resends
      const { id, type, data } = event;
      try {
        //   Check if this webhook event is already logged (to prevent duplicates)
        const existingLog = await WebhookLog.findOne({ eventId: id });
        if (existingLog) {
          console.log(`Duplicate webhook received: ${id}`);
          return;
        }

        // Store the raw webhook data
        await WebhookLog.create({
          eventId: id,
          type: type,
          payload: data.object,
        });

        console.log(`Webhook logged: ${id} - ${type}`);

        switch (type) {
          case "checkout.session.completed":
            await CheckoutSession.create({
              stripeSessionId: data.object.id,
              paymentIntentId: data.object.payment_intent,
              customerDetails: data.object.customer_details,
              collectedInformation: data.object.collected_information,
              amount: data.object.amount_total,
              currency: data.object.currency,
              paymentMethod: data.object.payment_method_types[0],
              createdAt: new Date(data.object.created * 1000),
            });

            break;

          case "payment_intent.succeeded":
            await PaymentIntent.create({
              paymentIntentId: data.object.id,
              amount: data.object.amount,
              currency: data.object.currency,
              paymentMethod: data.object.payment_method_types[0],
              metadata: data.object.metadata,
              tempProjectId: data.object.metadata.tempProjectId,
              isFunder: data.object.metadata.isFunder,
              projectId: data.object.metadata.projectId,
              projectTitle: data.object.metadata.projectTitle,
              artistId: data.object.metadata.artist,
              paymentRef: data.object.metadata.paymentRef,
              status: "succeeded",
              createdAt: new Date(),
            });

            break;

          case "payment_intent.payment_failed":
            await PaymentIntent.findOneAndUpdate(
              { paymentIntentId: data.object.id },
              { status: "failed", updatedAt: new Date() }
            );
            break;

          case "charge.refunded":
            await PaymentIntent.findOneAndUpdate(
              { paymentIntentId: data.object.payment_intent },
              { status: "refunded", updatedAt: new Date() }
            );
            break;

          default:
            console.log(`Unhandled event type: ${type}`);
        }
      } catch (processingError) {
        console.error("Error processing webhook:", processingError);
      }
    } catch (err) {
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }
  }
);

module.exports = router;
