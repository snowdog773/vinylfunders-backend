const express = require("express");
const app = express.Router();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

//THIS FILE IS FOR PAYMENTS INVOLVING TAKING PAYMENT FROM FUNDERS - FOR PROJECT SETUP PAYMENTS LOOK FOR payments.js
//USE TO INITIALIZE A PAYMENT SESSION IN THE FRONT END
app.post("/create-checkout-session", async (req, res) => {
  try {
    const { priceId, projectId, paymentRef } = req.body;

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
          projectId,
          paymentRef,
        },
      },
      shipping_address_collection: {
        allowed_countries: ["GB"],
      },
      success_url: `${process.env.FRONTEND_URL}/confirmFunder?paymentRef=${paymentRef}`,
      cancel_url: `${process.env.FRONTEND_URL}/paymentFailed`,
    });

    res.json({ id: session.id });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: error.message });
  }
});

//NEED WEBHOOK ENDPOINT FOR STRIPE TO CONFIRM PAYMENT SUCCESSFUL AND WRITE TO NEW MONGO TABLE

app.post("/confirm", async (req, res) => {
  const { paymentRef } = req.body;
  //check paymentRef in DB
  res.status(200).json({ paymentRef, status: "paid" });
});

module.exports = app;
