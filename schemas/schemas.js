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
  completed: { type: Boolean, default: false },
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

module.exports = { User, Project, Song, Image };
