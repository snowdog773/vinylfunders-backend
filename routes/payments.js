const express = require("express");
const app = express.Router();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const { PaymentIntent, CheckoutSession } = require("../schemas/schemas");

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
    const { paymentIntentId } = await PaymentIntent.findOne({
      tempProjectId,
      status: "succeeded",
    });
    const payment = await CheckoutSession.findOne({
      paymentIntentId,
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

        createdAt: payment.createdAt,
      });
    }
  } catch (error) {
    console.error("Error checking payment:", error);
    res.status(500).json({ error: "Internal sever error" });
  }
});

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
