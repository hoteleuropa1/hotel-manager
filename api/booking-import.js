const SUPABASE_URL = "https://ztdtkncoyrkvdpytwuhy.supabase.co";

const MONTHS = {
  jan:1,feb:2,"mär":3,"märz":3,marz:3,mar:3,apr:4,mai:5,may:5,jun:6,june:6,
  jul:7,july:7,aug:8,sep:9,sept:9,okt:10,oct:10,nov:11,dez:12,dec:12
};

function parseDate(str) {
  const c = str.replace(/\./g,"").replace(/,/g,"").trim();
  const p = c.split(/\s+/);
  let day, month, year;
  for (const w of p) {
    const n = parseInt(w);
    if (!isNaN(n) && n >= 1 && n <= 31 && !day) day = n;
    else if (!isNaN(n) && n >= 2020) year = n;
    else {
      const ml = w.toLowerCase();
      if (MONTHS[ml]) month = MONTHS[ml];
      else if (MONTHS[ml.substring(0,3)]) month = MONTHS[ml.substring(0,3)];
    }
  }
  if (!day || !month || !year) return null;
  return `${year}-${String(month).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
}

function parsePrice(str) {
  const m = str.match(/€\s*([\d.,]+)/);
  if (!m) return 0;
  const raw = m[1];
  if (raw.includes(",") && raw.includes(".")) {
    return parseFloat(raw.replace(".","").replace(",",".")) || 0;
  }
  return parseFloat(raw.replace(",",".")) || 0;
}

// Booking.com-Kategorie (DE/EN) -> Name in deiner unit_types-Tabelle. Rechte Seite ggf. anpassen!
const ROOM_TYPE_MAP = [
  { match: /einzelzimmer|single\s*room|\bsingle\b/i,   unitType: "Einzelzimmer" },
  { match: /zweibettzimmer|twin\s*room|\btwin\b/i,     unitType: "Zweibettzimmer" },
  { match: /doppelzimmer|double\s*room|\bdouble\b/i,   unitType: "Doppelzimmer" },
  { match: /dreibettzimmer|triple\s*room|\btriple\b/i, unitType: "Dreibettzimmer" }
];

function detectRoomType(line) {
  if (/occupancy|belegung|photo|foto|preis pro nacht|price per night/i.test(line)) return null;
  for (const r of ROOM_TYPE_MAP) if (r.match.test(line)) return r.unitType;
  return null;
}

async function sbGet(table, query, key) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
    headers: { apikey: key, Authorization: "Bearer " + key }
  });
  return r.json();
}

async function sbPost(table, data, key) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: key, Authorization: "Bearer " + key, Prefer: "return=representation" },
    body: JSON.stringify(data)
  });
  if (!r.ok) { const t = await r.text(); throw new Error(r.status + " " + t.slice(0, 200)); }
  return r.json();
}

// ---------------------------------------------------------------------------
// Parsen der Booking.com-Mail in ein deterministisches Objekt (DE + EN)
// ---------------------------------------------------------------------------
function parseBookingEmail(emailText) {
  const lines = emailText.split("\n").map(l => l.trim()).filter(Boolean);

  let checkIn, checkOut;
  for (let i = 0; i < lines.length; i++) {
    if (/^Check.?in$/i.test(lines[i]) && i + 1 < lines.length) checkIn = parseDate(lines[i + 1]);
    if (/^Check.?out$/i.test(lines[i]) && i + 1 < lines.length) checkOut = parseDate(lines[i + 1]);
  }

  const PLACEHOLDER_NAME = /didn'?t add a name|hat keinen Namen/i;
  let guestName = "";
  for (let i = 0; i < lines.length; i++) {
    if (/^(Name des Gast|Guest name)/i.test(lines[i])) {
      const colon = lines[i].indexOf(":");
      let after = colon >= 0 ? lines[i].substring(colon + 1).trim() : "";
      if (!after && i + 1 < lines.length) after = lines[i + 1].trim();
      if (after && !PLACEHOLDER_NAME.test(after)) { guestName = after; break; }
    }
  }

  const nameParts = (guestName || "").split(/\s+/);
  const firstName = nameParts[0] || "";
  const lastName = nameParts.slice(1).join(" ") || "";

  let country = "DE";
  for (let i = 0; i < lines.length; i++) {
    if (lines[i] === guestName && i + 1 < lines.length) {
      const next = lines[i + 1].trim();
      if (next.length === 2 && /^[a-z]{2}$/i.test(next)) country = next.toUpperCase();
      break;
    }
  }

  let email = "", phone = "", address = "", city = "", zip = "";
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes("@guest.booking.com") || (lines[i].includes("@") && lines[i].includes("booking"))) {
      email = lines[i].trim();
      let nextIdx = i + 1;
      if (nextIdx < lines.length) {
        const nextLine = lines[nextIdx].trim();
        if (nextLine.match(/^\+?\d[\d\s\-\/]{6,}/)) { phone = nextLine; nextIdx++; }
        else if (nextLine === "Telefonnummer anzeigen" || /^Show phone number/i.test(nextLine)) { nextIdx++; }
      }
      if (nextIdx < lines.length) {
        const addrLine = lines[nextIdx];
        if (addrLine
            && !addrLine.startsWith("Bevorzugte") && !addrLine.startsWith("Kanal")
            && !/^Preferred|^Channel|^Show phone number/i.test(addrLine)) {
          const plzMatch = addrLine.match(/\b(\d{4,5})\b/);
          if (plzMatch) {
            zip = plzMatch[1];
            const idx2 = addrLine.indexOf(zip);
            const before = addrLine.substring(0, idx2).trim();
            const after = addrLine.substring(idx2 + zip.length).trim();
            if (after) { city = after; address = before; }
            else {
              const words = before.split(/\s+/);
              if (words.length >= 3) { city = words.pop(); address = words.join(" "); }
              else address = before;
            }
          } else { address = addrLine; }
        }
      }
      break;
    }
  }

  let paymentMethod = "";
  for (const l of lines) {
    if (l.match(/Auszahlungen?\s+per\s+(Ü|Ue?)berweisung/i)
        || /Bank transfer payout/i.test(l)
        || /Payments by Booking\.com/i.test(l)) { paymentMethod = "booking_online"; break; }
  }

  let bookingNr = "";
  for (let i = 0; i < lines.length; i++) {
    if (/^(Buchungsnummer|Booking number)\s*:/i.test(lines[i])) {
      bookingNr = lines[i].replace(/^(Buchungsnummer|Booking number)\s*:/i, "").trim();
      if (!bookingNr && i + 1 < lines.length) bookingNr = lines[i + 1];
      break;
    }
  }

  const roomDefs = [];
  for (let i = 0; i < lines.length; i++) {
    const roomType = detectRoomType(lines[i]);
    if (!roomType) continue;
    let roomPrice = parsePrice(lines[i]);
    if (!roomPrice && i + 1 < lines.length) roomPrice = parsePrice(lines[i + 1]);
    const nightPrices = [];
    for (let j = i + 1; j < Math.min(i + 60, lines.length); j++) {
      if (j > i + 1 && detectRoomType(lines[j])) break;
      if (/^(Zwischensumme|Subtotal|Total room price|Gesamtpreis|Rate includes|Inklusive)/i.test(lines[j])) break;
      const dateRange = lines[j].match(/(\d{1,2})\s*-\s*(\d{1,2})\s+(\w+)/);
      if (dateRange) {
        for (let k = j + 1; k < Math.min(j + 4, lines.length); k++) {
          const np = parsePrice(lines[k]);
          if (np) { nightPrices.push({ range: lines[j].trim(), price: np }); break; }
        }
      }
    }
    roomDefs.push({ roomType, price: roomPrice, nightPrices });
  }

  return { checkIn, checkOut, guestName, firstName, lastName, email, phone, address, city, zip, country, paymentMethod, bookingNr, roomDefs };
}

// Freie Zimmer einer Kategorie im Zeitraum (inkl. flexibler Zimmer via alt_unit_type_ids)
function freeRoomsForType(ut, allRooms, allRes, checkIn, checkOut, usedRoomIds) {
  const candidates = allRooms.filter(r =>
    r.unit_type_id === ut.id || (r.alt_unit_type_ids || "").split(",").filter(Boolean).includes(ut.id));
  return candidates.filter(r => {
    if (usedRoomIds.has(r.id)) return false;
    return !allRes.some(rv => rv.room_id === r.id && checkIn < rv.check_out && checkOut > rv.check_in);
  });
}

const ADULTS_BY_TYPE = { einzelzimmer: 1, doppelzimmer: 2, zweibettzimmer: 2, dreibettzimmer: 3 };
function capOf(ut) { return (ut && (ut.capacity || ADULTS_BY_TYPE[(ut.name||"").toLowerCase()])) || 1; }

module.exports = async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });

  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!key) return res.status(500).json({ success: false, error: "SUPABASE_SERVICE_KEY fehlt" });

  try {
    const { emailText, mode, assignments } = req.body || {};
    if (!emailText) return res.status(400).json({ success: false, error: "Kein Text" });

    const parsed = parseBookingEmail(emailText);
    const { checkIn, checkOut, guestName, firstName, lastName, email, phone, address, city, zip, country, paymentMethod, bookingNr, roomDefs } = parsed;

    if (!checkIn || !checkOut) return res.status(400).json({ success: false, error: "Check-in/Check-out nicht erkannt" });
    if (!guestName) return res.status(400).json({ success: false, error: "Gastname nicht erkannt" });
    if (roomDefs.length === 0) return res.status(400).json({ success: false, error: "Keine Zimmer erkannt." });

    // Stammdaten laden
    const unitTypes = await sbGet("unit_types", "select=*", key);
    const allRooms = await sbGet("rooms", "active=eq.true&order=name&select=*", key);
    const allRes = await sbGet("reservations", "status=not.in.(storniert,abgelehnt,checkedout)&select=room_id,check_in,check_out,status", key);

    // Dublettenpruefung
    if (bookingNr) {
      const dup = await sbGet("reservations", "notes=like.*Booking.com+%23" + bookingNr + "*&select=id&limit=1", key);
      if (dup && dup.length > 0) {
        return res.status(400).json({ success: false, error: "Buchung " + bookingNr + " bereits importiert" });
      }
    }

    // Angeforderte unit_types aufloesen (Kategorie muss existieren)
    for (const rd of roomDefs) {
      const ut = unitTypes.find(u => u.name.toLowerCase() === rd.roomType.toLowerCase());
      if (!ut) {
        return res.status(400).json({
          success: false,
          error: 'Kategorie "' + rd.roomType + '" nicht gefunden. Vorhanden: ' + unitTypes.map(u => u.name).join(", ") + ' (ggf. ROOM_TYPE_MAP anpassen)'
        });
      }
      rd.ut = ut;
      rd.requiredCap = capOf(ut);
    }

    // =====================================================================
    // PHASE "plan": Verfuegbarkeit pruefen + Alternativen liefern (kein Schreiben)
    // =====================================================================
    if (mode !== "commit") {
      const usedRoomIds = new Set();
      const slots = [];

      // 1. Durchlauf: exakte Kategorie automatisch zuweisen wo moeglich
      for (let i = 0; i < roomDefs.length; i++) {
        const rd = roomDefs[i];
        const free = freeRoomsForType(rd.ut, allRooms, allRes, checkIn, checkOut, usedRoomIds);
        if (free.length > 0) {
          usedRoomIds.add(free[0].id);
          slots.push({
            index: i, requestedType: rd.ut.name, requestedCapacity: rd.requiredCap, price: rd.price,
            auto: { roomId: free[0].id, roomName: free[0].name, unitTypeId: rd.ut.id, unitTypeName: rd.ut.name },
            alternatives: []
          });
        } else {
          slots.push({ index: i, requestedType: rd.ut.name, requestedCapacity: rd.requiredCap, price: rd.price, auto: null, alternatives: [] });
        }
      }

      // 2. Durchlauf: fuer nicht zuweisbare Slots Alternativen bauen
      for (const slot of slots) {
        if (slot.auto) continue;
        const singles = [], splits = [];
        for (const ut2 of unitTypes) {
          if (ut2.id === roomDefs[slot.index].ut.id) continue; // gleiche Kategorie ist ja voll
          const free = freeRoomsForType(ut2, allRooms, allRes, checkIn, checkOut, usedRoomIds);
          if (free.length === 0) continue;
          const cap = capOf(ut2);
          if (cap >= slot.requestedCapacity) {
            singles.push({
              kind: "single", unitTypeId: ut2.id, unitTypeName: ut2.name, capacity: cap,
              rooms: [{ roomId: free[0].id, roomName: free[0].name }]
            });
          } else {
            const need = Math.ceil(slot.requestedCapacity / cap);
            if (free.length >= need) {
              splits.push({
                kind: "split", unitTypeId: ut2.id, unitTypeName: ut2.name, capacityEach: cap, count: need,
                rooms: free.slice(0, need).map(r => ({ roomId: r.id, roomName: r.name }))
              });
            }
          }
        }
        slot.alternatives = [...singles, ...splits];
      }

      const needsChoice = slots.some(s => !s.auto);
      return res.status(200).json({
        success: true,
        plan: {
          needsChoice,
          guest: guestName, bookingNr, checkIn, checkOut,
          totalPrice: roomDefs.reduce((s, r) => s + r.price, 0),
          slots
        }
      });
    }

    // =====================================================================
    // PHASE "commit": Buchung mit gewaehlten Zimmern anlegen
    // =====================================================================
    if (!Array.isArray(assignments) || assignments.length !== roomDefs.length) {
      return res.status(400).json({ success: false, error: "Ungueltige Zuordnung (assignments)" });
    }

    // Alle gewaehlten roomIds einsammeln + validieren
    const flatRoomIds = [];
    for (const a of assignments) {
      const ids = (a && a.roomIds) || [];
      if (!ids.length) return res.status(400).json({ success: false, error: "Fuer jedes Zimmer muss eine Auswahl getroffen werden" });
      for (const id of ids) flatRoomIds.push(id);
    }
    // Doppelte physische Zimmer?
    if (new Set(flatRoomIds).size !== flatRoomIds.length) {
      return res.status(400).json({ success: false, error: "Ein Zimmer wurde mehrfach ausgewaehlt. Bitte Auswahl korrigieren." });
    }
    // Alle noch frei? (Verfuegbarkeit kann sich seit der Pruefung geaendert haben)
    for (const id of flatRoomIds) {
      const room = allRooms.find(r => r.id === id);
      if (!room) return res.status(400).json({ success: false, error: "Unbekanntes Zimmer in der Auswahl" });
      const conflict = allRes.some(rv => rv.room_id === id && checkIn < rv.check_out && checkOut > rv.check_in);
      if (conflict) return res.status(409).json({ success: false, error: "Zimmer " + room.name + " ist inzwischen belegt. Bitte erneut pruefen." });
    }

    // Gast anlegen/finden
    let guestId;
    if (email) {
      const eg = await sbGet("guests", "email=eq." + encodeURIComponent(email) + "&select=id&limit=1", key);
      if (eg && eg.length) guestId = eg[0].id;
    }
    if (!guestId && lastName) {
      const eg2 = await sbGet("guests", "last_name=ilike." + encodeURIComponent(lastName) + "&first_name=ilike." + encodeURIComponent(firstName) + "&select=id&limit=1", key);
      if (eg2 && eg2.length) guestId = eg2[0].id;
    }
    if (!guestId) {
      const ng = await sbPost("guests", { first_name: firstName, last_name: lastName, email, phone, address, zip, city, country }, key);
      guestId = ng[0].id;
    }

    const totalRooms = flatRoomIds.length;
    const groupId = totalRooms > 1 ? Math.random().toString(16).slice(2, 10) : "";
    const created = [];
    let roomCounter = 0;

    for (let i = 0; i < roomDefs.length; i++) {
      const rd = roomDefs[i];
      const ids = assignments[i].roomIds;
      const k = ids.length;

      // Preis des Slots gleichmaessig auf die k Zimmer aufteilen (Rest auf das erste)
      const per = Math.round((rd.price / k) * 100) / 100;
      const first = Math.round((rd.price - per * (k - 1)) * 100) / 100;

      // Erwachsene des Slots auf die Zimmer verteilen (jeweils bis Kapazitaet)
      let remainingAdults = ADULTS_BY_TYPE[rd.ut.name.toLowerCase()] || rd.requiredCap;

      for (let ci = 0; ci < ids.length; ci++) {
        const room = allRooms.find(r => r.id === ids[ci]);
        const roomUt = unitTypes.find(u => u.id === room.unit_type_id) || rd.ut;
        const roomCap = capOf(roomUt);
        const adults = Math.max(1, Math.min(roomCap, remainingAdults - (k - 1 - ci)));
        remainingAdults -= adults;

        const price = ci === 0 ? first : per;

        let notes = "Booking.com #" + bookingNr;
        if (rd.nightPrices.length > 0) notes += " | " + rd.nightPrices.map(np => np.range + ": " + np.price + " EUR").join(", ");
        if (roomUt.id !== rd.ut.id || k > 1) notes += " | Ersatz fuer " + rd.ut.name + (k > 1 ? " (Aufteilung " + (ci + 1) + "/" + k + ")" : "");
        if (groupId) notes += " | Gruppe " + groupId + " (Zi " + (roomCounter + 1) + "/" + totalRooms + ")";

        const token = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
          const r = Math.random() * 16 | 0; return (c === "x" ? r : (r & 0x3 | 0x8)).toString(16);
        });

        const nr = await sbPost("reservations", {
          room_id: room.id, guest_id: guestId, check_in: checkIn, check_out: checkOut,
          status: "reservierung", adults, children: 0, total_price: price,
          source: "booking", notes, offer_token: token, sold_as_unit_type_id: roomUt.id
        }, key);

        created.push({ id: nr[0].id, room: room.name, roomType: roomUt.name, price });
        roomCounter++;

        if (paymentMethod) {
          try {
            await sbPost("payments", {
              reservation_id: nr[0].id, guest_id: guestId, amount: price,
              payment_method: paymentMethod, status: "ausstehend"
            }, key);
          } catch (pe) { console.error("Payment Fehler:", pe); }
        }
      }
    }

    return res.status(200).json({
      success: true,
      reservation: {
        guest: guestName, bookingNr, checkIn, checkOut,
        totalPrice: roomDefs.reduce((s, r) => s + r.price, 0),
        rooms: created
      }
    });

  } catch (e) {
    console.error("Booking Import Fehler:", e);
    return res.status(500).json({ success: false, error: e.message });
  }
};
