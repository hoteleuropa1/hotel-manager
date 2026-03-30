// api/fetch-prices.js
// Vercel Serverless Function - Google Gemini API mit Google Search Grounding
// Environment Variable in Vercel setzen: GOOGLE_AI_KEY
// Kostenlos: 500 Suchanfragen/Tag im Free Tier
// API Key holen: aistudio.google.com -> Get API key -> Create API key

export default async function handler(req, res) {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.GOOGLE_AI_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: "GOOGLE_AI_KEY nicht gesetzt. Bitte in Vercel Environment Variables eintragen. Key holen: aistudio.google.com"
    });
  }

  try {
    const { categories, dateFrom, dateTo } = req.body;

    if (!categories || !categories.length) {
      return res.status(400).json({ error: "Keine Kategorien ausgewaehlt" });
    }

    const catLines = categories.map(c =>
      `- ID ${c.id} "${c.name}": Basispreis ${c.base_price} EUR, Mindestpreis ${c.min_price} EUR\n  Belegung: ${JSON.stringify(c.occupancy)}`
    ).join("\n");

    const prompt = `You are a hotel revenue management AI for "Hotel Europa Ruesselsheim" (3-star, rating 7.5/10, near Frankfurt Airport).

Search for current hotel prices near Ruesselsheim, Frankfurt Airport, Kelsterbach, Raunheim on Booking.com for the period ${dateFrom} to ${dateTo}.

ROOM TYPE OCCUPANCY RULES (important for price comparison):
- "Einzelzimmer" / "Single" = 1 person occupancy -> compare with single rooms at competitors
- "Doppelzimmer" / "Zweibettzimmer" / "Double" / "Twin" = 2 person occupancy -> compare with double/twin rooms
- "Dreibettzimmer" / "Triple" = 3 person occupancy -> compare with triple rooms or double+extra bed
- "Familienzimmer" / "Family" = 3-4 person occupancy -> compare with family rooms

OUR ROOM CATEGORIES:
${catLines}

PRICING RULES:
- Never suggest below minimum price for each category
- High occupancy >80%: price 10-20% above market average
- Low occupancy <50%: price 5-15% below market but always above minimum
- Weekend (Friday/Saturday) premium +10-15%
- Compare our prices vs competitor prices for MATCHING room types (single vs single, double vs double etc.)
- Consider our 3-star / 7.5 rating positioning

IMPORTANT: You MUST respond with ONLY valid JSON. No markdown, no backticks, no explanation before or after. No newlines inside JSON string values. Keep all reason strings short (max 8 words), use only ASCII characters (no umlauts, write ae oe ue ss instead). No special quotes or dashes.
Use this exact format:
{"competitors":[{"name":"hotel name","stars":3,"rating":8.0,"priceRange":"65-95 EUR"}],"suggestions":{${categories.map(c => `"${c.id}":[{"date":"YYYY-MM-DD","price":75,"reason":"kurzer grund"}]`).join(",")}},"marketSummary":"2-3 short sentences in German about market"}

CRITICAL RULES FOR JSON:
- All prices MUST be integers in EUR (Euro), no decimals, no currency symbols
- Use the EXACT category IDs I gave you: ${categories.map(c => c.id).join(", ")}
- Dates MUST be formatted as YYYY-MM-DD with zero-padded months and days
- Keep reason strings under 8 words, ASCII only (ae oe ue instead of umlauts)
- No trailing commas, no comments, no extra text outside JSON`;

    // Google Gemini API mit Google Search Grounding
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const resp = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          role: "user",
          parts: [{ text: prompt }]
        }],
        tools: [{
          google_search: {}
        }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 4096
        }
      })
    });

    if (!resp.ok) {
      const errText = await resp.text();
      console.error("Gemini API error:", errText);
      return res.status(resp.status).json({
        error: `Google Gemini API Fehler ${resp.status}: ${errText.slice(0, 300)}`
      });
    }

    const data = await resp.json();

    // Text aus Gemini-Antwort extrahieren
    let fullText = "";
    if (data.candidates && data.candidates[0]) {
      const parts = data.candidates[0].content?.parts || [];
      for (const part of parts) {
        if (part.text) fullText += part.text;
      }
    }

    if (!fullText) {
      return res.status(500).json({
        error: "Keine Textantwort von Gemini erhalten",
        raw: JSON.stringify(data).slice(0, 500)
      });
    }

    // JSON aus Antwort extrahieren
    const clean = fullText.replace(/```json|```/g, "").trim();
    const match = clean.match(/\{[\s\S]*"suggestions"[\s\S]*\}/);

    if (!match) {
      return res.status(500).json({
        error: "Keine strukturierten Preisdaten in Antwort gefunden",
        raw: clean.slice(0, 500)
      });
    }

    let parsed;
    try {
      // Control characters und problematische Zeichen entfernen
      let jsonStr = match[0]
        .replace(/[\x00-\x1F\x7F]/g, " ")
        .replace(/\n/g, " ")
        .replace(/\r/g, " ")
        .replace(/\t/g, " ")
        .replace(/\\n/g, " ")
        .replace(/\\/g, "\\\\")  // Escape backslashes
        .replace(/\\\\\"/g, '\\"')  // Fix double-escaped quotes
        .replace(/\\\\\\\\/g, "\\\\")  // Fix over-escaped backslashes
        .replace(/\s+/g, " ")
        .replace(/,\s*}/g, "}")  // Trailing commas
        .replace(/,\s*]/g, "]");  // Trailing commas in arrays
      parsed = JSON.parse(jsonStr);
    } catch (parseErr) {
      // Zweiter Versuch: nur ASCII behalten
      try {
        let jsonStr2 = match[0]
          .replace(/[^\x20-\x7E{}[\]:,".\-0-9a-zA-Z ]/g, "")
          .replace(/\s+/g, " ")
          .replace(/,\s*}/g, "}")
          .replace(/,\s*]/g, "]");
        parsed = JSON.parse(jsonStr2);
      } catch (parseErr2) {
        // Dritter Versuch: Suggestions manuell extrahieren
        try {
          const suggestions = {};
          const sugRegex = /"(\d+)"\s*:\s*\[([\s\S]*?)\]/g;
          let sm;
          while ((sm = sugRegex.exec(match[0])) !== null) {
            const catId = sm[1];
            const items = [];
            const itemRegex = /"date"\s*:\s*"([^"]+)"[\s\S]*?"price"\s*:\s*(\d+)/g;
            let im;
            while ((im = itemRegex.exec(sm[2])) !== null) {
              items.push({ date: im[1], price: parseInt(im[2]), reason: "" });
            }
            if (items.length > 0) suggestions[catId] = items;
          }
          if (Object.keys(suggestions).length > 0) {
            parsed = { suggestions, competitors: [], marketSummary: "Daten teilweise extrahiert" };
          } else {
            return res.status(500).json({
              error: "JSON-Parse-Fehler nach 3 Versuchen",
              raw: match[0].slice(0, 800)
            });
          }
        } catch (parseErr3) {
          return res.status(500).json({
            error: "JSON-Parse-Fehler: " + parseErr3.message,
            raw: match[0].slice(0, 800)
          });
        }
      }
    }

    // Grounding-Quellen extrahieren (falls vorhanden)
    const groundingMeta = data.candidates?.[0]?.groundingMetadata;
    if (groundingMeta?.groundingChunks) {
      parsed.sources = groundingMeta.groundingChunks
        .filter(c => c.web)
        .map(c => ({ title: c.web.title, url: c.web.uri }))
        .slice(0, 5);
    }

    return res.status(200).json({ success: true, data: parsed });

  } catch (err) {
    console.error("fetch-prices error:", err);
    return res.status(500).json({ error: err.message });
  }
}
