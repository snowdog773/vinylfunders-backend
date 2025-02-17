const express = require("express");
const app = express.Router();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const { PaymentWebhookRecord } = require("../schemas/schemas");
const { date } = require("joi");
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
    const payment = await PaymentWebhookRecord.findOne({
      tempProjectId,
      type: "payment_intent.succeeded",
    });

    if (!payment) {
      res.status(404).json({ error: "Payment not found" });
      return;
    } else {
      res.status(200).json({ tempProjectId, status: "paid" });
    }
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: error.message });
  }
});

//STRIPE WEBHOOK ENDPOINT

app.post("/webhook", async (req, res) => {
  const sig = req.headers["stripe-signature"];

  const paymentIntent = req.body.data.object;

  if (req.body.type === "checkout.session.completed") {
    await PaymentWebhookRecord.create({
      paymentId: paymentIntent.payment_intent,
      checkoutSessionId: paymentIntent.id,
      status: paymentIntent.status,
      amount: paymentIntent.amount_total,
      currency: paymentIntent.currency,
      customerEmail: paymentIntent.customer_details.email,
      tempProjectId: paymentIntent.metadata.tempProjectId || "none",
      paymentMethod: paymentIntent.payment_method_types[0],
      rawData: JSON.stringify(req.body),
      type: req.body.type,
    });
  } else {
    await PaymentWebhookRecord.create({
      paymentId: paymentIntent.id,

      status: paymentIntent.status,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      customerEmail: "see checkout session",
      tempProjectId: paymentIntent.metadata.tempProjectId,
      paymentMethod: paymentIntent.payment_method_types[0],
      rawData: JSON.stringify(req.body),
      type: req.body.type,
    });
  }
  res.status(200).json({ received: true });
});

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
