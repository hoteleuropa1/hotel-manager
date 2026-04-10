// api/parse-address.js
// Vercel Serverless Function — Adresserkennung via Google Gemini

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Nur POST erlaubt" });

  const GKEY = process.env.GOOGLE_AI_KEY;
  if (!GKEY) return res.status(500).json({ success: false, error: "GOOGLE_AI_KEY fehlt" });

  const { text } = req.body;
  if (!text || text.trim().length < 3) {
    return res.status(400).json({ success: false, error: "Kein Text angegeben" });
  }

  const prompt = `Du bist ein Adress-Parser fuer ein deutsches Hotel-PMS.

Analysiere den folgenden Text und extrahiere die Adressdaten. Der Text kann eine Firmenadresse, Privatadresse, oder Freitext sein.

Text:
"""
${text.trim()}
"""

Antworte NUR mit einem JSON-Objekt. Kein Markdown, keine Erklaerung, keine Backticks.
Felder die nicht erkannt werden: leeren String "" zurueckgeben.
Fuer "salutation": nur "Herr", "Frau" oder "Firma" (wenn Firmenname erkannt wird).
Fuer "country": ISO 2-Letter Code (z.B. "DE", "AT", "CH", "NL", "PL").

{
  "salutation": "",
  "first_name": "",
  "last_name": "",
  "company": "",
  "email": "",
  "phone": "",
  "address": "",
  "zip": "",
  "city": "",
  "country": "DE"
}`;

  try {
    const resp = await fetch(
      "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=" + GKEY,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 500 }
        })
      }
    );

    const data = await resp.json();

    // Text aus Gemini-Antwort extrahieren
    let raw = "";
    if (data.candidates && data.candidates[0] && data.candidates[0].content) {
      data.candidates[0].content.parts.forEach(function (p) {
        if (p.text) raw += p.text;
      });
    }

    if (!raw) {
      return res.status(500).json({ success: false, error: "Keine Antwort von Gemini" });
    }

    // JSON extrahieren (mit Fallbacks)
    let parsed;
    try {
      // Versuch 1: Direkt parsen
      let clean = raw.trim();
      if (clean.startsWith("```")) {
        clean = clean.replace(/```json?\s*/g, "").replace(/```/g, "").trim();
      }
      parsed = JSON.parse(clean);
    } catch (e1) {
      // Versuch 2: JSON-Objekt aus Text extrahieren
      const match = raw.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          parsed = JSON.parse(match[0].replace(/[\x00-\x1F]/g, " "));
        } catch (e2) {
          return res.status(500).json({ success: false, error: "JSON-Parse-Fehler", raw: raw.slice(0, 500) });
        }
      } else {
        return res.status(500).json({ success: false, error: "Kein JSON in Antwort", raw: raw.slice(0, 500) });
      }
    }

    // Salutation validieren
    if (parsed.salutation && !["Herr", "Frau", "Firma"].includes(parsed.salutation)) {
      parsed.salutation = "";
    }

    // Wenn Firma erkannt aber Salutation nicht gesetzt
    if (parsed.company && !parsed.salutation) {
      parsed.salutation = "Firma";
    }

    return res.status(200).json({ success: true, parsed });

  } catch (e) {
    return res.status(500).json({ success: false, error: e.message });
  }
};
