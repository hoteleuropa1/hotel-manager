// api/hrs-import.js
// Vercel Serverless Function - HRS Buchungsemail parsen und Reservierung anlegen
// Empfaengt Emails via Resend Inbound Webhook ODER manuellen Text-Paste

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Nur POST erlaubt" });

  const SB_URL = process.env.SUPABASE_URL || "https://ztdtkncoyrkvdpytwuhy.supabase.co";
  const SB_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

  if (!SB_KEY) {
    return res.status(500).json({ error: "SUPABASE_SERVICE_KEY fehlt in Vercel Environment Variables" });
  }

  try {
    var emailText = "";

    // Resend Inbound Webhook Format
    if (req.body && req.body.data && req.body.data.text) {
      emailText = req.body.data.text;
    }
    // Oder HTML von Resend
    else if (req.body && req.body.data && req.body.data.html) {
      emailText = req.body.data.html.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ");
    }
    // Manueller Text-Paste aus dem PMS
    else if (req.body && req.body.emailText) {
      emailText = req.body.emailText;
    }
    // Direkter Body als Text
    else if (typeof req.body === "string") {
      emailText = req.body;
    }

    if (!emailText || emailText.length < 50) {
      return res.status(400).json({ error: "Kein Email-Text empfangen", received: JSON.stringify(req.body).slice(0, 200) });
    }

    console.log("hrs-import: received text length=" + emailText.length);

    // === PARSER ===
    var parsed = parseHRSEmail(emailText);

    if (!parsed.checkIn || !parsed.checkOut) {
      return res.status(400).json({ error: "Konnte An-/Abreise nicht erkennen", parsed: parsed, preview: emailText.slice(0, 500) });
    }
    if (!parsed.lastName) {
      return res.status(400).json({ error: "Konnte Gastname nicht erkennen", parsed: parsed });
    }

    console.log("hrs-import: parsed:", JSON.stringify(parsed));

    // === SUPABASE: Zimmertyp zuordnen ===
    var sbHeaders = {
      "Content-Type": "application/json",
      "apikey": SB_KEY,
      "Authorization": "Bearer " + SB_KEY,
      "Prefer": "return=representation"
    };

    // Unit Types laden
    var utResp = await fetch(SB_URL + "/rest/v1/unit_types?order=sort_order", { headers: sbHeaders });
    var unitTypes = await utResp.json();

    // Zimmertyp matchen
    var matchedUT = matchRoomType(parsed.roomType, unitTypes);
    if (!matchedUT) {
      return res.status(400).json({
        error: "Zimmertyp nicht zugeordnet: " + parsed.roomType,
        parsed: parsed,
        availableTypes: unitTypes.map(function(u) { return u.name; })
      });
    }

    // Freies Zimmer finden
    var roomsResp = await fetch(SB_URL + "/rest/v1/rooms?unit_type_id=eq." + matchedUT.id + "&active=eq.true&order=name", { headers: sbHeaders });
    var rooms = await roomsResp.json();

    var resResp = await fetch(SB_URL + "/rest/v1/reservations?status=neq.storniert&status=neq.abgelehnt&status=neq.checkedout&select=id,room_id,check_in,check_out,status", { headers: sbHeaders });
    var existingRes = await resResp.json();

    var freeRoom = null;
    for (var i = 0; i < rooms.length; i++) {
      var room = rooms[i];
      var conflict = existingRes.some(function(r) {
        return r.room_id === room.id && parsed.checkIn < r.check_out && parsed.checkOut > r.check_in;
      });
      if (!conflict) { freeRoom = room; break; }
    }

    if (!freeRoom) {
      return res.status(400).json({
        error: "Kein freies Zimmer fuer " + matchedUT.name + " im Zeitraum " + parsed.checkIn + " - " + parsed.checkOut,
        parsed: parsed
      });
    }

    // === GAST ANLEGEN ===
    var guestData = {
      salutation: parsed.salutation || "",
      first_name: parsed.firstName || "",
      last_name: parsed.lastName || "",
      email: parsed.email || "",
      phone: parsed.phone || "",
      company: parsed.company || "",
      address: parsed.address || "",
      zip: parsed.zip || "",
      city: parsed.city || "",
      country: parsed.country || "DE"
    };

    var guestResp = await fetch(SB_URL + "/rest/v1/guests", {
      method: "POST", headers: sbHeaders, body: JSON.stringify(guestData)
    });
    var guestArr = await guestResp.json();
    if (!guestArr || !guestArr[0]) {
      return res.status(500).json({ error: "Gast konnte nicht angelegt werden", detail: JSON.stringify(guestArr).slice(0, 300) });
    }
    var guest = guestArr[0];

    // === RESERVIERUNG ANLEGEN ===
    var nights = Math.max(1, Math.round((new Date(parsed.checkOut) - new Date(parsed.checkIn)) / 86400000));
    var otoken = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0; return (c === "x" ? r : (r & 0x3 | 0x8)).toString(16);
    });

    var resData = {
      room_id: freeRoom.id,
      guest_id: guest.id,
      check_in: parsed.checkIn,
      check_out: parsed.checkOut,
      status: "reservierung",
      adults: parsed.adults || 1,
      children: 0,
      total_price: parsed.totalPrice || 0,
      source: "hrs",
      offer_token: otoken,
      notes: "HRS Import | Vorgangs-Nr: " + (parsed.hrsVorgangNr || "-") +
             " | Buchungs-Nr: " + (parsed.hrsBuchungsNr || "-") +
             (parsed.breakfast ? " | Fruehstueck: " + parsed.breakfastPrice + " EUR/Pers." : "") +
             (parsed.rateName ? " | Tarif: " + parsed.rateName : "") +
             (parsed.cancellationDeadline ? " | Storno bis: " + parsed.cancellationDeadline : "")
    };

    var newResResp = await fetch(SB_URL + "/rest/v1/reservations", {
      method: "POST", headers: sbHeaders, body: JSON.stringify(resData)
    });
    var newResArr = await newResResp.json();
    if (!newResArr || !newResArr[0]) {
      return res.status(500).json({ error: "Reservierung konnte nicht angelegt werden", detail: JSON.stringify(newResArr).slice(0, 300) });
    }
    var newRes = newResArr[0];

    console.log("hrs-import: SUCCESS res=" + newRes.id + " room=" + freeRoom.name + " guest=" + guest.last_name);

    return res.status(200).json({
      success: true,
      message: "HRS-Buchung importiert",
      reservation: {
        id: newRes.id,
        number: newRes.reservation_number || newRes.id,
        room: freeRoom.name,
        roomType: matchedUT.name,
        guest: guest.first_name + " " + guest.last_name,
        checkIn: parsed.checkIn,
        checkOut: parsed.checkOut,
        price: parsed.totalPrice,
        hrsNr: parsed.hrsBuchungsNr
      },
      parsed: parsed
    });

  } catch (err) {
    console.error("hrs-import: exception:", err.message, err.stack);
    return res.status(500).json({ error: err.message });
  }
}

// === HRS EMAIL PARSER ===
function parseHRSEmail(text) {
  // Normalisieren
  var t = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").replace(/\t/g, " ");

  var result = {
    hrsVorgangNr: extract(t, /(?:HRS\s*Vorgangs-Nr[.:\s]*|Vorgangs-Nr[.:\s]*)(\d+)/i),
    hrsBuchungsNr: extract(t, /Buchungsnummer[:\s]*(\d+)/i),
    lastName: "",
    firstName: "",
    salutation: "",
    email: "",
    phone: "",
    company: "",
    address: "",
    zip: "",
    city: "",
    country: "",
    checkIn: "",
    checkOut: "",
    roomType: "",
    rateName: "",
    totalPrice: 0,
    breakfast: false,
    breakfastPrice: 0,
    adults: 1,
    cancellationDeadline: "",
    guaranteed: false
  };

  // Gastname: "NACHNAME, Vorname" Format - auch mehrteilige Nachnamen wie "DE FILIPPO"
  var nameMatch = t.match(/Anreisende\s*G[aä]ste[:\s]*([A-Z\u00C0-\u00FF][A-Z\u00C0-\u00FF\s'-]+),\s*([A-Za-z\u00C0-\u00FF\s'-]+)/);
  if (nameMatch) {
    var rawLast = nameMatch[1].trim();
    result.firstName = nameMatch[2].trim();
    // Title Case fuer Nachname: "DE FILIPPO" -> "De Filippo"
    result.lastName = rawLast.split(/\s+/).map(function(w) {
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    }).join(" ");
  }

  // An-/Abreise: "Di. 14.04.2026 - Mi. 15.04.2026"
  var dateMatch = t.match(/Anreise\s*\/?\s*Abreise[:\s]*(?:[A-Za-z.]+\s+)?(\d{1,2})\.(\d{1,2})\.(\d{4})\s*-\s*(?:[A-Za-z.]+\s+)?(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  if (dateMatch) {
    result.checkIn = dateMatch[3] + "-" + dateMatch[2].padStart(2, "0") + "-" + dateMatch[1].padStart(2, "0");
    result.checkOut = dateMatch[6] + "-" + dateMatch[5].padStart(2, "0") + "-" + dateMatch[4].padStart(2, "0");
  }

  // Zimmertyp: "1. Standardzimmer : Flex Tarif (DZ)"
  var roomMatch = t.match(/\d+\.\s*([^(:\n]+?)(?:\s*:\s*([^(\n]+?))?\s*\(([A-Z]{2,4})\)/);
  if (roomMatch) {
    result.roomType = (roomMatch[3] || "").trim(); // DZ, EZ, etc.
    result.rateName = (roomMatch[2] || "").trim();
    if (!result.roomType) result.roomType = (roomMatch[1] || "").trim();
  }

  // Gesamtpreis: "79,00 EUR"
  var priceMatch = t.match(/Zimmer-Gesamtpreis\s*\(?[^)]*\)?[:\s]*([\d.,]+)\s*EUR/i);
  if (priceMatch) {
    result.totalPrice = parseFloat(priceMatch[1].replace(".", "").replace(",", "."));
  }
  // Fallback: Gesamtpreis
  if (!result.totalPrice) {
    var gpMatch = t.match(/Gesamtpreis[:\s]*([\d.,]+)\s*EUR/i);
    if (gpMatch) result.totalPrice = parseFloat(gpMatch[1].replace(".", "").replace(",", "."));
  }

  // Fruehstueck: "zzgl. 14,00 EUR Frühstück"
  var bfMatch = t.match(/zzgl\.\s*([\d.,]+)\s*EUR\s*Fr[uü]hst[uü]ck/i);
  if (bfMatch) {
    result.breakfast = true;
    result.breakfastPrice = parseFloat(bfMatch[1].replace(",", "."));
  }

  // Stornierungsfrist
  var stornoMatch = t.match(/Stornierung\s*(?:nur\s*)?m[oö]glich\s*bis\s*(\d{1,2}\.\d{1,2}\.\d{4})\s*(\d{1,2}:\d{2})?/i);
  if (stornoMatch) {
    result.cancellationDeadline = stornoMatch[1] + (stornoMatch[2] ? " " + stornoMatch[2] : "");
  }

  // Garantierte Buchung
  if (t.indexOf("Garantierte Buchung") >= 0) {
    result.guaranteed = true;
  }

  // Rechnungsadresse parsen
  var addrMatch = t.match(/Rechnungsadresse\s*([\s\S]*?)(?:Mehrwertsteuer|Gesamtpreis|Gratisleistungen)/i);
  if (addrMatch) {
    var addrBlock = addrMatch[1].trim();
    var lines = addrBlock.split(/\n/).map(function(l) { return l.trim(); }).filter(function(l) { return l.length > 1; });

    // Erste Zeile ist oft Firmenname
    if (lines.length >= 3) {
      // Prüfe ob erste Zeile eine Firma ist (nicht der Gastname)
      if (lines[0] && lines[0] !== result.firstName + " " + result.lastName &&
          !lines[0].match(/^(Herr|Frau)\s/)) {
        result.company = lines[0];
      }
      // Suche PLZ+Ort Zeile
      for (var i = 0; i < lines.length; i++) {
        var plzMatch = lines[i].match(/^(\d{4,5})\s+(.+)/);
        if (plzMatch) {
          result.zip = plzMatch[1];
          result.city = plzMatch[2];
          if (i > 0) result.address = lines[i - 1];
          if (i + 1 < lines.length) result.country = mapCountry(lines[i + 1]);
          break;
        }
        // Internationales Format: "20121 Milano"
        var intPlzMatch = lines[i].match(/^(\d{4,6})\s+(.+)/);
        if (intPlzMatch) {
          result.zip = intPlzMatch[1];
          result.city = intPlzMatch[2];
          if (i > 0) result.address = lines[i - 1];
          if (i + 1 < lines.length) result.country = mapCountry(lines[i + 1]);
          break;
        }
      }
    }
  }

  // Personen aus Zimmertyp ableiten
  if (result.roomType) {
    var rt = result.roomType.toUpperCase();
    if (rt === "EZ" || rt.indexOf("EINZEL") >= 0 || rt.indexOf("SINGLE") >= 0) result.adults = 1;
    else if (rt === "DZ" || rt === "DBZ" || rt.indexOf("DOPPEL") >= 0 || rt.indexOf("DOUBLE") >= 0 || rt.indexOf("ZWEIBETT") >= 0) result.adults = 2;
    else if (rt === "DRZ" || rt.indexOf("DREI") >= 0 || rt.indexOf("TRIPLE") >= 0) result.adults = 3;
    else result.adults = 2;
  }

  return result;
}

function extract(text, regex) {
  var m = text.match(regex);
  return m ? m[1].trim() : "";
}

function mapCountry(name) {
  var n = (name || "").toLowerCase().trim();
  var map = {
    "deutschland": "DE", "germany": "DE", "de": "DE",
    "italien": "IT", "italy": "IT", "italia": "IT", "it": "IT",
    "frankreich": "FR", "france": "FR", "fr": "FR",
    "schweiz": "CH", "switzerland": "CH", "ch": "CH",
    "oesterreich": "AT", "austria": "AT", "at": "AT",
    "niederlande": "NL", "netherlands": "NL", "nl": "NL",
    "belgien": "BE", "belgium": "BE", "be": "BE",
    "spanien": "ES", "spain": "ES", "es": "ES",
    "polen": "PL", "poland": "PL", "pl": "PL",
    "grossbritannien": "GB", "united kingdom": "GB", "gb": "GB", "uk": "GB"
  };
  return map[n] || name.slice(0, 2).toUpperCase();
}

function matchRoomType(hrsType, unitTypes) {
  var code = (hrsType || "").toUpperCase().trim();

  // Direktes Kuerzel-Matching
  for (var i = 0; i < unitTypes.length; i++) {
    var ut = unitTypes[i];
    var sn = (ut.short_name || "").toUpperCase();
    if (sn === code) return ut;
  }

  // Keyword-Matching
  var keywords = {
    "EZ": ["einzel", "single"],
    "DZ": ["doppel", "double", "zweibett", "twin"],
    "DBZ": ["dreibett", "triple", "drei"],
    "DRZ": ["dreibett", "triple", "drei"],
    "ZBZ": ["zweibett", "twin"],
    "FZ": ["famili", "family", "vier"]
  };

  var kws = keywords[code];
  if (kws) {
    for (var i = 0; i < unitTypes.length; i++) {
      var name = unitTypes[i].name.toLowerCase();
      for (var k = 0; k < kws.length; k++) {
        if (name.indexOf(kws[k]) >= 0) return unitTypes[i];
      }
    }
  }

  // Fallback: Kapazitaet
  var persons = code === "EZ" ? 1 : code === "DZ" ? 2 : code === "DBZ" ? 3 : 2;
  for (var i = 0; i < unitTypes.length; i++) {
    if (unitTypes[i].capacity === persons) return unitTypes[i];
  }

  return unitTypes[0] || null;
}
