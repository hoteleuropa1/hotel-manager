// api/fetch-prices.js
// Vercel Serverless Function - Google Gemini mit Google Search
// Environment Variable: GOOGLE_AI_KEY (von aistudio.google.com)

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Nur POST erlaubt" });

  const apiKey = process.env.GOOGLE_AI_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: "GOOGLE_AI_KEY fehlt in Vercel Environment Variables" });
  }

  try {
    const { categories, dateFrom, dateTo } = req.body || {};
    if (!categories || !categories.length) {
      return res.status(400).json({ error: "Keine Kategorien gesendet" });
    }

    // Personen-Zuordnung
    function getPersons(name) {
      var n = (name || "").toLowerCase();
      if (n.indexOf("einzel") >= 0 || n.indexOf("single") >= 0 || n.indexOf("ez") >= 0) return 1;
      if (n.indexOf("drei") >= 0 || n.indexOf("triple") >= 0 || n.indexOf("3b") >= 0) return 3;
      if (n.indexOf("famili") >= 0 || n.indexOf("family") >= 0) return 4;
      return 2;
    }

    var catText = "";
    var idList = [];
    for (var i = 0; i < categories.length; i++) {
      var c = categories[i];
      var p = getPersons(c.name);
      idList.push(String(c.id));
      catText += '- ID "' + c.id + '" name "' + c.name + '" = ' + p + ' person(s), base ' + c.base_price + ' EUR, min ' + c.min_price + ' EUR\n';
    }

    var searchInstructions = "";
    for (var i = 0; i < categories.length; i++) {
      var c = categories[i];
      var p = getPersons(c.name);
      searchInstructions += '- For "' + c.name + '": search Booking.com for ' + p + ' adult(s)\n';
    }

    var suggFormat = "";
    for (var i = 0; i < categories.length; i++) {
      if (i > 0) suggFormat += ",";
      suggFormat += '"' + categories[i].id + '":[{"date":"' + dateFrom + '","price":70,"reason":"example"}]';
    }

    var prompt = 'You are a hotel pricing AI for Hotel Europa Ruesselsheim (3-star, 7.5/10 rating, near Frankfurt Airport).\n\n';
    prompt += 'TASK: Search Booking.com for hotel prices near Ruesselsheim and Frankfurt Airport.\n';
    prompt += 'Search period: ' + dateFrom + ' to ' + dateTo + '\n\n';
    prompt += 'IMPORTANT: On Booking.com you search by NUMBER OF PERSONS, not room name.\n';
    prompt += searchInstructions + '\n';
    prompt += 'Our categories:\n' + catText + '\n';
    prompt += 'RULES:\n';
    prompt += '- All prices in EUR as integers\n';
    prompt += '- Never below minimum price\n';
    prompt += '- Occupancy >80%: price 10-20% above market\n';
    prompt += '- Occupancy <50%: price 5-15% below market but above minimum\n';
    prompt += '- Weekend Fri/Sat: +10-15%\n\n';
    prompt += 'Reply with ONLY this JSON, nothing else:\n';
    prompt += '{"competitors":[{"name":"Hotel X","stars":3,"rating":8,"price1p":55,"price2p":75,"price3p":95}],"suggestions":{' + suggFormat + '},"marketSummary":"kurze marktinfo"}\n\n';
    prompt += 'STRICT RULES:\n';
    prompt += '- Use EXACTLY these IDs: ' + idList.join(', ') + '\n';
    prompt += '- Dates as YYYY-MM-DD with zero padding\n';
    prompt += '- Prices as integers in EUR\n';
    prompt += '- No umlauts (use ae oe ue ss)\n';
    prompt += '- No newlines inside strings\n';
    prompt += '- No markdown or backticks\n';
    prompt += '- Only valid JSON, nothing before or after';

    console.log("fetch-prices: sending to Gemini, cats=" + categories.length + ", period=" + dateFrom + " to " + dateTo);

    var geminiUrl = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + apiKey;

    var geminiResp = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        tools: [{ google_search: {} }],
        generationConfig: { temperature: 0.2, maxOutputTokens: 4096 }
      })
    });

    if (!geminiResp.ok) {
      var errBody = await geminiResp.text();
      console.error("Gemini error " + geminiResp.status + ": " + errBody.slice(0, 300));
      return res.status(500).json({ error: "Gemini API " + geminiResp.status + ": " + errBody.slice(0, 200) });
    }

    var data = await geminiResp.json();

    // Text extrahieren
    var fullText = "";
    if (data.candidates && data.candidates[0] && data.candidates[0].content) {
      var parts = data.candidates[0].content.parts || [];
      for (var i = 0; i < parts.length; i++) {
        if (parts[i].text) fullText += parts[i].text;
      }
    }

    console.log("fetch-prices: got text length=" + fullText.length);

    if (!fullText) {
      return res.status(500).json({ error: "Keine Antwort von Gemini", raw: JSON.stringify(data).slice(0, 300) });
    }

    // JSON finden
    var clean = fullText.replace(/```json/g, "").replace(/```/g, "").trim();
    var match = clean.match(/\{[\s\S]*"suggestions"[\s\S]*\}/);

    if (!match) {
      console.error("fetch-prices: no JSON found in: " + clean.slice(0, 500));
      return res.status(500).json({ error: "Kein JSON in Antwort", raw: clean.slice(0, 500) });
    }

    // JSON bereinigen und parsen - 3 Versuche
    var parsed = null;
    var jsonRaw = match[0];

    // Versuch 1: Bereinigen
    try {
      var s = jsonRaw;
      s = s.replace(/[\x00-\x1F\x7F]/g, " ");
      s = s.replace(/\\n/g, " ");
      s = s.replace(/\n/g, " ");
      s = s.replace(/\r/g, " ");
      s = s.replace(/\t/g, " ");
      s = s.replace(/\s+/g, " ");
      s = s.replace(/,\s*}/g, "}");
      s = s.replace(/,\s*]/g, "]");
      parsed = JSON.parse(s);
      console.log("fetch-prices: parsed on attempt 1");
    } catch (e1) {
      console.log("fetch-prices: attempt 1 failed: " + e1.message);
      // Versuch 2: nur ASCII
      try {
        var s2 = jsonRaw.replace(/[^\x20-\x7E]/g, " ").replace(/\s+/g, " ");
        s2 = s2.replace(/,\s*}/g, "}").replace(/,\s*]/g, "]");
        parsed = JSON.parse(s2);
        console.log("fetch-prices: parsed on attempt 2");
      } catch (e2) {
        console.log("fetch-prices: attempt 2 failed: " + e2.message);
        // Versuch 3: Regex-Extraktion
        try {
          var suggestions = {};
          for (var ci = 0; ci < categories.length; ci++) {
            var cid = String(categories[ci].id);
            var items = [];
            // Suche nach date/price Paaren
            var dateRx = /\"date\"\s*:\s*\"(\d{4}-\d{1,2}-\d{1,2})\"\s*,\s*\"price\"\s*:\s*(\d+)/g;
            var dm;
            while ((dm = dateRx.exec(jsonRaw)) !== null) {
              items.push({ date: dm[1], price: parseInt(dm[2]), reason: "" });
            }
            if (items.length > 0) {
              // Teile items gleichmaessig auf Kategorien auf
              var perCat = Math.ceil(items.length / categories.length);
              var start = ci * perCat;
              var end = Math.min(start + perCat, items.length);
              suggestions[cid] = items.slice(start, end);
            }
          }
          if (Object.keys(suggestions).length > 0) {
            parsed = { suggestions: suggestions, competitors: [], marketSummary: "Daten extrahiert (Fallback)" };
            console.log("fetch-prices: parsed on attempt 3 (regex)");
          } else {
            return res.status(500).json({ error: "JSON nicht parsebar nach 3 Versuchen", raw: jsonRaw.slice(0, 500) });
          }
        } catch (e3) {
          return res.status(500).json({ error: "Parse-Fehler: " + e3.message, raw: jsonRaw.slice(0, 500) });
        }
      }
    }

    // Grounding-Quellen
    var gm = data.candidates && data.candidates[0] && data.candidates[0].groundingMetadata;
    if (gm && gm.groundingChunks) {
      parsed.sources = [];
      for (var i = 0; i < Math.min(gm.groundingChunks.length, 5); i++) {
        var ch = gm.groundingChunks[i];
        if (ch.web) parsed.sources.push({ title: ch.web.title, url: ch.web.uri });
      }
    }

    console.log("fetch-prices: success, suggestion keys=" + Object.keys(parsed.suggestions || {}).join(","));
    return res.status(200).json({ success: true, data: parsed });

  } catch (err) {
    console.error("fetch-prices: exception: " + err.message);
    return res.status(500).json({ error: err.message });
  }
}
