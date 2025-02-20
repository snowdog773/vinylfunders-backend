const express = require("express");

const app = express.Router();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
const {
  PaymentIntent,
  CheckoutSession,
  Project,
} = require("../schemas/schemas");

const {
  sendEmailWithCsv,
  emailConfirmationToBacker,
} = require("../utils/sendEmails");

//THIS FILE IS FOR PAYMENTS INVOLVING TAKING PAYMENT FROM FUNDERS - FOR PROJECT SETUP PAYMENTS LOOK FOR payments.js
//USE TO INITIALIZE A PAYMENT SESSION IN THE FRONT END
app.post("/create-checkout-session", async (req, res) => {
  try {
    const { priceId, projectId, paymentRef, projectTitle, artist } = req.body;

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
          projectTitle,
          artist,
          isFunder: true,
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

// CHECK PAYMENTS TABLE OF DB TO CONFIRM PAYMENT SUCCESSFUL

app.post("/confirm", async (req, res) => {
  try {
    const { paymentRef } = req.body;
    const { paymentIntentId, amount, projectId, projectTitle, artistId } =
      await PaymentIntent.findOne({
        paymentRef,
        status: "succeeded",
      });
    const payment = await CheckoutSession.findOne({
      paymentIntentId,
    });

    if (!payment) {
      res.status(404).json({ error: "Payment not found" });
      return;
    } else {
      //increment funding count on project, check for completion

      const { fundTarget, fundRaised } = await Project.findOne({ projectId });

      if (fundRaised + amount >= fundTarget) {
        await Project.findOneAndUpdate(
          { projectId },
          {
            $set: {
              status: "complete",
              fundRaised: fundRaised + amount,
            },
          }
        );
        console.log("Project completed", projectId);
        sendEmailWithCsv(projectId); //produce and send csv of shipping details to project owner
        //email project owner, admin and funders
      } else {
        await Project.findOneAndUpdate(
          { projectId },
          {
            $set: { fundRaised: fundRaised + amount },
          }
        );
      }
      emailConfirmationToBacker(
        payment.customerDetails.email,
        projectTitle,
        artistId,
        paymentRef
      );
      res.status(200).json({
        projectId,
        status: "succeeded",
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

module.exports = app;
