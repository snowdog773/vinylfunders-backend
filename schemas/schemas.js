const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  address: { type: String, required: true },
  phone: { type: String, required: true },
  id: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

const User = mongoose.model("User", userSchema);

const projectSchema = new mongoose.Schema({
  ownerId: { type: String, required: true },
  projectId: { type: String, required: true, unique: true },
  tempProjectId: { type: String, required: true, unique: true },
  projectTitle: { type: String, required: true },
  artist: { type: String, required: true },
  description: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  completed: { type: Boolean, default: false }, //refers to is project setup
  status: {
    type: String,
    enum: ["succeeded", "failed", "refunded"],
    required: true,
  }, //'active' or 'complete' or 'failed' depending if funding target is met
  fundTarget: { type: Number, required: true }, //in pence
  fundRaised: { type: Number, required: true }, //in pence
});

const Project = mongoose.model("Project", projectSchema);

const imageSchema = new mongoose.Schema({
  ownerId: { type: String, required: true },
  projectId: { type: String, required: true },
  imageId: { type: String, required: true, unique: true },
  thumbId: { type: String, required: true },
  type: { type: String, required: true }, //front or back
  createdAt: { type: Date, default: Date.now },
});

const Image = mongoose.model("Image", imageSchema);

const songSchema = new mongoose.Schema({
  ownerId: { type: String, required: true },
  projectId: { type: String, required: true },
  songId: { type: String, required: true },
  fileName: { type: String, required: true },
  mimeType: { type: String, required: true },
  title: { type: String, required: true },
  track: { type: Number, required: true },
  side: { type: String, required: true },
  preview: { type: Boolean, required: true },
  previewId: { type: String },
  length: { type: Number, required: true },
  createdAt: { type: Date, default: Date.now },
});
//songs retrieved via attached project id. Song id

const Song = mongoose.model("Song", songSchema);

// const PaymentSchema = new mongoose.Schema(
//   {
//     stripeSessionId: { type: String, unique: true }, // checkout.session.id
//     paymentIntentId: { type: String, unique: true }, // payment_intent.id
//     customerDetails: { type: Object }, // Stripe Customer ID
//     tempProjectId: { type: String }, //id for artists creating projects
//     projectId: { type: String }, //id linking funders to projects
//     collectedInformation: { type: Object }, // Collected shipping info from the checkout form FUNDERS ONLY
//     isFunder: { type: Boolean }, // true if the payment is from a FUNDER
//     projectTitle: { type: String }, // title of the project
//     artist: { type: String }, // artist name
//     paymentRef: { type: String }, // our generated payment reference that we sent to funder by email
//     amount: { type: Number, required: true }, // In smallest currency unit (e.g., cents)
//     currency: { type: String, required: true }, // e.g., "usd"
//     status: {
//       type: String,
//       enum: ["pending", "succeeded", "failed", "refunded"],
//       required: true,
//     },
//     paymentMethod: { type: String }, // e.g., "card", "paypal"
//     paymentDetails: { type: Object }, // Store raw Stripe response if needed
//     metadata: { type: Object }, // Custom metadata from Stripe

//     createdAt: { type: Date, default: Date.now },
//     updatedAt: { type: Date, default: Date.now },
//   },
//   { timestamps: true }
// );

// const Payment = mongoose.model("Payment", PaymentSchema);

const WebhookLogSchema = new mongoose.Schema(
  {
    eventId: { type: String, required: true }, // Stripe event ID
    type: { type: String, required: true }, // Event type (e.g., payment_intent.succeeded)
    payload: { type: Object, required: true }, // Full webhook payload
    receivedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const WebhookLog = mongoose.model("WebhookLog", WebhookLogSchema);

const checkoutSessionSchema = new mongoose.Schema({
  stripeSessionId: { type: String, required: true, unique: true },
  paymentIntentId: { type: String, required: true, unique: true },
  customerDetails: { type: Object },
  collectedInformation: { type: Object },
  amount: { type: String },
  currency: { type: String },
  paymentMethod: { type: String },
  createdAt: { type: Date, default: Date.now },
});

const CheckoutSession = mongoose.model(
  "CheckoutSession",
  checkoutSessionSchema
);

const paymentIntentSchema = new mongoose.Schema({
  paymentIntentId: { type: String, required: true, unique: true },
  amount: { type: Number },
  currency: { type: String },
  paymentMethod: { type: String },
  metadata: { type: Object },
  tempProjectId: { type: String },
  isFunder: { type: Boolean },
  projectId: { type: String },
  projectTitle: { type: String },
  artistId: { type: String },
  paymentRef: { type: String },
  status: {
    type: String,
    enum: ["succeeded", "failed", "refunded"],
    required: true,
  },
  createdAt: { type: Date, default: Date.now },
});

const PaymentIntent = mongoose.model("PaymentIntent", paymentIntentSchema);

module.exports = {
  User,
  Project,
  Song,
  Image,
  WebhookLog,
  CheckoutSession,
  PaymentIntent,
};
