const express = require("express");
const app = express.Router();
const { nanoid } = require("nanoid");
const { Project, Image, Song } = require("../schemas/schemas");
app.get("/allProjects", async (req, res) => {
  const { limit } = req.query;
  try {
    const projects = await Project.find({})
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();
    const output = await Promise.all(
      projects.map(async (project) => {
        const { projectId } = project;

        // Use .lean() to get plain objects for the thumbIds
        const thumbIds = await Image.find({ projectId }).lean();

        const thumbArray = thumbIds.map((e) => e.thumbId);
        // Return the project with added frontCover and backCover

        //get song preview ID
        const songPreviewObject = await Song.findOne({ projectId }).lean();

        return {
          ...project,
          frontCover: thumbArray[0],
          backCover: thumbArray[1],
          songTitle: songPreviewObject.title,
          songPreviewId: songPreviewObject.previewId,
        };
      })
    );
    res.json(output);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});
// get all projects for a user id
app.get("/all/:ownerId", async (req, res) => {
  try {
    const { ownerId } = req.params;

    // Use .lean() to get plain objects instead of Mongoose documents
    const projects = await Project.find({ ownerId }).lean();

    const output = await Promise.all(
      projects.map(async (project) => {
        const { projectId } = project;

        // Use .lean() to get plain objects for the thumbIds
        const thumbIds = await Image.find({ projectId }).lean();

        const thumbArray = thumbIds.map((e) => e.thumbId);

        //get song preview ID
        const songPreviewObject = await Song.findOne({ projectId }).lean();

        // Return the project with added frontCover and backCover
        return {
          ...project,
          frontCover: thumbArray[0],
          backCover: thumbArray[1],
          songTitle: songPreviewObject.title,
          songPreviewId: songPreviewObject.previewId,
        };
      })
    );

    // Send the output back as a JSON response
    res.status(200).json(output);
  } catch (err) {
    res.status(500).send(err);
  }
});

// get single project for a project id
app.get("/single/:projectId", async (req, res) => {
  try {
    const { projectId } = req.params;
    console.log("Received request for projectId:", req.params.projectId);
    const {
      artist,
      description,
      projectTitle,
      createdAt,
      fundRaised,
      fundTarget,
      status,
    } = await Project.findOne({
      projectId,
    });
    const thumbIds = await Image.find({ projectId });
    const thumbArray = thumbIds.map((e) => e.thumbId);

    const songArray = await Song.find({ projectId });
    res.status(200).json({
      artist,
      description,
      projectTitle,
      createdAt,
      thumbArray,
      songArray,
      fundRaised,
      fundTarget,
      status,
    });
  } catch (err) {
    res.status(500).send(err);
  }
});

// create new project
app.post("/", async (req, res) => {
  try {
    const {
      ownerId,
      projectId,
      projectTitle,
      artist,
      description,
      tempProjectId,
      fundTarget,
    } = req.body;
    const newProject = new Project({
      ownerId,
      projectId,
      tempProjectId,
      projectTitle,
      artist,
      description,
      completed: false,
      fundTarget,
      fundRaised: 0,
      status: "active",
    });

    await newProject.save();
    res.status(200).send("new project created");
  } catch (err) {
    res.status(500).send(err);
  }
});

//update project

app.put("/complete/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await Project.findOneAndUpdate(
      { projectId: id },
      { $set: { completed: true } },
      { new: true }
    );

    res.status(200).send("project is live");
  } catch (err) {
    res.status(500).send(err);
  }
});

//delete project

app.delete("/:id");

module.exports = app;
