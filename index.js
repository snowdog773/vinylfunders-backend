const express = require("express");
const cors = require("cors");
// const cron = require("node-cron");
const app = express();
require("dotenv").config();
app.use(express.json());
app.use(cors());
const mongoose = require("mongoose");
const { GridFSBucket } = require("mongodb");
const util = require("i/lib/util");
const convertMp3 = require("./utils/convertMp3");

// //mongoose set up
mongoose.connect(process.env.MONGO_URL, {
  // useNewUrlParser: true,
  // useUnifiedTopology: true,
});
// Connection events

mongoose.connection.on("connected", () => {
  const dbName = mongoose.connection.db.databaseName;
  console.log(`Mongoose connected to MongoDB database: ${dbName}`);
});

mongoose.connection.on("error", (err) => {
  console.error("Mongoose connection error:", err);
});

mongoose.connection.on("disconnected", () => {
  console.log("Mongoose disconnected from MongoDB");
});

//init GridFS

let gridfsBucket;

mongoose.connection.once("open", () => {
  gridfsSongBucket = new GridFSBucket(mongoose.connection.db, {
    bucketName: "songUploads", // Optional custom bucket name
  });
  gridfsImageBucket = new GridFSBucket(mongoose.connection.db, {
    bucketName: "imageUploads", // Optional custom bucket name
  });
  gridfsThumbBucket = new GridFSBucket(mongoose.connection.db, {
    bucketName: "thumbUploads", // Optional custom bucket name
  });
  gridfsPreviewSongBucket = new GridFSBucket(mongoose.connection.db, {
    bucketName: "previewSongUploads", // Optional custom bucket name
  });
  // Set gfs as a local variable so it's accessible in other parts of the app
  app.locals.gridfsSongBucket = gridfsSongBucket;
  app.locals.gridfsImageBucket = gridfsImageBucket;
  app.locals.gridfsThumbBucket = gridfsThumbBucket;
  app.locals.gridfsPreviewSongBucket = gridfsPreviewSongBucket;
});
//test route
app.get("/ping", (req, res) => {
  res.send("pong");
});
//routes
app.use("/users", require("./routes/users"));
app.use("/projects", require("./routes/projects"));
app.use("/images", require("./routes/images"));
app.use("/songs", require("./routes/songs"));
app.use("/mapping", require("./routes/mapping"));
app.use("/payments", require("./routes/payments"));
app.use("/funders", require("./routes/funders"));
app.use("/contact", require("./routes/contact"));
const PORT = process.env.PORT || 6001;
app.listen(PORT, () => {
  console.log("server running");
});

function stop() {
  // Run some code to clean things up before server exits or restarts

  console.log("⬇ Killing process");
  process.exit(); // THEN EXITS THE PROCESS.
}

process.on("SIGINT", stop);
process.on("SIGTERM", stop);
process.on("SIGQUIT", stop);

process.once("SIGUSR2", function () {
  // Run some code to do a different kind of cleanup on nodemon restart:
  process.kill(process.pid, "SIGUSR2");
});
