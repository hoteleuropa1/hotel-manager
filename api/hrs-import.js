const SB_URL = "https://ztdtkncoyrkvdpytwuhy.supabase.co";

async function sbGet(table, query, key) {
  const r = await fetch(SB_URL + "/rest/v1/" + table + "?" + query, {
    headers: { apikey: key, Authorization: "Bearer " + key }
  });
  return r.json();
}

async function sbPost(table, data, key) {
  const r = await fetch(SB_URL + "/rest/v1/" + table, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: key, Authorization: "Bearer " + key, Prefer: "return=representation" },
    body: JSON.stringify(data)
  });
  if (!r.ok) { const t = await r.text(); throw new Error(r.status + " " + t.slice(0, 200)); }
  return r.json();
}

function extract(text, regex) {
  var m = text.match(regex);
  return m ? m[1].trim() : "";
}

function mapCountry(name) {
  var n = (name || "").toLowerCase().trim();
  var map = {
    "deutschland":"DE","germany":"DE","italien":"IT","italy":"IT","italia":"IT",
    "frankreich":"FR","france":"FR","schweiz":"CH","switzerland":"CH",
    "oesterreich":"AT","österreich":"AT","austria":"AT","niederlande":"NL","netherlands":"NL",
    "belgien":"BE","belgium":"BE","spanien":"ES","spain":"ES","polen":"PL","poland":"PL",
    "grossbritannien":"GB","großbritannien":"GB","united kingdom":"GB","uk":"GB",
    "tschechien":"CZ","czech republic":"CZ","daenemark":"DK","dänemark":"DK","denmark":"DK",
    "schweden":"SE","sweden":"SE","norwegen":"NO","norway":"NO","portugal":"PT",
    "ungarn":"HU","hungary":"HU","rumaenien":"RO","rumänien":"RO","romania":"RO",
    "bulgarien":"BG","bulgaria":"BG","kroatien":"HR","croatia":"HR",
    "slowakei":"SK","slovakia":"SK","slowenien":"SI","slovenia":"SI",
    "luxemburg":"LU","luxembourg":"LU","irland":"IE","ireland":"IE",
    "griechenland":"GR","greece":"GR","tuerkei":"TR","türkei":"TR","turkey":"TR"
  };
  return map[n] || (n.length === 2 ? n.toUpperCase() : n.slice(0, 2).toUpperCase());
}

function matchRoomType(hrsType, unitTypes) {
  var code = (hrsType || "").toUpperCase().trim();
  for (var i = 0; i < unitTypes.length; i++) {
    if ((unitTypes[i].short_name || "").toUpperCase() === code) return unitTypes[i];
  }
  var keywords = {
    "EZ":["einzel","single"],"DZ":["doppel","double"],"DBZ":["dreibett","triple","drei"],
    "DRZ":["dreibett","triple","drei"],"ZBZ":["zweibett","twin"],"FZ":["famili","family","vier"]
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
  var persons = code === "EZ" ? 1 : code === "DZ" ? 2 : code === "DBZ" || code === "DRZ" ? 3 : 2;
  for (var i = 0; i < unitTypes.length; i++) {
    if (unitTypes[i].capacity === persons) return unitTypes[i];
  }
  return unitTypes[0] || null;
}

function parseHRSEmail(text) {
  var t = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n").replace(/\t/g, " ");

  var result = {
    hrsVorgangNr: extract(t, /(?:HRS\s*Vorgangs-Nr[.:\s]*|Vorgangs-Nr[.:\s]*)(\d+)/i),
    hrsBuchungsNr: extract(t, /Buchungsnummer[:\s]*(\d+)/i),
    lastName: "", firstName: "", salutation: "",
    email: "", phone: "",
    company: "", address: "", zip: "", city: "", country: "DE",
    checkIn: "", checkOut: "",
    roomType: "", rateName: "",
    totalPrice: 0, breakfast: false, breakfastPrice: 0,
    adults: 1, cancellationDeadline: "", guaranteed: false,
    guestWishes: "",
    buchungsart: "",
    zahlungsart: "",
    kreditkartenInfo: "",
    creditCardPayment: false
  };

  // Gastname: "NACHNAME, Vorname"
  var nameMatch = t.match(/Anreisende\s*G[aä]ste[:\s]*([A-Z\u00C0-\u00FF][A-Z\u00C0-\u00FF\s'\-]+),\s*([A-Za-z\u00C0-\u00FF'\-\s]+?)(?=Anreise|Abreise|\d|\n|$)/);
  if (nameMatch) {
    var rawLast = nameMatch[1].trim();
    result.firstName = nameMatch[2].trim();
    result.lastName = rawLast.split(/\s+/).map(function(w) {
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    }).join(" ");
  }

  // An-/Abreise
  var dateMatch = t.match(/Anreise\s*\/?\s*Abreise[:\s]*(?:[A-Za-z.]+\s+)?(\d{1,2})\.(\d{1,2})\.(\d{4})\s*-\s*(?:[A-Za-z.]+\s+)?(\d{1,2})\.(\d{1,2})\.(\d{4})/);
  if (dateMatch) {
    result.checkIn = dateMatch[3] + "-" + dateMatch[2].padStart(2, "0") + "-" + dateMatch[1].padStart(2, "0");
    result.checkOut = dateMatch[6] + "-" + dateMatch[5].padStart(2, "0") + "-" + dateMatch[4].padStart(2, "0");
  }

  // Zimmertyp: "1. Standardzimmer : Flex Tarif (EZ)"
  var roomMatch = t.match(/\d+\.\s*([^(:\n]+?)(?:\s*:\s*([^(\n]+?))?\s*\(([A-Z]{2,4})\)/);
  if (roomMatch) {
    result.roomType = (roomMatch[3] || "").trim();
    result.rateName = (roomMatch[2] || "").trim();
    if (!result.roomType) result.roomType = (roomMatch[1] || "").trim();
  }

  // Gesamtpreis
  var priceMatch = t.match(/Zimmer-Gesamtpreis\s*\(?[^)]*\)?[:\s]*([\d.,]+)\s*EUR/i);
  if (priceMatch) {
    result.totalPrice = parseFloat(priceMatch[1].replace(".", "").replace(",", "."));
  }
  if (!result.totalPrice) {
    var gpMatch = t.match(/Gesamtpreis[:\s]*([\d.,]+)\s*EUR/i);
    if (gpMatch) result.totalPrice = parseFloat(gpMatch[1].replace(".", "").replace(",", "."));
  }

  // Fruehstueck
  var bfMatch = t.match(/(?:zzgl\.|inkl\.|\+)\s*([\d.,]+)\s*EUR\s*(?:Fr[uü]hst[uü]ck|Breakfast)/i);
  if (!bfMatch) bfMatch = t.match(/Fr[uü]hst[uü]ck\s*\(\+?\s*([\d.,]+)\s*EUR\)/i);
  if (!bfMatch) bfMatch = t.match(/exkl\.\s*Fr[uü]hst[uü]ck\s*\(\+\s*([\d.,]+)\s*EUR\)/i);
  if (bfMatch) {
    result.breakfast = true;
    result.breakfastPrice = parseFloat(bfMatch[1].replace(",", "."));
  }

  // Stornierungsfrist
  var stornoMatch = t.match(/Stornierung\s*(?:nur\s*)?m[oö]glich\s*bis\s*(\d{1,2}\.\d{1,2}\.\d{4})\s*(\d{1,2}:\d{2})?/i);
  if (stornoMatch) {
    result.cancellationDeadline = stornoMatch[1] + (stornoMatch[2] ? " " + stornoMatch[2] : "");
  }
  // Auch "kann nicht mehr kostenfrei storniert werden"
  if (t.match(/kann nicht mehr kostenfrei storniert werden/i)) {
    result.cancellationDeadline = "nicht stornierbar";
  }

  // Garantierte Buchung
  if (t.indexOf("Garantierte Buchung") >= 0) result.guaranteed = true;

  // Gastwuensche
  var wishMatch = t.match(/W[uü]nsche\s*an\s*das\s*Hotel\s*([\s\S]*?)(?:Mehrwertsteuer|Gesamtpreis|Gratisleistungen|$)/i);
  if (wishMatch) {
    result.guestWishes = wishMatch[1].trim().replace(/\n+/g, ", ").substring(0, 500);
  }

  // Buchungsart
  var buchungsartMatch = t.match(/Buchungsart[:\s]*([^\n]*?)(?:Stornierung|Kreditkarten|$)/i);
  if (buchungsartMatch) result.buchungsart = buchungsartMatch[1].trim().substring(0, 300);

  // Zahlungsart
  var zahlungsartMatch = t.match(/Zahlungsart[:\s]*([^\n]*?)(?:Rechnungsadresse|W[uü]nsche|Mehrwertsteuer|$)/i);
  if (zahlungsartMatch) result.zahlungsart = zahlungsartMatch[1].trim().substring(0, 300);

  // Kreditkarten-Angaben
  var kkMatch = t.match(/Kreditkarten-Angaben\s*([\s\S]*?)(?:Stornierungsgeb|Zahlungsart|$)/i);
  if (kkMatch) result.kreditkartenInfo = kkMatch[1].trim().replace(/\n+/g, " ").substring(0, 300);

  // Kreditkartenzahlung erkennen
  if (result.zahlungsart && result.zahlungsart.match(/belasten\s*Sie\s*die\s*hinterlegte\s*Kreditkarte/i)) {
    result.creditCardPayment = true;
  }

  // Rechnungsadresse parsen
  var addrMatch = t.match(/Rechnungsadresse\s*([\s\S]*?)(?:W[uü]nsche|Mehrwertsteuer|Gesamtpreis|Gratisleistungen)/i);
  if (addrMatch) {
    var addrBlock = addrMatch[1].trim();

    // Versuche zuerst Zeilenweise
    var lines = addrBlock.split(/\n/).map(function(l) { return l.trim(); }).filter(function(l) { return l.length > 1; });

    if (lines.length >= 3) {
      // Mehrzeilig: Firma, Name, Strasse, PLZ Ort, Land
      if (lines[0] && !lines[0].match(/^\d/) && lines[0] !== result.firstName + " " + result.lastName) {
        result.company = lines[0];
      }
      for (var i = 0; i < lines.length; i++) {
        var plzM = lines[i].match(/^(\d{4,5})\s+(.+)/);
        if (plzM) {
          result.zip = plzM[1];
          result.city = plzM[2];
          if (i > 0 && !lines[i-1].match(/^\d/)) result.address = lines[i - 1];
          if (i + 1 < lines.length) result.country = mapCountry(lines[i + 1]);
          break;
        }
      }
    } else {
      // Alles auf einer Zeile zusammengeklebt
      var fullAddr = lines.join(" ") || addrBlock;
      var plzCity = fullAddr.match(/(\d{4,5})\s+([A-Za-z\u00C0-\u00FF][A-Za-z\u00C0-\u00FF\s\-]+?)(?:\s+(?:Deutschland|Germany|Österreich|Austria|Schweiz|Switzerland|Italien|Italy|Frankreich|France|[A-Z]{2}))?$/i);
      if (plzCity) {
        result.zip = plzCity[1];
        result.city = plzCity[2].trim();
        var beforePlz = fullAddr.substring(0, fullAddr.indexOf(plzCity[1])).trim();
        // Land am Ende?
        var countryAtEnd = fullAddr.match(/\s+(Deutschland|Germany|Österreich|Austria|Schweiz|Switzerland|Italien|Italy|Frankreich|France|Niederlande|Netherlands|Belgien|Belgium|Polen|Poland|Tschechien|Spanien|Portugal|[A-Z]{2})\s*$/i);
        if (countryAtEnd) result.country = mapCountry(countryAtEnd[1]);

        // Strasse ist der letzte Teil vor PLZ der wie eine Adresse aussieht
        var strMatch = beforePlz.match(/([\w\u00C0-\u00FF][\w\u00C0-\u00FF.\-]+\s+\d[\w\-\/]*)\s*$/);
        if (strMatch) {
          result.address = strMatch[1];
          var beforeStr = beforePlz.substring(0, beforePlz.lastIndexOf(strMatch[1])).trim();
          // Was uebrig bleibt: Firma + evtl. Name
          var parts = beforeStr.split(/\s{2,}/).filter(function(p) { return p.trim().length > 1; });
          if (parts.length === 0) parts = [beforeStr];
          // Erste Teil oft Firma
          if (parts[0] && parts[0].match(/GmbH|AG|KG|Ltd|Inc|UG|OHG|e\.V\.|mbH|Co\.|gGmbH|SE/i)) {
            result.company = parts[0].trim();
          } else if (parts.length >= 2) {
            result.company = parts[0].trim();
          }
        } else {
          result.address = beforePlz;
        }
      }
    }
  }

  // Personen aus Zimmertyp
  if (result.roomType) {
    var rt = result.roomType.toUpperCase();
    if (rt === "EZ" || rt.indexOf("EINZEL") >= 0 || rt.indexOf("SINGLE") >= 0) result.adults = 1;
    else if (rt === "DZ" || rt === "DBZ" || rt.indexOf("DOPPEL") >= 0 || rt.indexOf("DOUBLE") >= 0 || rt.indexOf("ZWEIBETT") >= 0) result.adults = 2;
    else if (rt === "DRZ" || rt.indexOf("DREI") >= 0 || rt.indexOf("TRIPLE") >= 0) result.adults = 3;
    else result.adults = 2;
  }

  return result;
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Nur POST erlaubt" });

  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!key) return res.status(500).json({ error: "SUPABASE_SERVICE_KEY fehlt" });

  try {
    var emailText = "";
    if (req.body && req.body.data && req.body.data.text) emailText = req.body.data.text;
    else if (req.body && req.body.data && req.body.data.html) emailText = req.body.data.html.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ");
    else if (req.body && req.body.emailText) emailText = req.body.emailText;
    else if (typeof req.body === "string") emailText = req.body;

    if (!emailText || emailText.length < 50) {
      return res.status(400).json({ error: "Kein Email-Text empfangen" });
    }

    var parsed = parseHRSEmail(emailText);

    if (!parsed.checkIn || !parsed.checkOut) {
      return res.status(400).json({ error: "Konnte An-/Abreise nicht erkennen", parsed: parsed });
    }
    if (!parsed.lastName) {
      return res.status(400).json({ error: "Konnte Gastname nicht erkennen", parsed: parsed });
    }

    // Duplikat-Check
    if (parsed.hrsBuchungsNr) {
      var dup = await sbGet("reservations", "notes=like.*HRS+" + parsed.hrsBuchungsNr + "*&select=id&limit=1", key);
      if (dup && dup.length > 0) {
        return res.status(400).json({ success: false, error: "HRS-Buchung " + parsed.hrsBuchungsNr + " bereits importiert" });
      }
    }

    // Zimmertyp zuordnen
    var unitTypes = await sbGet("unit_types", "order=sort_order&select=*", key);
    var matchedUT = matchRoomType(parsed.roomType, unitTypes);
    if (!matchedUT) {
      return res.status(400).json({ error: "Zimmertyp nicht zugeordnet: " + parsed.roomType, availableTypes: unitTypes.map(function(u) { return u.name; }) });
    }

    // Freies Zimmer finden
    var rooms = await sbGet("rooms", "unit_type_id=eq." + matchedUT.id + "&active=eq.true&order=name&select=*", key);
    var existingRes = await sbGet("reservations", "status=not.in.(storniert,abgelehnt,checkedout)&select=id,room_id,check_in,check_out", key);

    var freeRoom = null;
    for (var i = 0; i < rooms.length; i++) {
      var conflict = existingRes.some(function(r) {
        return r.room_id === rooms[i].id && parsed.checkIn < r.check_out && parsed.checkOut > r.check_in;
      });
      if (!conflict) { freeRoom = rooms[i]; break; }
    }

    if (!freeRoom) {
      return res.status(400).json({ error: "Kein freies " + matchedUT.name + " fuer " + parsed.checkIn + " - " + parsed.checkOut });
    }

    // Gast anlegen oder finden
    var guestId;
    if (parsed.lastName) {
      var eg = await sbGet("guests", "last_name=ilike." + encodeURIComponent(parsed.lastName) + "&first_name=ilike." + encodeURIComponent(parsed.firstName) + "&select=id&limit=1", key);
      if (eg && eg.length) guestId = eg[0].id;
    }
    if (!guestId) {
      var ng = await sbPost("guests", {
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
      }, key);
      guestId = ng[0].id;
    }

    // Reservierung anlegen
    var otoken = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(c) {
      var r = Math.random() * 16 | 0; return (c === "x" ? r : (r & 0x3 | 0x8)).toString(16);
    });

    var notes = "HRS #" + (parsed.hrsBuchungsNr || "-");
    if (parsed.rateName) notes += " | Tarif: " + parsed.rateName;
    if (parsed.breakfast) notes += " | Fruehstueck: " + parsed.breakfastPrice + " EUR/Pers.";
    if (parsed.cancellationDeadline) notes += " | Storno: " + parsed.cancellationDeadline;
    if (parsed.buchungsart) notes += " | Buchungsart: " + parsed.buchungsart;
    if (parsed.zahlungsart) notes += " | Zahlungsart: " + parsed.zahlungsart;
    if (parsed.kreditkartenInfo) notes += " | KK-Info: " + parsed.kreditkartenInfo;
    if (parsed.guestWishes) notes += " | Wuensche: " + parsed.guestWishes;

    var newRes = await sbPost("reservations", {
      room_id: freeRoom.id,
      guest_id: guestId,
      check_in: parsed.checkIn,
      check_out: parsed.checkOut,
      status: "reservierung",
      adults: parsed.adults || 1,
      children: 0,
      total_price: parsed.totalPrice || 0,
      source: "hrs",
      offer_token: otoken,
      notes: notes
    }, key);

    // Zahlung anlegen wenn Kreditkarte
    if (parsed.creditCardPayment && parsed.totalPrice > 0) {
      try {
        await sbPost("payments", {
          reservation_id: newRes[0].id,
          guest_id: guestId,
          amount: parsed.totalPrice,
          payment_method: "mastercard",
          status: "ausstehend"
        }, key);
      } catch(pe) { console.error("Payment Fehler:", pe.message); }
    }

    return res.status(200).json({
      success: true,
      message: "HRS-Buchung importiert",
      reservation: {
        id: newRes[0].id,
        number: newRes[0].reservation_number || newRes[0].id,
        room: freeRoom.name,
        roomType: matchedUT.name,
        guest: (parsed.firstName + " " + parsed.lastName).trim(),
        checkIn: parsed.checkIn,
        checkOut: parsed.checkOut,
        price: parsed.totalPrice,
        hrsNr: parsed.hrsBuchungsNr
      },
      parsed: parsed
    });

  } catch (err) {
    console.error("hrs-import Fehler:", err.message);
    return res.status(500).json({ error: err.message });
  }
};
