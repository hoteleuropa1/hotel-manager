// api/expedia-import.js
module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Nur POST erlaubt" });

  const SB_KEY = process.env.SUPABASE_SERVICE_KEY;
  if (!SB_KEY) return res.status(500).json({ error: "SUPABASE_SERVICE_KEY fehlt" });

  const SB_URL = "https://ztdtkncoyrkvdpytwuhy.supabase.co";
  const hdrs = { "Content-Type": "application/json", apikey: SB_KEY, Authorization: "Bearer " + SB_KEY, Prefer: "return=representation" };
  const hdrsR = { apikey: SB_KEY, Authorization: "Bearer " + SB_KEY };

  try {
    var emailText = req.body?.emailText || (typeof req.body === "string" ? req.body : "");
    if (!emailText || emailText.length < 50) return res.status(400).json({ error: "Kein Buchungstext empfangen" });

    var p = parseExpedia(emailText);
    if (!p.checkIn || !p.checkOut) return res.status(400).json({ error: "Check-In/Out nicht erkannt", parsed: p });
    if (!p.lastName) return res.status(400).json({ error: "Gastname nicht erkannt", parsed: p });

    // Duplikat
    if (p.reservationId) {
      var dd = await (await fetch(SB_URL + "/rest/v1/reservations?notes=like.*" + p.reservationId + "*&select=id", { headers: hdrsR })).json();
      if (dd && dd.length > 0) return res.status(400).json({ error: "Buchung " + p.reservationId + " existiert bereits!" });
    }

    // Zimmertypen + Zimmer laden
    var unitTypes = await (await fetch(SB_URL + "/rest/v1/unit_types?order=sort_order", { headers: hdrsR })).json();
    var allRooms = await (await fetch(SB_URL + "/rest/v1/rooms?active=eq.true&order=name", { headers: hdrsR })).json();

    // Einzelbett/Single/Twin -> Einzelzimmer
    var utId = null;
    var rtL = (p.roomTypeCode + " " + p.roomTypeName).toLowerCase();
    if (rtL.match(/single|einzel|einzelbett|twin/)) utId = unitTypes.find(u => u.name.toLowerCase().indexOf("einzel") >= 0);
    else if (rtL.match(/double|doppel|queen|king/)) utId = unitTypes.find(u => u.name.toLowerCase().indexOf("doppel") >= 0);
    else if (rtL.match(/triple|drei/)) utId = unitTypes.find(u => u.name.toLowerCase().indexOf("drei") >= 0);
    utId = utId ? utId.id : (unitTypes[0]?.id || null);

    // Belegte Zimmer
    var occ = await (await fetch(SB_URL + "/rest/v1/reservations?check_in=lt." + p.checkOut + "&check_out=gt." + p.checkIn + "&status=not.in.(storniert,abgelehnt,checkedout,bezahlt,noshow)&select=room_id", { headers: hdrsR })).json();
    var occIds = (occ || []).map(r => r.room_id);
    var freeRoom = allRooms.find(r => r.unit_type_id === utId && occIds.indexOf(r.id) === -1) || allRooms.find(r => occIds.indexOf(r.id) === -1);
    if (!freeRoom) return res.status(400).json({ error: "Kein freies Zimmer gefunden", parsed: p });

    // Gast anlegen/finden
    var eg = await (await fetch(SB_URL + "/rest/v1/guests?last_name=ilike." + encodeURIComponent(p.lastName) + "&first_name=ilike." + encodeURIComponent(p.firstName) + "&limit=1", { headers: hdrsR })).json();
    var guestId;
    if (eg && eg.length > 0) { guestId = eg[0].id; }
    else {
      var ng = await (await fetch(SB_URL + "/rest/v1/guests", { method: "POST", headers: hdrs, body: JSON.stringify({ salutation: "", first_name: p.firstName, last_name: p.lastName, email: p.email, country: "DE" }) })).json();
      guestId = ng[0].id;
    }

    // Token
    var otoken = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => { var r = Math.random() * 16 | 0; return (c === "x" ? r : (r & 0x3 | 0x8)).toString(16); });

    // Notizen: Expedia-Nr + PRE-PAID Status
    var notes = "Expedia " + (p.reservationId || "");
    if (p.prePaid) notes += " | Guest has PRE-PAID";
    if (p.specialRequest) notes += " | " + p.specialRequest;

    // Interne Notizen: Kreditkarte + Zahlungsanweisung
    var intNotes = "";
    if (p.cardNumber) {
      intNotes = "VCC: " + p.cardNumber;
      if (p.cardExpiry) intNotes += " Exp: " + p.cardExpiry;
      if (p.cardCvv) intNotes += " CVV: " + p.cardCvv;
      if (p.cardHolder) intNotes += " (" + p.cardHolder + ")";
    }
    if (p.paymentInstructions) intNotes += (intNotes ? " | " : "") + p.paymentInstructions;
    if (p.rateCode) intNotes += (intNotes ? " | " : "") + "Rate: " + p.rateCode;
    if (p.discount) intNotes += " | " + p.discount;

    var nights = Math.round((new Date(p.checkOut) - new Date(p.checkIn)) / 86400000);
    var totalPrice = p.totalPrice || (p.nightlyRate * nights) || 0;

    var rr = await fetch(SB_URL + "/rest/v1/reservations", {
      method: "POST", headers: hdrs,
      body: JSON.stringify({
        room_id: freeRoom.id, guest_id: guestId,
        check_in: p.checkIn, check_out: p.checkOut,
        status: "reservierung", adults: p.adults || 1, children: p.children || 0,
        total_price: totalPrice, notes: notes, internal_notes: intNotes,
        source: "expedia", offer_token: otoken, sold_as_unit_type_id: utId
      })
    });
    if (!rr.ok) { var eb = await rr.text(); return res.status(500).json({ error: "Fehler: " + eb.slice(0, 300) }); }

    return res.status(200).json({
      success: true,
      reservation: {
        guest: p.firstName + " " + p.lastName,
        checkIn: p.checkIn, checkOut: p.checkOut,
        room: freeRoom.name, totalPrice: totalPrice,
        nightlyRate: p.nightlyRate, nights: nights,
        reservationId: p.reservationId,
        cardNumber: p.cardNumber ? "****" + p.cardNumber.slice(-4) : null
      }
    });
  } catch (e) { return res.status(500).json({ error: e.message }); }
};

function parseExpedia(rawText) {
  // Text normalisieren: Sonderzeichen, HTML, unsichtbare Zeichen entfernen
  var text = rawText
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/<[^>]*>/g, " ")
    .replace(/[\u00A0\u2000-\u200F\u2028\u2029\uFEFF]/g, " ")
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\t/g, " ")
    .replace(/ {3,}/g, "  ");

  var r = { reservationId: "", firstName: "", lastName: "", email: "",
    checkIn: "", checkOut: "", adults: 1, children: 0,
    roomTypeCode: "", roomTypeName: "", nightlyRate: 0, totalPrice: 0,
    rateCode: "", discount: "", specialRequest: "", paymentInstructions: "",
    cardNumber: "", cardExpiry: "", cardCvv: "", cardHolder: "", prePaid: false };

  var MM = { Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06", Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12" };
  var m;

  // PRE-PAID erkennen
  if (text.match(/PRE-PAID|PRE\s*PAID|prepaid/i)) r.prePaid = true;

  // Reservation ID: __2437027238__
  m = text.match(/Reservation\s*ID[:\s]*_*(\d+)_*/i);
  if (m) r.reservationId = m[1];

  // Guest: Marion TiegBooked -> Name zwischen "Guest:" und "Booked"
  m = text.match(/Guest:\s*(.+?)Booked/i);
  if (m) {
    var parts = m[1].trim().split(/\s+/);
    r.firstName = parts[0] || "";
    r.lastName = parts.slice(1).join(" ") || "";
  }

  // Guest Email: xxx@xxx.comRoom -> Email bis .com/.de/.net/.org
  m = text.match(/Guest\s*Email[:\s]+(\S+@\S+?\.(?:com|de|net|org|co|io|eu))/i);
  if (m) r.email = m[1].trim();

  // Room Type Code: Einzelbett
  m = text.match(/Room\s*Type\s*Code[:\s]+(.+?)(?:\n|Room\s*Type|$)/i);
  if (m) r.roomTypeCode = m[1].trim();

  // Room Type Name
  m = text.match(/Room\s*Type\s*Name[:\s]+(.+?)(?:\n|Pricing|$)/i);
  if (m) r.roomTypeName = m[1].trim();

  // Check-In / Check-Out
  var cicoM = text.match(/Check[\s\-]*In[\s\-]*Check[\s\-]*Out/i);
  if (cicoM) {
    var after = text.substring(cicoM.index, cicoM.index + 400);
    var dates = [];
    var dp = /([A-Z][a-z]{2})\s+(\d{1,2}),?\s+(\d{4})/g;
    var dm;
    while ((dm = dp.exec(after)) !== null) {
      if (MM[dm[1]]) dates.push(dm[3] + "-" + MM[dm[1]] + "-" + dm[2].padStart(2, "0"));
    }
    if (dates.length >= 2) { r.checkIn = dates[0]; r.checkOut = dates[1]; }
  }

  // Fallback 1: Check-In und Check-Out getrennt
  if (!r.checkIn) {
    var ciM = text.match(/Check[\s\-]*In[:\s]*([A-Z][a-z]{2})\s+(\d{1,2}),?\s+(\d{4})/i);
    var coM = text.match(/Check[\s\-]*Out[:\s]*([A-Z][a-z]{2})\s+(\d{1,2}),?\s+(\d{4})/i);
    if (ciM && coM && MM[ciM[1]] && MM[coM[1]]) {
      r.checkIn = ciM[3] + "-" + MM[ciM[1]] + "-" + ciM[2].padStart(2, "0");
      r.checkOut = coM[3] + "-" + MM[coM[1]] + "-" + coM[2].padStart(2, "0");
    }
  }

  // Fallback 2: alle Daten sammeln (1.=Booked, 2.=CheckIn, 3.=CheckOut)
  if (!r.checkIn) {
    var allD = [], adp = /([A-Z][a-z]{2})\s+(\d{1,2}),?\s+(\d{4})/g, adm;
    while ((adm = adp.exec(text)) !== null) {
      if (MM[adm[1]]) allD.push(adm[3] + "-" + MM[adm[1]] + "-" + adm[2].padStart(2, "0"));
    }
    // Entferne Duplikate
    allD = [...new Set(allD)];
    if (allD.length >= 3) { r.checkIn = allD[1]; r.checkOut = allD[2]; }
    else if (allD.length >= 2) { r.checkIn = allD[0]; r.checkOut = allD[1]; }
  }

  // Fallback 3: ISO-Datumsformat (2026-04-18)
  if (!r.checkIn) {
    var isoD = text.match(/(\d{4}-\d{2}-\d{2})/g);
    if (isoD && isoD.length >= 2) { r.checkIn = isoD[0]; r.checkOut = isoD[1]; }
  }

  // Adults: suche nach Zahl direkt nach CheckOut-Datum
  var adLine = text.match(/\d{4}\s*(\d)\s*(\d)/);
  if (adLine) {
    r.adults = parseInt(adLine[1]) || 1;
    r.children = parseInt(adLine[2]) || 0;
  }

  // Daily Rate - 45.13 EUR
  m = text.match(/Daily\s*Rate\s*[-:]\s*([\d,.]+)\s*EUR/i);
  if (m) r.nightlyRate = parseFloat(m[1].replace(",", ".")) || 0;

  // Total Cost:45.13 EUR
  m = text.match(/Total\s*Cost[:\s]*([\d,.]+)\s*EUR/i);
  if (m) r.totalPrice = parseFloat(m[1].replace(",", ".")) || 0;

  // Rate Code: RO
  m = text.match(/Rate\s*Code[:\s]+(\S+)/i);
  if (m) r.rateCode = m[1].trim();

  // Discount
  m = text.match(/Discount[:\s]+(.+?)(?:\n|Extra|$)/i);
  if (m) r.discount = m[1].trim();

  // Special Request
  m = text.match(/Special\s*Request\s*(.+?)(?:\n|Daily|$)/i);
  if (m) r.specialRequest = m[1].trim();

  // Payment Instructions
  m = text.match(/Payment\s*Instructions[:\s]+(.+?)(?:\n|Check|$)/i);
  if (m) r.paymentInstructions = m[1].trim();

  // Card Number5427-3214-3596-7470
  m = text.match(/Card\s*Number\s*(\d[\d\-]+\d)/i);
  if (m) r.cardNumber = m[1].replace(/-/g, "");

  // Expiration DateApr 2029
  m = text.match(/Expiration\s*Date\s*([A-Z][a-z]{2}\s*\d{4})/i);
  if (m) r.cardExpiry = m[1].trim();

  // Validation Code548
  m = text.match(/Validation\s*Code\s*(\d{3,4})/i);
  if (m) r.cardCvv = m[1];

  // Card Holder NameExpedia VirtualCard
  m = text.match(/Card\s*Holder\s*Name\s*(.+?)(?:Billing|Card\s*Number)/i);
  if (m) r.cardHolder = m[1].trim();

  return r;
}
