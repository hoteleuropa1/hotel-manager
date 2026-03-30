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

    // Einfache IDs fuer Gemini (UUIDs sind zu komplex)
    var simpleIds = {};
    var reverseIds = {};
    for (var i = 0; i < categories.length; i++) {
      var simpleId = String(i + 1);
      simpleIds[categories[i].id] = simpleId;
      reverseIds[simpleId] = categories[i].id;
    }

    var catText = "";
    for (var i = 0; i < categories.length; i++) {
      var c = categories[i];
      var p = getPersons(c.name);
      var sid = simpleIds[c.id];
      catText += '- ID "' + sid + '" name "' + c.name + '" = ' + p + ' person(s), base ' + c.base_price + ' EUR, min ' + c.min_price + ' EUR\n';
    }

    var searchInstructions = "";
    for (var i = 0; i < categories.length; i++) {
      var c = categories[i];
      var p = getPersons(c.name);
      searchInstructions += '- For "' + c.name + '" (ID "' + simpleIds[c.id] + '"): search Booking.com for ' + p + ' adult(s)\n';
    }

    var suggFormat = "";
    for (var i = 0; i < categories.length; i++) {
      if (i > 0) suggFormat += ",";
      var sid = simpleIds[categories[i].id];
      suggFormat += '"' + sid + '":[{"date":"' + dateFrom + '","price":70,"reason":"example"}]';
    }

    var prompt = 'You are a hotel pricing AI for Hotel Europa Ruesselsheim (3-star, 6.2/10 rating, near Frankfurt Airport).\n\n';
    prompt += 'TASK: Search Booking.com for hotel prices near Ruesselsheim and Frankfurt Airport.\n';
    prompt += 'Search period: ' + dateFrom + ' to ' + dateTo + '\n\n';
    prompt += 'IMPORTANT: On Booking.com you search by NUMBER OF PERSONS, not room name.\n';
    prompt += searchInstructions + '\n';
    prompt += 'Our categories:\n' + catText + '\n';
    prompt += 'CRITICAL PRICING LOGIC:\n';
    prompt += '- We are a 3-star hotel with only 6.2/10 rating - this is BELOW AVERAGE, we must compete on PRICE\n';
    prompt += '- Our rating is one of the lowest in the area - price is our main advantage\n';
    prompt += '- RULE 1: We must ALWAYS be cheaper than any hotel with a better rating than 6.2\n';
    prompt += '- RULE 2: If competitor has 7.0+ rating, we must be at least 10-15% CHEAPER than them\n';
    prompt += '- RULE 3: If competitor has 8.0+ rating, we must be at least 15-25% CHEAPER than them\n';
    prompt += '- RULE 4: We can only match or slightly exceed hotels rated below 6.2\n';
    prompt += '- RULE 5: Our price should be the BEST DEAL in the area for budget-conscious travelers\n';
    prompt += '- Example: Fly Inn has 7.1 rating at 51 EUR -> we should be 42-46 EUR (at least 10% below)\n';
    prompt += '- Example: A 8.5 rated hotel at 89 EUR -> we should be 65-72 EUR (20%+ below)\n';
    prompt += '- The lower our occupancy, the more aggressive (cheaper) we price\n';
    prompt += '- Only price near market average when occupancy is >90%\n\n';
    prompt += 'ADDITIONAL RULES:\n';
    prompt += '- All prices in EUR as integers\n';
    prompt += '- Never below minimum price\n';
    prompt += '- NO weekend surcharge - price purely based on market and competitors\n';
    prompt += '- Same logic for every day of the week - only competitor prices and our occupancy matter\n';
    prompt += 'Reply with ONLY this JSON, nothing else:\n';
    prompt += '{"competitors":[{"name":"Hotel X","stars":3,"rating":8,"price1p":55,"price2p":75,"price3p":95}],"suggestions":{' + suggFormat + '},"marketSummary":"kurze marktinfo"}\n\n';
    prompt += 'In the "reason" field, ALWAYS show the price positioning vs nearest competitor, e.g.:\n';
    prompt += '- "10% unter Fly Inn (7.1) 51EUR" = we are 10% below better-rated Fly Inn\n';
    prompt += '- "Guenstigstes Angebot im Markt" = we are cheapest\n';
    prompt += '- "Min-Preis, Markt bei 55EUR" = we hit our minimum, market is higher\n\n';
    prompt += 'STRICT RULES:\n';
    prompt += '- Use EXACTLY these simple IDs: ' + categories.map(function(c,i){return String(i+1)}).join(', ') + '\n';
    prompt += '- You MUST return suggestions for ALL ' + categories.length + ' categories, not just one\n';
    prompt += '- Each category MUST have entries for every day in the period\n';
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

    // Simple IDs zurueck auf echte UUIDs mappen
    var mappedSugg = {};
    var suggKeys = Object.keys(parsed.suggestions || {});
    console.log("fetch-prices: suggestion keys from Gemini: " + suggKeys.join(", "));

    for (var i = 0; i < suggKeys.length; i++) {
      var sKey = suggKeys[i];
      var realId = reverseIds[sKey];
      if (realId) {
        // Direkt-Match ueber simple ID
        mappedSugg[realId] = parsed.suggestions[sKey];
        console.log("fetch-prices: mapped " + sKey + " -> " + realId + " (" + parsed.suggestions[sKey].length + " days)");
      } else if (i < categories.length) {
        // Fallback: Position
        mappedSugg[categories[i].id] = parsed.suggestions[sKey];
        console.log("fetch-prices: position-mapped " + sKey + " -> " + categories[i].id);
      }
    }

    // Falls weniger Keys als Kategorien: auch per Position zuordnen
    if (suggKeys.length < categories.length && suggKeys.length > 0) {
      for (var i = 0; i < categories.length; i++) {
        if (!mappedSugg[categories[i].id] && i < suggKeys.length) {
          mappedSugg[categories[i].id] = parsed.suggestions[suggKeys[i]];
          console.log("fetch-prices: fallback-mapped " + suggKeys[i] + " -> " + categories[i].id);
        }
      }
    }

    parsed.suggestions = mappedSugg;

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
