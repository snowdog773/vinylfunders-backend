require("dotenv").config();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const stripeRefund = async (paymentId, amount) => {
  console.log(`Refunding payment: ${paymentId}`);
  return await stripe.refunds.create({
    payment_intent: paymentId,
    amount,
  });
};

module.exports = stripeRefund;
