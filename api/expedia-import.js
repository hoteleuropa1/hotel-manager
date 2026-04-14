// api/expedia-import.js
// Vercel Serverless Function — Expedia Buchungsimport

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Nur POST erlaubt" });

  const SB_KEY = process.env.SUPABASE_SERVICE_KEY;
  if (!SB_KEY) return res.status(500).json({ error: "SUPABASE_SERVICE_KEY fehlt" });

  const SB_URL = "https://ztdtkncoyrkvdpytwuhy.supabase.co";
  const headers = {
    "Content-Type": "application/json",
    apikey: SB_KEY,
    Authorization: "Bearer " + SB_KEY,
    Prefer: "return=representation",
  };

  try {
    var emailText = "";
    if (req.body && req.body.emailText) emailText = req.body.emailText;
    else if (typeof req.body === "string") emailText = req.body;

    if (!emailText || emailText.length < 50) {
      return res.status(400).json({ error: "Kein Buchungstext empfangen" });
    }

    var parsed = parseExpedia(emailText);

    if (!parsed.checkIn || !parsed.checkOut) {
      return res.status(400).json({ error: "Konnte An-/Abreise nicht erkennen", parsed: parsed });
    }
    if (!parsed.lastName) {
      return res.status(400).json({ error: "Konnte Gastname nicht erkennen", parsed: parsed });
    }

    // Duplikat-Check
    if (parsed.reservationId) {
      var dupResp = await fetch(
        SB_URL + "/rest/v1/reservations?notes=like.*" + parsed.reservationId + "*&select=id",
        { headers: { apikey: SB_KEY, Authorization: "Bearer " + SB_KEY } }
      );
      var dups = await dupResp.json();
      if (dups && dups.length > 0) {
        return res.status(400).json({
          error: "Buchung " + parsed.reservationId + " existiert bereits!",
          parsed: parsed,
        });
      }
    }

    // Zimmertyp-Mapping
    var utResp = await fetch(SB_URL + "/rest/v1/unit_types?order=sort_order", {
      headers: { apikey: SB_KEY, Authorization: "Bearer " + SB_KEY },
    });
    var unitTypes = await utResp.json();

    var roomResp = await fetch(SB_URL + "/rest/v1/rooms?active=eq.true&order=name", {
      headers: { apikey: SB_KEY, Authorization: "Bearer " + SB_KEY },
    });
    var allRooms = await roomResp.json();

    // Zimmertyp erkennen
    var utId = null;
    var rtLower = (parsed.roomType || "").toLowerCase();
    if (rtLower.match(/single|einzel|einzelbett|twin/)) {
      utId = unitTypes.find(function (u) { return u.name.toLowerCase().indexOf("einzel") >= 0; });
    } else if (rtLower.match(/double|doppel|queen|king/)) {
      utId = unitTypes.find(function (u) { return u.name.toLowerCase().indexOf("doppel") >= 0; });
    } else if (rtLower.match(/triple|drei/)) {
      utId = unitTypes.find(function (u) { return u.name.toLowerCase().indexOf("drei") >= 0; });
    }
    if (utId) utId = utId.id;
    else if (unitTypes.length > 0) utId = unitTypes[0].id;

    // Freies Zimmer finden
    var rvResp = await fetch(
      SB_URL + "/rest/v1/reservations?check_in=lt." + parsed.checkOut + "&check_out=gt." + parsed.checkIn + "&status=not.in.(storniert,abgelehnt,checkedout,bezahlt,noshow)&select=room_id",
      { headers: { apikey: SB_KEY, Authorization: "Bearer " + SB_KEY } }
    );
    var occupied = (await rvResp.json()).map(function (r) { return r.room_id; });
    var freeRoom = allRooms.find(function (r) {
      return r.unit_type_id === utId && occupied.indexOf(r.id) === -1;
    });
    if (!freeRoom) {
      freeRoom = allRooms.find(function (r) {
        return occupied.indexOf(r.id) === -1;
      });
    }
    if (!freeRoom) {
      return res.status(400).json({ error: "Kein freies Zimmer gefunden", parsed: parsed });
    }

    // Gast anlegen/finden
    var guestResp = await fetch(
      SB_URL + "/rest/v1/guests?last_name=ilike." + encodeURIComponent(parsed.lastName) + "&first_name=ilike." + encodeURIComponent(parsed.firstName) + "&limit=1",
      { headers: { apikey: SB_KEY, Authorization: "Bearer " + SB_KEY } }
    );
    var existingGuests = await guestResp.json();
    var guestId;

    if (existingGuests && existingGuests.length > 0) {
      guestId = existingGuests[0].id;
    } else {
      var newGuestResp = await fetch(SB_URL + "/rest/v1/guests", {
        method: "POST",
        headers: headers,
        body: JSON.stringify({
          salutation: parsed.salutation || "",
          first_name: parsed.firstName || "",
          last_name: parsed.lastName || "",
          email: parsed.email || "",
          country: parsed.country || "DE",
        }),
      });
      var newGuest = await newGuestResp.json();
      guestId = newGuest[0].id;
    }

    // Token generieren
    var otoken = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
      var r = (Math.random() * 16) | 0;
      return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
    });

    // Kreditkarten-Info in Notizen
    var notes = "Expedia " + (parsed.reservationId || "");
    if (parsed.cardNumber) {
      notes += " | VCC: " + parsed.cardNumber;
      if (parsed.cardExpiry) notes += " Exp: " + parsed.cardExpiry;
      if (parsed.cardCvv) notes += " CVV: " + parsed.cardCvv;
      if (parsed.cardHolder) notes += " (" + parsed.cardHolder + ")";
    }
    if (parsed.specialRequest) notes += " | " + parsed.specialRequest;

    // Interne Notizen mit Zahlungsanweisung
    var internalNotes = "";
    if (parsed.paymentInstructions) internalNotes = parsed.paymentInstructions;

    // Reservierung anlegen
    var resResp = await fetch(SB_URL + "/rest/v1/reservations", {
      method: "POST",
      headers: headers,
      body: JSON.stringify({
        room_id: freeRoom.id,
        guest_id: guestId,
        check_in: parsed.checkIn,
        check_out: parsed.checkOut,
        status: "reservierung",
        adults: parsed.adults || 1,
        children: parsed.children || 0,
        total_price: parsed.totalPrice || 0,
        notes: notes,
        internal_notes: internalNotes,
        source: "expedia",
        offer_token: otoken,
        sold_as_unit_type_id: utId,
      }),
    });

    if (!resResp.ok) {
      var errBody = await resResp.text();
      return res.status(500).json({ error: "Reservierung fehlgeschlagen: " + errBody.slice(0, 300) });
    }

    return res.status(200).json({
      success: true,
      reservation: {
        guest: parsed.firstName + " " + parsed.lastName,
        checkIn: parsed.checkIn,
        checkOut: parsed.checkOut,
        room: freeRoom.name,
        totalPrice: parsed.totalPrice,
        reservationId: parsed.reservationId,
        cardNumber: parsed.cardNumber ? "****" + parsed.cardNumber.slice(-4) : null,
      },
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};

function parseExpedia(text) {
  var result = {
    reservationId: "",
    firstName: "",
    lastName: "",
    salutation: "",
    email: "",
    checkIn: "",
    checkOut: "",
    adults: 1,
    children: 0,
    roomType: "",
    totalPrice: 0,
    specialRequest: "",
    paymentInstructions: "",
    cardNumber: "",
    cardExpiry: "",
    cardCvv: "",
    cardHolder: "",
    country: "DE",
  };

  // Reservation ID
  var resIdMatch = text.match(/Reservation\s*ID[:\s]*_*(\d+)_*/i);
  if (resIdMatch) result.reservationId = resIdMatch[1];

  // Guest name
  var guestMatch = text.match(/Guest[:\s]+([A-Za-z\u00C0-\u00FF\-]+)\s+([A-Za-z\u00C0-\u00FF\-]+)/i);
  if (guestMatch) {
    result.firstName = guestMatch[1].trim();
    result.lastName = guestMatch[2].trim();
  }

  // Email
  var emailMatch = text.match(/Guest\s*Email[:\s]+([^\s,]+@[^\s,]+)/i);
  if (emailMatch) result.email = emailMatch[1].trim();

  // Room type
  var rtMatch = text.match(/Room\s*Type\s*(?:Code|Name)[:\s]+(.+?)(?:\n|Pricing|Payment|$)/i);
  if (rtMatch) result.roomType = rtMatch[1].trim();
  var rtNameMatch = text.match(/Room\s*Type\s*Name[:\s]+(.+?)(?:\n|Pricing|$)/i);
  if (rtNameMatch) result.roomType = rtNameMatch[1].trim();

  // Check-in / Check-out
  var datePattern = /([A-Z][a-z]{2})\s+(\d{1,2}),?\s+(\d{4})/g;
  var dates = [];
  var dm;
  while ((dm = datePattern.exec(text)) !== null) {
    var monthMap = { Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06", Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12" };
    var m = monthMap[dm[1]];
    if (m) {
      var d = dm[2].padStart(2, "0");
      dates.push(dm[3] + "-" + m + "-" + d);
    }
  }

  // Check-In/Check-Out stehen nach den Labels
  var cicoMatch = text.match(/Check-In\s*Check-Out\s*Adults\s*Kids/i);
  if (cicoMatch) {
    var afterCico = text.substring(cicoMatch.index + cicoMatch[0].length);
    var cicoDatePattern = /([A-Z][a-z]{2})\s+(\d{1,2}),?\s+(\d{4})/g;
    var cicoDates = [];
    var cdm;
    while ((cdm = cicoDatePattern.exec(afterCico)) !== null) {
      var mm = { Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06", Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12" };
      var mo = mm[cdm[1]];
      if (mo) cicoDates.push(cdm[3] + "-" + mo + "-" + cdm[2].padStart(2, "0"));
    }
    if (cicoDates.length >= 2) {
      result.checkIn = cicoDates[0];
      result.checkOut = cicoDates[1];
    }

    // Adults/Kids
    var adMatch = afterCico.match(/(\d+)\s*(\d+)\s*(\d+)/);
    if (adMatch) {
      result.adults = parseInt(adMatch[1]) || 1;
      result.children = parseInt(adMatch[2]) || 0;
    }
  }

  // Fallback: use first two unique dates
  if (!result.checkIn && dates.length >= 2) {
    result.checkIn = dates[0];
    result.checkOut = dates[1];
  }

  // Total cost
  var totalMatch = text.match(/Total\s*Cost[:\s]*([\d,.]+)\s*EUR/i);
  if (totalMatch) result.totalPrice = parseFloat(totalMatch[1].replace(",", ".")) || 0;

  // Special request
  var specialMatch = text.match(/Special\s*Request\s*(.+?)(?:\n|Daily|$)/i);
  if (specialMatch) result.specialRequest = specialMatch[1].trim();

  // Payment instructions
  var payMatch = text.match(/Payment\s*Instructions[:\s]+(.+?)(?:\n|Check|$)/i);
  if (payMatch) result.paymentInstructions = payMatch[1].trim();

  // Credit card
  var cardNumMatch = text.match(/Card\s*Number\s*(\d[\d\-]+\d)/i);
  if (cardNumMatch) result.cardNumber = cardNumMatch[1].replace(/-/g, "").trim();
  
  var expMatch = text.match(/Expiration\s*Date\s*([A-Za-z]+\s*\d{4})/i);
  if (expMatch) result.cardExpiry = expMatch[1].trim();

  var cvvMatch = text.match(/Validation\s*Code\s*(\d{3,4})/i);
  if (cvvMatch) result.cardCvv = cvvMatch[1].trim();

  var holderMatch = text.match(/Card\s*Holder\s*Name\s*(.+?)(?:Billing|Card\s*Number|\n)/i);
  if (holderMatch) result.cardHolder = holderMatch[1].trim();

  return result;
}
