const express = require("express");
const app = express.Router();
const { checkJwt } = require("../middleware/auth");
const { Song } = require("../schemas/schemas");
const multer = require("multer");
const mongoose = require("mongoose");
const { Readable } = require("stream");
const convertMp3 = require("../utils/convertMp3");
//set up gridfs storage / multer

const storage = multer.memoryStorage();
const fs = require("fs");
const upload = multer({ storage });

//set up file retrieval

app.post("/", checkJwt, upload.single("songFile"), async (req, res) => {
  const gridfsSongBucket = req.app.locals.gridfsSongBucket; // Access GridFS instance
  const gridfsPreviewSongBucket = req.app.locals.gridfsPreviewSongBucket;

  try {
    if (!req.file) return res.status(400).send("No file uploaded.");

    // Save original file to GridFS
    const uploadStream = gridfsSongBucket.openUploadStream(
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
        const { ownerId, projectId, title, track, side, preview, length } =
          req.body;
        console.table({
          message: "File uploaded successfully",
          title,
          track,
          side,
          preview,
          length,
        });
        let previewFileId = null;
        const isPreview = preview === "true" || preview === true;
        if (isPreview) {
          try {
            // Convert to MP3 and upload preview
            const mp3Buffer = await convertMp3(req.file.buffer);
            const previewUploadStream =
              gridfsPreviewSongBucket.openUploadStream(
                `preview_${req.file.originalname}`,
                {
                  contentType: "audio/mpeg",
                }
              );
            Readable.from(mp3Buffer).pipe(previewUploadStream);

            previewFileId = await new Promise((resolve, reject) => {
              previewUploadStream.on("finish", () =>
                resolve(previewUploadStream.id)
              );
              previewUploadStream.on("error", reject);
            });

            console.log("Preview uploaded successfully:", previewFileId);
          } catch (err) {
            console.error("Error generating preview:", err);
            return res.status(500).json({
              message: "Error generating preview",
              error: err.message,
            });
          }
        }

        const newSong = new Song({
          ownerId: ownerId,
          projectId: projectId,
          fileName: req.file.originalname,
          mimeType: req.file.mimetype,
          title: title || req.file.originalname,
          songId: uploadStream.id, // Original file ID
          previewId: previewFileId, // Preview file ID (if any)
          track,
          side,
          preview,
          length,
        });

        await newSong.save();
        res.status(200).json(newSong);
      });
  } catch (err) {
    console.error("Error in file upload:", err);
    res.status(500).send(err);
  }
});
///get a single song to preview

app.get("/preview/:id", async (req, res) => {
  const gridfsPreviewSongBucket = req.app.locals.gridfsPreviewSongBucket; // Access GridFS instance
  const songId = req.params.id;
  console.log("Preview track called", songId);

  // Validate if songId is a valid ObjectId
  if (!mongoose.Types.ObjectId.isValid(songId)) {
    return res.status(400).json({ message: "Invalid song ID" });
  }

  const objectId = new mongoose.Types.ObjectId(songId);

  try {
    // Find the song in GridFS
    const files = await gridfsPreviewSongBucket
      .find({ _id: objectId })
      .toArray();

    if (!files || files.length === 0) {
      return res
        .status(404)
        .json({ message: "No audio file found with the given ID" });
    }

    const fileDetails = files[0];

    if (fileDetails.contentType !== "audio/mpeg") {
      return res
        .status(400)
        .json({ message: "File is not a valid audio/mpeg file" });
    }

    // Set necessary headers for CORS and streaming
    res.set("Access-Control-Allow-Origin", "*"); // Allow access from any domain or specify your frontend domain
    res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    res.set("Referrer-Policy", "no-referrer-when-downgrade");

    // Set the Content-Type and Content-Disposition headers
    res.set("Content-Type", "audio/mpeg");
    res.set(
      "Content-Disposition",
      `inline; filename="${fileDetails.filename}"`
    );

    // Stream the file to the client
    const readStream = gridfsPreviewSongBucket.openDownloadStream(
      fileDetails._id
    );

    // Handle errors during streaming
    readStream.on("error", (err) => {
      console.error("Error while streaming:", err);
      res.status(500).json({ message: "Error streaming the file" });
    });

    // Pipe the GridFS read stream to the response
    readStream.pipe(res);
  } catch (err) {
    console.error("Error fetching file from GridFS:", err);
    res.status(500).json({ message: "Error fetching the file from GridFS" });
  }
});

module.exports = app;
