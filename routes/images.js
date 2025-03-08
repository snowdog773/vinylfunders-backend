const express = require("express");
const { checkJwt } = require("../middleware/auth");
const app = express.Router();
const multer = require("multer");
const mongoose = require("mongoose");
const { Image } = require("../schemas/schemas");
const storage = multer.memoryStorage();
const fs = require("fs");
const upload = multer({ storage });
const { Readable } = require("stream");
const sharp = require("sharp");

app.post("/", checkJwt, upload.single("imageFile"), async (req, res) => {
  const gridfsImageBucket = req.app.locals.gridfsImageBucket;
  const gridfsThumbBucket = req.app.locals.gridfsThumbBucket;
  try {
    if (!req.file)
      return res.status(400).json({ message: "No file uploaded." });

    const uploadStream = gridfsImageBucket.openUploadStream(
      req.file.originalname,
      {
        contentType: req.file.mimetype,
      }
    );

    const readableStream = Readable.from(req.file.buffer);

    readableStream
      .pipe(uploadStream)
      .on("error", (err) => {
        console.error("Error uploading file:", err);
        res.status(500).json({ message: "Upload failed" });
      })
      .on("finish", async () => {
        console.log("File uploaded successfully");

        // Generate a thumbnail
        const thumbnailBuffer = await sharp(req.file.buffer)
          .resize({ width: 500 }) // Resize the image
          .toBuffer();

        const uploadStreamThumbnail = gridfsThumbBucket.openUploadStream(
          `thumb_${req.file.originalname}`,
          { contentType: req.file.mimetype }
        );
        const readableStreamThumbnail = Readable.from(thumbnailBuffer);

        readableStreamThumbnail
          .pipe(uploadStreamThumbnail)
          .on("error", (err) => {
            console.error("Error uploading thumbnail:", err);
            res.status(500).json({ message: "Thumbnail upload failed" });
          })
          .on("finish", async () => {
            console.log("Thumbnail uploaded successfully");

            const { ownerId, projectId, type } = req.body;
            const newImage = new Image({
              ownerId,
              projectId,
              type,
              imageId: uploadStream.id, // Image ID
              thumbId: uploadStreamThumbnail.id, // Thumbnail ID
            });

            await newImage.save();
            res.status(200).json({
              message: "Upload complete",
              thumbId: uploadStreamThumbnail.id, // Return thumbId to client
            });
          });
      });
  } catch (err) {
    console.error("Error in file upload:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

app.get("/thumb/:id", async (req, res) => {
  const gridfsThumbBucket = req.app.locals.gridfsThumbBucket; // Access GridFS bucket instance
  const imageId = req.params.id;

  try {
    // Convert the ID to an ObjectId instance
    const fileId = new mongoose.Types.ObjectId(imageId);

    // Find the file metadata by ID to get additional details if needed
    const file = await gridfsThumbBucket.find({ _id: fileId }).toArray();

    if (!file || file.length === 0) {
      return res.status(404).json({ message: "Image not found" });
    }

    // Set response headers
    res.setHeader("Content-Type", file[0].contentType);
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${file[0].filename}"`
    );

    // Stream the image file to the response
    const downloadStream = gridfsThumbBucket.openDownloadStream(fileId);
    downloadStream.pipe(res);

    downloadStream.on("error", (err) => {
      console.error("Error streaming image:", err);
      res.status(500).json({ message: "Error retrieving image" });
    });

    // downloadStream.on("end", () => {
    //   console.log("Image retrieval complete.");
    // });
  } catch (err) {
    console.error("Error fetching image:", err);
    res
      .status(500)
      .json({ message: "An error occurred while fetching the image" });
  }
});

module.exports = app;
