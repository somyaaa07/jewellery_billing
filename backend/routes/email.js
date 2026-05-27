import express from "express";
import nodemailer from "nodemailer";

const router = express.Router();

router.post("/send-invoice", async (req, res) => {
  try {
    const { email, invoiceUrl } = req.body;

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Your Invoice",
      html: `
        <h3>Invoice Ready</h3>
        <p>You can download your invoice below:</p>
        <a href="${invoiceUrl}">View Invoice</a>
      `,
    });

    res.json({ success: true });
  } catch (err) {
    console.log(err);
    res.status(500).json({ success: false });
  }
});

export default router;