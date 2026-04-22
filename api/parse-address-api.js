// api/parse-address.js
module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Nur POST erlaubt" });

  var body = req.body || {};
  var text = body.text || "";
  if (!text || text.trim().length < 3) return res.status(400).json({ success: false, error: "Kein Text" });

  var GKEY = process.env.GOOGLE_AI_KEY;
  if (GKEY) {
    try {
      var gResult = await parseWithGemini(text.trim(), GKEY);
      if (gResult) return res.status(200).json({ success: true, parsed: gResult });
    } catch (e) { console.error("Gemini:", e.message); }
  }
  return res.status(200).json({ success: true, parsed: parseWithRegex(text.trim()), method: "regex" });
};

async function parseWithGemini(text, apiKey) {
  var prompt = "Analysiere diese Adresse und extrahiere die Felder. Antworte NUR mit JSON, keine Markdown-Backticks.\nFelder: salutation (Herr/Frau/Firma/leer), first_name, last_name, company (nur wenn Firma), email, phone, address (Strasse + Nr), zip, city, country (2-Buchstaben ISO, Default DE)\n\nText: " + text + "\n\nJSON:";
  var resp = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=" + apiKey, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.1, maxOutputTokens: 500 } })
  });
  if (!resp.ok) throw new Error(resp.status);
  var data = await resp.json();
  var raw = ""; try { raw = data.candidates[0].content.parts[0].text; } catch (e) { return null; }
  var jsonStr = raw.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
  try { return JSON.parse(jsonStr); } catch (e) {
    var m = jsonStr.match(/\{[\s\S]*\}/);
    if (m) try { return JSON.parse(m[0]); } catch (e2) {}
    return null;
  }
}

function parseWithRegex(text) {
  var r = { salutation: "", first_name: "", last_name: "", company: "", email: "", phone: "", address: "", zip: "", city: "", country: "DE" };
  var t = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").replace(/\t/g, " ");
  var lines = t.split("\n").map(function(l) { return l.trim(); }).filter(function(l) { return l.length > 0; });

  var emailM = t.match(/[\w.\-+]+@[\w.\-]+\.\w{2,}/);
  if (emailM) r.email = emailM[0];

  var phoneM = t.match(/(?:Tel\.?|Telefon|Phone|Fon|Mob\.?|Mobil)[:\s]*([\+\d][\d\s\-\/\.]{6,})/i);
  if (phoneM) r.phone = phoneM[1].trim();
  if (!r.phone) { var pM = t.match(/(\+\d{2}[\d\s\-\/\.]{8,})/); if (pM) r.phone = pM[1].trim(); }

  var firmaLine = "";
  for (var i = 0; i < lines.length; i++) {
    if (lines[i].match(/GmbH|AG|KG|Ltd|Inc|UG|OHG|e\.V\.|mbH|Co\.|gGmbH|SE|S\.A\.|S\.P\.A\.|S\.R\.L\.|BV|LLC/i)) {
      firmaLine = lines[i]; r.company = lines[i].replace(/,\s*$/, "").trim(); r.salutation = "Firma"; break;
    }
  }

  for (var j = 0; j < lines.length; j++) {
    var line = lines[j];
    if (line === firmaLine || line === r.email || line === r.phone) continue;
    var aM = line.match(/^(Herrn?|Frau|Mr\.?|Mrs\.?|Ms\.?)\s+(.+)/i);
    if (aM) {
      var sal = aM[1].toLowerCase();
      if (sal === "herr" || sal === "herrn" || sal === "mr" || sal === "mr.") r.salutation = "Herr";
      else r.salutation = "Frau";
      var np = aM[2].trim().split(/\s+/);
      r.first_name = np[0] || ""; r.last_name = np.slice(1).join(" ") || ""; break;
    }
    if (!r.first_name && !line.match(/^\d/) && !line.match(/GmbH|AG|KG|Ltd|@/i) && line.split(/\s+/).length >= 2 && line.split(/\s+/).length <= 5) {
      var pts = line.replace(/,\s*$/, "").split(/\s+/);
      if (!pts[pts.length - 1].match(/^\d/)) { r.first_name = pts[0] || ""; r.last_name = pts.slice(1).join(" ") || ""; }
    }
  }

  var plzM = t.match(/(\d{4,5})\s+([A-Za-z\u00C0-\u00FF][A-Za-z\u00C0-\u00FF\s\-]+?)(?:\s*\n|\s*,|\s*$)/m);
  if (plzM) { r.zip = plzM[1]; r.city = plzM[2].trim(); }

  for (var k = 0; k < lines.length; k++) {
    var sL = lines[k];
    if (sL === firmaLine || sL.includes("@") || sL === r.first_name + " " + r.last_name) continue;
    var sM = sL.match(/^([A-Za-z\u00C0-\u00FF][\w\u00C0-\u00FF.\-\s]+?)\s+(\d+\s*[a-zA-Z]?(?:\s*[-\/]\s*\d+)?)\s*$/);
    if (sM && !sL.match(/^\d{4,5}/)) { r.address = sM[1].trim() + " " + sM[2].trim(); break; }
    var sM2 = sL.match(/^([A-Za-z\u00C0-\u00FF][\w\u00C0-\u00FF.\-\s]+\s+\d+\s*[a-zA-Z]?)\s*[,]?\s*$/);
    if (sM2 && !sL.match(/^\d{4,5}/) && sL !== r.city && !sL.includes("@")) { r.address = sM2[1].trim(); break; }
  }

  var cMap = { deutschland: "DE", germany: "DE", oesterreich: "AT", austria: "AT", schweiz: "CH", switzerland: "CH", italien: "IT", italy: "IT", frankreich: "FR", france: "FR", niederlande: "NL", belgien: "BE", polen: "PL", tschechien: "CZ", spanien: "ES", portugal: "PT", luxemburg: "LU" };
  var last = lines[lines.length - 1].toLowerCase().trim();
  if (last.length === 2 && last.match(/^[a-z]{2}$/)) r.country = last.toUpperCase();
  else if (cMap[last]) r.country = cMap[last];

  return r;
}
