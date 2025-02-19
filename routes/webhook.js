const express = require("express");
const router = express.Router();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const { Payment, WebhookLog } = require("../schemas/schemas");

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

      const { id, type, data } = event;

      // Check if this webhook event is already logged (to prevent duplicates)
      const existingLog = await WebhookLog.findOne({ eventId: id });
      if (existingLog) {
        console.log(`Duplicate webhook received: ${id}`);
        return res.status(200).json({ received: true });
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
          const existingPayment = await Payment.findOne({
            paymentIntentId: data.object.payment_intent,
          });

          if (existingPayment) {
            await Payment.findOneAndUpdate(
              { paymentIntentId: data.object.payment_intent },
              {
                stripeSessionId: data.object.id,
                customerDetails: data.object.customer_details,
                amount: data.object.amount_total,
                currency: data.object.currency,
                metadata: data.object.metadata,
                updatedAt: new Date(),
              }
            );
          } else {
            await Payment.create({
              stripeSessionId: data.object.id,
              paymentIntentId: data.object.payment_intent,
              customerDetails: data.object.customer_details,
              amount: data.object.amount_total,
              currency: data.object.currency,
              status: "pending",
              metadata: data.object.metadata,
              createdAt: new Date(data.object.created * 1000),
            });
          }
          break;

        case "payment_intent.succeeded":
          const payment = await Payment.findOne({
            paymentIntentId: data.object.id,
          });

          if (payment) {
            await Payment.findOneAndUpdate(
              { paymentIntentId: data.object.id },
              {
                status: "succeeded",
                paymentMethod: data.object.payment_method_types[0],
                metadata: data.object.metadata,
                tempProjectId: data.object.metadata.tempProjectId,
                isFunder: data.object.metadata.isFunder,
                updatedAt: new Date(),
              }
            );
          } else {
            await Payment.create({
              paymentIntentId: data.object.id,
              status: "succeeded",
              amount: data.object.amount,
              currency: data.object.currency,
              paymentMethod: data.object.payment_method_types[0],
              metadata: data.object.metadata,
              tempProjectId: data.object.metadata.tempProjectId,
              isFunder: data.object.metadata.isFunder,
              createdAt: new Date(),
            });
          }
          break;

        case "payment_intent.payment_failed":
          await Payment.findOneAndUpdate(
            { paymentIntentId: data.object.id },
            { status: "failed", updatedAt: new Date() }
          );
          break;

        case "charge.refunded":
          await Payment.findOneAndUpdate(
            { paymentIntentId: data.object.payment_intent },
            { status: "refunded", updatedAt: new Date() }
          );
          break;

        default:
          console.log(`Unhandled event type: ${type}`);
      }
      res.status(200).json({ received: true });
    } catch (err) {
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }
  }
);

module.exports = router;
