// api/send-email.js
// Vercel Serverless Function – E-Mail über Resend API
// Kein npm install nötig – nutzt nur fetch

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

    const apiKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.FROM_EMAIL || "onboarding@resend.dev";
    const fromName = process.env.FROM_NAME || "Hotel Europa Rüsselsheim";
    const ccEmail = process.env.CC_EMAIL || fromEmail;

    if (!apiKey) {
      return res.status(500).json({ error: "RESEND_API_KEY nicht konfiguriert" });
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        from: `${fromName} <${fromEmail}>`,
        to: [to],
        cc: [ccEmail],
        reply_to: fromEmail,
        subject: subject,
        html: html
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Resend Fehler:", data);
      return res.status(500).json({
        error: "E-Mail konnte nicht gesendet werden",
        details: data.message || JSON.stringify(data)
      });
    }

    console.log(`✅ E-Mail gesendet an ${to} (${emailType})`);
    return res.status(200).json({
      success: true,
      message: `E-Mail an ${to} gesendet`,
      id: data.id,
      emailType: emailType || "allgemein"
    });

  } catch (error) {
    console.error("Fehler:", error);
    return res.status(500).json({
      error: "E-Mail Fehler",
      details: error.message
    });
  }
};
