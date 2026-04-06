const nodemailer = require("nodemailer");

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Nur POST erlaubt" });

  try {
    const { to, subject, html, emailType } = req.body;
    if (!to || !subject || !html) {
      return res.status(400).json({ error: "to, subject und html sind erforderlich" });
    }

    const host = process.env.SMTP_HOST || "smtp.strato.de";
    const port = parseInt(process.env.SMTP_PORT || "465");
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const fromName = process.env.FROM_NAME || "Hotel Europa";

    if (!user || !pass) {
      return res.status(500).json({ error: "SMTP_USER oder SMTP_PASS nicht konfiguriert" });
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
      tls: { rejectUnauthorized: false }
    });

    const info = await transporter.sendMail({
      from: fromName + " <" + user + ">",
      to: to,
      cc: user,
      replyTo: user,
      subject: subject,
      html: html
    });

    console.log("E-Mail gesendet an " + to + " (" + emailType + ") ID: " + info.messageId);

    return res.status(200).json({
      success: true,
      message: "E-Mail an " + to + " gesendet",
      id: info.messageId,
      emailType: emailType || "allgemein"
    });

  } catch (error) {
    console.error("SMTP Fehler:", error.message);
    return res.status(500).json({
      error: "E-Mail konnte nicht gesendet werden",
      details: error.message
    });
  }
};
