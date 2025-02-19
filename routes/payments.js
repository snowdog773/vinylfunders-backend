const express = require("express");
const app = express.Router();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const { Payment, WebhookLog } = require("../schemas/schemas");

//THIS FILE IS FOR PAYMENTS INVOLVING SETTING UP PROJECTS - FOR FUND SPONSORS LOOK FOR funders.js
//USE TO INITIALIZE A PAYMENT SESSION IN THE FRONT END
app.post("/create-checkout-session", async (req, res) => {
  try {
    const { priceId, tempProjectId, target } = req.body;
    console.log(priceId, tempProjectId, target);
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "payment",
      payment_intent_data: {
        metadata: {
          tempProjectId,
          target,
          isFunder: false,
        },
      },

      success_url: `${process.env.FRONTEND_URL}/processingPayment?tempProjectId=${tempProjectId}&target=${target}`,
      cancel_url: `${process.env.FRONTEND_URL}/paymentFailed`,
    });

    res.json({ id: session.id });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: error.message });
  }
});

// CHECK PAYMENTS TABLE OF DB TO CONFIRM PAYMENT SUCCESSFUL
app.get("/check-payment/:tempProjectId", async (req, res) => {
  try {
    const { tempProjectId } = req.params;
    const payment = await Payment.findOne({
      tempProjectId,
      status: "succeeded",
    });

    if (!payment) {
      res.status(404).json({ error: "Payment not found" });
      return;
    } else {
      res.status(200).json({
        tempProjectId,
        status: "paid",
        amount: payment.amount,
        currency: payment.currency,
        paymentMethod: payment.paymentMethod,
        receiptUrl: payment.receiptUrl, // Helpful for users
        createdAt: payment.createdAt,
      });
    }
  } catch (error) {
    console.error("Error checking payment:", error);
    res.status(500).json({ error: "Internal sever error" });
  }
});

//STRIPE WEBHOOK ENDPOINT

app.post(
  "/webhook",
  // express.raw({ type: "application/json" }), //middleware to parse raw request body
  async (req, res) => {
    try {
      const sig = req.headers["stripe-signature"];

      let event;
      //Validate webhook and create event
      try {
        event = stripe.webhooks.constructEvent(
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

        // Process different event types
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
                  amount: data.object.amount_total,
                  currency: data.object.currency,
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
        res.json({ received: true });
      } catch (err) {
        res.status(400).send(`Webhook Error: ${err.message}`);
      }
    } catch (error) {
      console.error("Error processing webhook:", error);
      res.status(500).json({ error: "Internal server error", error });
      console.log("status 500 error", error);
    }
  }
);

//need to capture checkout session created, payment intent succeeded, payment intent failed, payment intent canceled?, charge refunded, dispute created

app.get("/stripeRecords", async (req, res) => {
  const records = await PaymentWebhookRecord.find();

  const formattedRecords = records.map((record) => ({
    paymentId: record.paymentId || "none",
    type: record.type,
    tempProjectId: record.tempProjectId || "none",
    data: JSON.parse(record.rawData),
    status: record.status,
    amount: record.amount,
    currency: record.currency,
    customerEmail: record.customerEmail,
    paymentMethod: record.paymentMethod,
    date: record.date,
  }));
  res.status(200).json(formattedRecords);
});

module.exports = app;
