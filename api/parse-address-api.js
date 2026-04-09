// api/parse-address.js – Vercel Serverless Function
// Erkennt automatisch: Firma, Anrede, Name, Straße, PLZ, Ort, Land
// Nutzt Gemini 2.0 Flash (wie bei der Preisberechnung)

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const { text } = req.body;
  if (!text || !text.trim()) {
    return res.status(400).json({ error: 'Kein Text übergeben' });
  }

  const GEMINI_KEY = process.env.GOOGLE_AI_KEY;
  if (!GEMINI_KEY) {
    return res.status(500).json({ error: 'GOOGLE_AI_KEY nicht konfiguriert' });
  }

  const prompt = `Du bist ein Adress-Parser für ein deutsches Hotel-PMS.
Analysiere den folgenden Text und extrahiere die Adressbestandteile.

REGELN:
- Erkenne ob eine Firma/Unternehmen enthalten ist
- Erkenne Anrede (Herr/Frau/Firma/Familie etc.)
- Trenne Vorname und Nachname
- Erkenne Straße mit Hausnummer
- Erkenne PLZ und Ort (auch international)
- Erkenne das Land (Standard: Deutschland)
- Erkenne E-Mail und Telefon falls vorhanden
- Bei mehrzeiligen Eingaben: Zeile für Zeile interpretieren
- Typische Formate: Briefkopf, Visitenkarte, Booking-Bestätigung, freier Text

Antworte NUR mit einem JSON-Objekt, ohne Markdown, ohne Erklärung:
{
  "company": "Firmenname oder leer",
  "salutation": "Herr/Frau/Familie oder leer",
  "first_name": "Vorname",
  "last_name": "Nachname",
  "address": "Straße + Hausnummer",
  "zip": "PLZ",
  "city": "Ort",
  "country": "Land (DE, AT, CH, etc.)",
  "email": "E-Mail oder leer",
  "phone": "Telefon oder leer",
  "confidence": "high/medium/low"
}

TEXT:
${text}`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 500
          }
        })
      }
    );

    const data = await response.json();
    const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    // JSON extrahieren (auch wenn Gemini Markdown-Backticks verwendet)
    const cleaned = raw.replace(/```json\s*/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleaned);

    return res.status(200).json({ 
      success: true, 
      parsed,
      raw_input: text 
    });
  } catch (err) {
    console.error('Parse error:', err);
    return res.status(500).json({ 
      error: 'Parsing fehlgeschlagen', 
      details: err.message 
    });
  }
}
