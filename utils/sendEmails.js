const sgMail = require("@sendgrid/mail");
const exportCsv = require("./exportCsv"); // Import your function

sgMail.setApiKey(process.env.SENDGRID_API_KEY); // Use your SendGrid API key

async function sendEmailWithCsv(projectId) {
  try {
    const csvData = await exportCsv(projectId); // Get CSV data dynamically

    const msg = {
      to: "jonpitans@gmail.com", // Recipient email
      from: "jonpitans@gmail.com", // Your verified sender email
      subject: "CSV Report - Completed Crowdfund Funders Report.",
      text: "Completed Crowdfund Funders Report.",
      attachments: [
        {
          content: Buffer.from(csvData).toString("base64"), // Convert CSV to base64
          filename: "report.csv",
          type: "text/csv",
          disposition: "attachment",
        },
      ],
    };

    await sgMail.send(msg);
    console.log("Email sent with CSV attachment successfully!");
  } catch (error) {
    console.error("Error sending email:", error);
  }
}

async function emailConfirmationToBacker(
  toEmail,
  projectTitle,
  artist,
  paymentRef
) {
  try {
    const msg = {
      to: toEmail, // Recipient email
      from: "jonpitans@gmail.com", // Your verified sender email
      subject: `Thanks for funding ${projectTitle} from ${artist}`,
      text: `Thank you for funding this ${projectTitle} by ${artist}. Your payment reference number is ${paymentRef} which you should keep a copy of. We appreciate your support!`,
    };

    await sgMail.send(msg);
    console.log("Email sent to backer successfully!");
  } catch (error) {
    console.error("Error sending email:", error);
  }
}

module.exports = { sendEmailWithCsv, emailConfirmationToBacker };
