const ffmpegStatic = require("ffmpeg-static");
const ffmpeg = require("fluent-ffmpeg");
const fs = require("fs");
const path = require("path");
const { promisify } = require("util");
const writeFileAsync = promisify(fs.writeFile);
const unlinkAsync = promisify(fs.unlink);

// Convert MP3 Function
const convertMp3 = async (inputBuffer) => {
  const tempInputPath = path.join(__dirname, "tempInput.wav");
  const tempOutputPath = path.join(__dirname, "tempOutput.mp3");

  // Save inputBuffer to a temp file
  await writeFileAsync(tempInputPath, inputBuffer);

  return new Promise((resolve, reject) => {
    ffmpeg.setFfmpegPath(ffmpegStatic);

    ffmpeg()
      .input(tempInputPath) // Input file
      .setDuration(30) // Limit to 30 seconds
      .audioBitrate("192k") // Set bitrate
      .save(tempOutputPath) // Output file

      // Log the progress
      .on("progress", (progress) => {
        if (progress.percent) {
          console.log(`Processing: ${Math.floor(progress.percent)}% done`);
        }
      })

      // On success
      .on("end", async () => {
        console.log("Conversion complete:", tempOutputPath);
        const outputBuffer = await fs.promises.readFile(tempOutputPath);

        // Cleanup temp files
        await unlinkAsync(tempInputPath);
        await unlinkAsync(tempOutputPath);

        resolve(outputBuffer);
      })

      // On error
      .on("error", async (err) => {
        console.error("Error during conversion:", err.message);
        // Cleanup temp files
        await unlinkAsync(tempInputPath).catch(() => {});
        await unlinkAsync(tempOutputPath).catch(() => {});
        reject(err);
      });
  });
};

module.exports = convertMp3;
