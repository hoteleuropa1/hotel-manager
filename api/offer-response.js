// api/offer-response.js
// Handles guest accept/decline of offers
// Sends automatic confirmation email on accept

const SB_URL = "https://ztdtkncoyrkvdpytwuhy.supabase.co";
const SB_KEY = process.env.SUPABASE_SERVICE_KEY || "sb_publishable_VvH5xJAh2eDdG4HYvvOjDQ_wixb2mRT";
const RESEND_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || "onboarding@resend.dev";

const LOGO = "https://pms.hotel-europa-ruesselsheim.de/logo-header.jpg";
const HN = "Hotel Europa";
const HA = "Marktplatz 1";
const HC = "65428 Ruesselsheim";
const HP = "015903081422";
const HE = "info@hotel-europa-ruesselsheim.de";
const HW = "www.hotel-europa-ruesselsheim.de";

function fd(d) {
  var t = new Date(d);
  return t.getDate().toString().padStart(2, "0") + "." + (t.getMonth() + 1).toString().padStart(2, "0") + "." + t.getFullYear();
}

function fmt(n) {
  return parseFloat(n || 0).toFixed(2);
}

var emailFooter = '<table style="background-color:#ABA596;font-family:arial,sans-serif;font-size:13px;color:#ffffff;padding:10px;" width="575"><tr><td><b>' + HN + '</b><br>' + HA + '<br>' + HC + '<br>Tel.: ' + HP + '<br>E-Mail: <a style="color:#ffffff;text-decoration:none;" href="mailto:' + HE + '">' + HE + '</a><br><a href="http://' + HW + '" target="_blank" style="color:#ffffff;text-decoration:none;">' + HW + '</a></td></tr></table>';

async function sbFetch(path, method, body) {
  var opts = {
    method: method || "GET",
    headers: {
      "Content-Type": "application/json",
      "apikey": SB_KEY,
      "Authorization": "Bearer " + SB_KEY,
      "Prefer": "return=representation"
    }
  };
  if (body) opts.body = JSON.stringify(body);
  var r = await fetch(SB_URL + "/rest/v1/" + path, opts);
  if (!r.ok) {
    var t = await r.text();
    throw new Error(r.status + ": " + t.slice(0, 200));
  }
  if (method === "GET" || method === "PATCH") return r.json();
  return null;
}

async function sendConfirmationEmail(reservation, guest, unitType) {
  if (!RESEND_KEY) {
    console.log("offer-response: no RESEND_API_KEY, skipping email");
    return;
  }
  if (!guest.email) {
    console.log("offer-response: no guest email, skipping");
    return;
  }

  var greet = (guest.salutation || "Sehr geehrte/r") + " " + (guest.last_name || "Gast");
  var nights = Math.round((new Date(reservation.check_out) - new Date(reservation.check_in)) / 86400000);
  var catName = unitType ? unitType.name : "Zimmer";

  var html = '<table width="100%" style="width:100%;max-width:650px;font-family:arial,sans-serif;font-size:14px;" cellspacing="0">';
  html += '<tr><td><img src="' + LOGO + '" width="100%" style="width:100%;"/></td></tr>';
  html += '<tr><td height="20"></td></tr>';
  html += '<tr><td><h1 style="font-family:Arial,sans-serif;font-size:24px;font-weight:bold;color:#58585a;margin:0;">Ihre Reservierungsbestaetigung</h1></td></tr>';
  html += '<tr><td style="border:1px solid #ccc;padding:10px;">';
  html += '<table width="100%"><tr><td width="96" style="text-align:center;vertical-align:top;">';
  html += '<div style="width:64px;height:64px;background:#10B981;border-radius:32px;display:inline-flex;align-items:center;justify-content:center;color:#fff;font-size:32px;">&#10003;</div>';
  html += '</td><td width="10"></td><td style="font-family:Arial,sans-serif;font-size:14px;">';
  html += greet + ',<br><br>vielen Dank fuer Ihre Reservierung!<br><br>';
  html += 'Wir freuen uns sehr, Sie demnachst als Gast willkommen zu heissen.</td></tr></table></td></tr>';
  html += '<tr><td height="10"></td></tr>';
  html += '<tr><td style="border:1px solid #ccc;padding:10px;background:#e7e7e7;text-align:center;font-family:Arial,sans-serif;font-size:14px;">';
  html += 'Gesamtpreis:<br><span style="font-size:24px;font-weight:bold;">EUR ' + fmt(reservation.total_price) + '</span><br>inkl. Steuern</td></tr>';
  html += '<tr><td height="20"></td></tr>';
  html += '<tr><td><h1 style="font-family:Arial,sans-serif;font-size:24px;font-weight:bold;color:#58585a;margin:0;">Ihre Buchung</h1></td></tr>';
  html += '<tr><td><table width="100%" cellspacing="0"><tr>';
  html += '<td style="width:50%;border:1px solid #ccc;padding:10px;vertical-align:top;font-family:Arial,sans-serif;font-size:14px;">';
  html += '<table width="100%">';
  html += '<tr><td>Gebuchte Kategorie:</td><td>' + catName + '</td></tr>';
  html += '<tr><td>Anreise:</td><td>' + fd(reservation.check_in) + '</td></tr>';
  html += '<tr><td>Abreise:</td><td>' + fd(reservation.check_out) + '</td></tr>';
  html += '<tr><td>Naechte:</td><td>' + nights + '</td></tr>';
  html += '<tr><td>Erwachsene:</td><td>' + (reservation.adults || 1) + '</td></tr>';
  html += '<tr><td>Kinder:</td><td>' + (reservation.children || 0) + '</td></tr>';
  html += '</table></td>';
  html += '<td style="width:50%;border:1px solid #ccc;padding:10px;vertical-align:top;font-family:Arial,sans-serif;font-size:14px;">';
  html += '<table width="100%">';
  html += '<tr><td>Anrede:</td><td>' + (guest.salutation || "") + '</td></tr>';
  html += '<tr><td>Name:</td><td>' + (guest.first_name || "") + ' ' + (guest.last_name || "") + '</td></tr>';
  html += '<tr><td>Adresse:</td><td>' + (guest.address || "") + '</td></tr>';
  html += '<tr><td>PLZ / Ort:</td><td>' + (guest.zip || "") + ' ' + (guest.city || "") + '</td></tr>';
  html += '<tr><td>Land:</td><td>' + (guest.country || "DE") + '</td></tr>';
  html += '</table></td></tr></table></td></tr>';
  html += '<tr><td height="20"></td></tr>';
  html += '<tr><td>' + emailFooter + '</td></tr></table>';

  try {
    var r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + RESEND_KEY
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: guest.email,
        subject: "Ihre Reservierungsbestaetigung - " + HN,
        html: html
      })
    });
    var result = await r.json();
    console.log("offer-response: confirmation email sent to " + guest.email, result);
  } catch (e) {
    console.error("offer-response: email error:", e.message);
  }
}

export default async function handler(req, res) {
  var token = req.query.token;
  var action = req.query.action;

  if (!token || !action) {
    return res.status(400).send(errorPage("Ungueltiger Link", "Token oder Aktion fehlt."));
  }

  try {
    // Find reservation by offer_token
    var reservations = await sbFetch("reservations?offer_token=eq." + token + "&limit=1", "GET");

    if (!reservations || reservations.length === 0) {
      return res.status(404).send(errorPage("Nicht gefunden", "Dieses Angebot wurde nicht gefunden oder ist bereits abgelaufen."));
    }

    var reservation = reservations[0];

    if (reservation.status !== "angebot") {
      return res.status(400).send(infoPage("Bereits bearbeitet", "Dieses Angebot wurde bereits " + (reservation.status === "reservierung" ? "angenommen" : reservation.status === "abgelehnt" ? "abgelehnt" : "bearbeitet") + "."));
    }

    if (action === "accept") {
      // Update status to reservierung
      await sbFetch("reservations?id=eq." + reservation.id, "PATCH", {
        status: "reservierung",
        accepted_at: new Date().toISOString()
      });

      // Load guest data
      var guests = await sbFetch("guests?id=eq." + reservation.guest_id + "&limit=1", "GET");
      var guest = guests && guests.length > 0 ? guests[0] : {};

      // Load unit type via room
      var unitType = null;
      if (reservation.room_id) {
        var rooms = await sbFetch("rooms?id=eq." + reservation.room_id + "&limit=1", "GET");
        if (rooms && rooms.length > 0) {
          var unitTypes = await sbFetch("unit_types?id=eq." + rooms[0].unit_type_id + "&limit=1", "GET");
          if (unitTypes && unitTypes.length > 0) unitType = unitTypes[0];
        }
      }

      // Send automatic confirmation email
      await sendConfirmationEmail(reservation, guest, unitType);

      // Update confirmation_sent_at
      await sbFetch("reservations?id=eq." + reservation.id, "PATCH", {
        confirmation_sent_at: new Date().toISOString()
      });

      return res.status(200).send(successPage(
        "Vielen Dank!",
        "Ihre Reservierung wurde bestaetigt. Sie erhalten in Kuerze eine Reservierungsbestaetigung per E-Mail.",
        guest.first_name
      ));

    } else if (action === "decline") {
      await sbFetch("reservations?id=eq." + reservation.id, "PATCH", {
        status: "abgelehnt",
        declined_at: new Date().toISOString()
      });

      return res.status(200).send(infoPage(
        "Schade!",
        "Wir bedauern, dass Sie das Angebot nicht annehmen moechten. Wir wuerden uns freuen, Sie ein anderes Mal bei uns begruessen zu duerfen!"
      ));

    } else {
      return res.status(400).send(errorPage("Ungueltige Aktion", "Bitte verwenden Sie die Links aus der E-Mail."));
    }

  } catch (e) {
    console.error("offer-response error:", e.message);
    return res.status(500).send(errorPage("Fehler", "Ein technischer Fehler ist aufgetreten. Bitte kontaktieren Sie uns direkt unter " + HP + "."));
  }
}

function pageWrapper(icon, color, title, message, name) {
  return '<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>' + title + ' - ' + HN + '</title></head><body style="margin:0;padding:0;background:#F3F4F6;font-family:Arial,sans-serif;"><div style="max-width:500px;margin:60px auto;padding:24px;"><div style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,.08);text-align:center;">'
    + '<div style="padding:40px 32px;">'
    + '<div style="width:80px;height:80px;border-radius:40px;background:' + color + ';display:inline-flex;align-items:center;justify-content:center;margin-bottom:20px;"><span style="font-size:40px;color:#fff;">' + icon + '</span></div>'
    + '<h1 style="font-size:24px;font-weight:bold;color:#111;margin:0 0 12px;">' + title + '</h1>'
    + (name ? '<p style="font-size:16px;color:#6B7280;margin:0 0 8px;">Hallo ' + name + '!</p>' : '')
    + '<p style="font-size:15px;color:#6B7280;line-height:1.6;margin:0;">' + message + '</p>'
    + '</div>'
    + '<div style="background:#ABA596;padding:16px 32px;"><p style="margin:0;color:#fff;font-size:13px;font-weight:bold;">' + HN + '</p><p style="margin:4px 0 0;color:rgba(255,255,255,0.8);font-size:12px;">' + HA + ', ' + HC + ' | Tel.: ' + HP + '</p></div>'
    + '</div></div></body></html>';
}

function successPage(title, msg, name) { return pageWrapper("&#10003;", "#10B981", title, msg, name); }
function infoPage(title, msg) { return pageWrapper("&#8505;", "#F59E0B", title, msg); }
function errorPage(title, msg) { return pageWrapper("&#10007;", "#EF4444", title, msg); }
