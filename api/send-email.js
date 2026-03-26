// api/send-email.js
// Vercel Serverless Function – E-Mail über Strato SMTP
const nodemailer = require("nodemailer");

module.exports = async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Nur POST erlaubt" });
  }

  try {
    const { to, subject, html, emailType } = req.body;

    if (!to || !subject || !html) {
      return res.status(400).json({ error: "to, subject und html sind erforderlich" });
    }

    // SMTP-Konfiguration aus Umgebungsvariablen
    const smtpHost = process.env.SMTP_HOST || "smtp.strato.de";
    const smtpPort = parseInt(process.env.SMTP_PORT || "465");
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const fromEmail = process.env.FROM_EMAIL || "info@hotel-europa-ruesselsheim.de";
    const fromName = process.env.FROM_NAME || "Hotel Europa Rüsselsheim";

    if (!smtpUser || !smtpPass) {
      return res.status(500).json({ 
        error: "SMTP nicht konfiguriert. Bitte Umgebungsvariablen in Vercel setzen." 
      });
    }

    // Nodemailer Transporter
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465, // SSL für Port 465
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    // E-Mail senden
    const info = await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to: to,
      cc: fromEmail, // Kopie an Hotel
      replyTo: fromEmail,
      subject: subject,
      html: html,
      text: "Bitte aktivieren Sie HTML in Ihrem E-Mail-Programm.",
    });

    console.log(`✅ E-Mail gesendet: ${info.messageId} an ${to} (${emailType})`);

    return res.status(200).json({
      success: true,
      message: `E-Mail an ${to} gesendet`,
      messageId: info.messageId,
      emailType: emailType || "allgemein",
      copySentTo: fromEmail,
    });

  } catch (error) {
    console.error("❌ E-Mail Fehler:", error);
    return res.status(500).json({
      error: "E-Mail konnte nicht gesendet werden",
      details: error.message,
    });
  }
};
