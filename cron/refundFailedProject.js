const { Project, PaymentIntent } = require("../schemas/schemas");
const stripeRefund = require("../utils/stripeRefund");
const mongoose = require("mongoose");
require("dotenv").config();

console.log("cron job running... refund failed projects");

async function connectToDB() {
  try {
    await mongoose.connect(process.env.MONGO_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`Connected to MongoDB: ${mongoose.connection.db.databaseName}`);
  } catch (error) {
    console.error("MongoDB connection error:", error);
    process.exit(1); // Exit the script if DB connection fails
  }
}

async function refundFailedProjects() {
  try {
    console.log("Fetching expired projects...");
    const expiredProjects = await Project.find({
      createdAt: { $lt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
      status: "succeeded",
    });

    if (expiredProjects.length === 0) {
      console.log("No expired projects found.");
      return;
    }

    for (const project of expiredProjects) {
      // Mark project as refunded
      await Project.updateOne(
        { projectId: project.projectId },
        { status: "refunded" }
      );

      // Find all successful payments for the project
      const payments = await PaymentIntent.find({
        projectId: project.projectId,
        status: "succeeded",
      });

      // Process all refunds
      const refundPromises = payments.map(async (payment) => {
        try {
          await stripeRefund(payment.paymentIntentId, payment.amount * 0.95);
          console.log(
            `Refunded ${payment.amount * 0.95} for ${payment.paymentIntentId}`
          );
        } catch (refundError) {
          console.error(
            `Error refunding ${payment.paymentIntentId}:`,
            refundError
          );
        }
      });

      await Promise.all(refundPromises); // Ensure all refunds complete before moving to the next project
    }
  } catch (error) {
    console.error("Error refunding failed projects:", error);
  }
}

async function main() {
  await connectToDB();
  await refundFailedProjects();
  mongoose.disconnect();
}

main();
