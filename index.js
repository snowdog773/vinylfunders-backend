const express = require("express");
const cors = require("cors");
// const cron = require("node-cron");
const app = express();
require("dotenv").config();
app.use("/payments/webhook", require("./routes/webhook")); //webhook route needs special none json parsing

app.use(
  cors({
    origin: [
      "http://localhost:3000",
      process.env.FRONTEND_URL,
      "https://vinyl-funders-frontend.onrender.com",
    ],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
    exposedHeaders: ["Content-Length", "Authorization"],
  })
);

// app.use((req, res, next) => {
//   console.log(`${req.method} request to ${req.url}`);
//   next();
// });
app.use(express.json());
const mongoose = require("mongoose");
const { GridFSBucket } = require("mongodb");

//IMPORTANT -- throughout this app tempProjectId is an
// ID created when an artist begins a checkout session to create a project
//and is used to connect the project order to the project and payment records.
//this is handled in the payments.js routes file
//projectId is a separate ID generated on the front end when payment is completed
//and is used as the primary tracking ID for people who fund projects
//this is handled in the funders.js routes file
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
  console.log("⬇ Graceful shutdown initiated");
  mongoose.connection.close(() => {
    server.close(() => {
      console.log("Server and MongoDB connections closed");
      process.exit(0);
    });
  });
}

// process.on("SIGINT", stop);
process.on("SIGTERM", stop);
// process.on("SIGQUIT", stop);

process.once("SIGUSR2", function () {
  // Run some code to do a different kind of cleanup on nodemon restart:
  process.kill(process.pid, "SIGUSR2");
});
