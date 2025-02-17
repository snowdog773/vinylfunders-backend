const { required } = require("joi");
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
  status: { type: String, required: true }, //'active' or 'complete' or 'failed' depending if funding target is met
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

const paymentWebhookRecordSchema = new mongoose.Schema({
  paymentId: { type: String, required: true },
  status: { type: String, required: true },
  amount: { type: Number, required: true },
  currency: { type: String, required: true },
  customerEmail: { type: String, required: true },
  tempProjectId: { type: String, required: true },
  paymentMethod: { type: String, required: true },
  rawData: { type: String, required: true },
  date: { type: Date, default: Date.now },
  type: { type: String, required: true },
});

const PaymentWebhookRecord = mongoose.model(
  "PaymentWebhookRecord",
  paymentWebhookRecordSchema
);

module.exports = { User, Project, Song, Image, PaymentWebhookRecord };
