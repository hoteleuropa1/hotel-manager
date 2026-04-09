export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { text } = req.body;
  if (!text || !text.trim()) {
    return res.status(400).json({ success: false, error: 'Kein Text' });
  }

  const apiKey = process.env.GOOGLE_AI_KEY;
  if (!apiKey) {
    return res.status(500).json({ success: false, error: 'GOOGLE_AI_KEY fehlt' });
  }

  try {
    const prompt = `Du bist ein Adress-Parser. Extrahiere aus dem folgenden Text die Kontaktdaten und gib NUR valides JSON zurueck, ohne Markdown, ohne Erklaerung, ohne Backticks.

Format:
{
  "salutation": "Herr" oder "Frau" oder "Firma" oder "",
  "first_name": "",
  "last_name": "",
  "company": "",
  "email": "",
  "phone": "",
  "address": "Strasse und Hausnummer",
  "zip": "",
  "city": "",
  "country": "2-Buchstaben ISO-Code, Standard DE"
}

Regeln:
- Bei "Herrn" -> salutation "Herr"
- Bei Firmennamen -> salutation "Firma", company = Firmenname
- Wenn kein Land erkennbar -> "DE"
- Felder die nicht erkennbar sind -> leerer String ""
- Telefonnummern mit Vorwahl
- Bei "z.Hd." oder "z.H." den Namen danach als first_name/last_name

Text:
${text}`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.1 }
        })
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      return res.status(500).json({ success: false, error: 'Gemini API: ' + response.status + ' ' + errText.slice(0, 200) });
    }

    const data = await response.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Clean markdown fences if present
    const cleaned = rawText
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/g, '')
      .trim();

    const parsed = JSON.parse(cleaned);

    return res.status(200).json({ success: true, parsed });
  } catch (e) {
    console.error('parse-address error:', e);
    return res.status(500).json({ success: false, error: e.message });
  }
}
