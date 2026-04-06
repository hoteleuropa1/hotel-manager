// api/offer-response.js
// Angebot annehmen/ablehnen - mit Buchungsbedingungen-Seite

export default async function handler(req, res) {
  const SB_URL = process.env.SUPABASE_URL || "https://ztdtkncoyrkvdpytwuhy.supabase.co";
  const SB_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
  const { token, action, confirmed } = req.query;

  if (!token) return res.status(400).send(page("Fehler", "Kein Token angegeben.", "error"));

  const headers = {
    "Content-Type": "application/json",
    apikey: SB_KEY,
    Authorization: "Bearer " + SB_KEY,
    Prefer: "return=representation"
  };

  try {
    // Reservierung laden
    const rr = await fetch(SB_URL + "/rest/v1/reservations?offer_token=eq." + token + "&select=*,guests(*),rooms(*,unit_types(*))", { headers });
    const reservations = await rr.json();
    if (!reservations || !reservations.length) return res.status(404).send(page("Nicht gefunden", "Dieses Angebot existiert nicht oder ist abgelaufen.", "error"));

    const rv = reservations[0];
    const guest = rv.guests;
    const room = rv.rooms;
    const ut = room?.unit_types;

    if (rv.status !== "angebot") {
      var statusText = { reservierung: "bereits angenommen", checkedin: "bereits eingecheckt", storniert: "storniert", abgelehnt: "abgelehnt" }[rv.status] || rv.status;
      return res.status(200).send(page("Angebot " + statusText, "Dieses Angebot wurde bereits bearbeitet (Status: " + statusText + ").", "info"));
    }

    // Ablehnen
    if (action === "decline") {
      await fetch(SB_URL + "/rest/v1/reservations?offer_token=eq." + token, {
        method: "PATCH", headers, body: JSON.stringify({ status: "abgelehnt" })
      });

      // Hotel benachrichtigen
      var nights = Math.max(1, Math.round((new Date(rv.check_out) - new Date(rv.check_in)) / 86400000));
      try {
        await fetch("https://pms.hotel-europa-ruesselsheim.de/api/send-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: "info@hotel-europa-ruesselsheim.de",
            subject: "Angebot ABGELEHNT: " + (guest?.first_name || "") + " " + (guest?.last_name || "") + " (" + fd(rv.check_in) + " - " + fd(rv.check_out) + ")",
            html: '<table width="100%" cellspacing="0" cellpadding="0" style="background-color:#F5F3EF;font-family:Arial,sans-serif;"><tr><td align="center" style="padding:20px 10px;"><table width="580" cellspacing="0" cellpadding="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">'
              + '<tr><td style="background:#58585A;padding:20px 30px;text-align:center;border-bottom:3px solid #EF4444"><img src="https://pms.hotel-europa-ruesselsheim.de/logo-header.jpg" width="320" style="width:100%;max-width:320px;"/></td></tr>'
              + '<tr><td style="padding:30px 30px 10px;"><h1 style="font-size:22px;color:#DC2626;margin:0 0 6px;">Angebot abgelehnt</h1><div style="width:60px;height:3px;background:#EF4444;border-radius:2px;margin-bottom:20px;"></div></td></tr>'
              + '<tr><td style="padding:0 30px;"><div style="background:#FEF2F2;border:1px solid #FECACA;border-radius:10px;padding:14px;margin-bottom:16px;font-size:14px;color:#991B1B;"><strong>Der Gast hat das Angebot abgelehnt.</strong></div></td></tr>'
              + '<tr><td style="padding:0 30px 20px;"><div style="background:#F5F3EF;border-radius:10px;padding:18px;">'
              + '<table width="100%" style="font-size:14px;color:#58585A;">'
              + '<tr><td style="padding:5px 0;font-weight:600;width:45%;">Gast:</td><td style="padding:5px 0;">' + (guest?.salutation || "") + ' ' + (guest?.first_name || "") + ' ' + (guest?.last_name || "") + '</td></tr>'
              + '<tr><td style="padding:5px 0;font-weight:600;">E-Mail:</td><td style="padding:5px 0;">' + (guest?.email || "-") + '</td></tr>'
              + (guest?.phone ? '<tr><td style="padding:5px 0;font-weight:600;">Telefon:</td><td style="padding:5px 0;">' + guest.phone + '</td></tr>' : '')
              + '<tr><td style="padding:5px 0;font-weight:600;">Zimmerkategorie:</td><td style="padding:5px 0;">' + (ut?.name || "") + '</td></tr>'
              + '<tr><td style="padding:5px 0;font-weight:600;">Zeitraum:</td><td style="padding:5px 0;">' + fd(rv.check_in) + ' &ndash; ' + fd(rv.check_out) + ' (' + nights + ' N.)</td></tr>'
              + '<tr><td style="padding:5px 0;font-weight:600;">Preis:</td><td style="padding:5px 0;">' + parseFloat(rv.total_price || 0).toFixed(2) + ' EUR</td></tr>'
              + '</table></div></td></tr>'
              + '<tr><td style="padding:0 30px 24px;font-size:13px;color:#6B7280;">Das Zimmer ist wieder frei und kann neu vergeben werden.</td></tr>'
              + '<tr><td style="background:#ABA596;padding:14px 30px;color:#ffffff;font-size:11px;text-align:center;">Hotel Europa &middot; Marktplatz 1 &middot; 65428 Ruesselsheim</td></tr>'
              + '</table></td></tr></table>',
            emailType: "hotel-notification"
          })
        });
      } catch (mailErr) {
        console.error("offer-response: decline mail error:", mailErr.message);
      }

      return res.status(200).send(page("Abgelehnt", "Vielen Dank fuer Ihre Rueckmeldung. Das Angebot wurde abgelehnt.", "declined"));
    }

    // Annehmen - Schritt 1: Bedingungen anzeigen
    if (action === "accept" && confirmed !== "yes") {
      return res.status(200).send(confirmPage(rv, guest, ut, token));
    }

    // Annehmen - Schritt 2: Bestaetigt
    if (action === "accept" && confirmed === "yes") {
      await fetch(SB_URL + "/rest/v1/reservations?offer_token=eq." + token, {
        method: "PATCH", headers, body: JSON.stringify({ status: "reservierung", confirmation_sent_at: new Date().toISOString() })
      });

      // Automatische Bestaetigungsmail an Gast
      if (guest?.email) {
        var nights = Math.max(1, Math.round((new Date(rv.check_out) - new Date(rv.check_in)) / 86400000));
        var greet = (guest.salutation === "Frau" ? "Sehr geehrte Frau" : guest.salutation === "Herr" ? "Sehr geehrter Herr" : "Sehr geehrte/r") + " " + (guest.last_name || "Gast");
        var LOGO = "https://pms.hotel-europa-ruesselsheim.de/logo-header.jpg";
        var HN = "Hotel Europa";
        var infoUrl = "https://pms.hotel-europa-ruesselsheim.de/api/guest-info?token=" + token;

        var emailHtml = '<table width="100%" cellspacing="0" cellpadding="0" style="background-color:#F5F3EF;font-family:Arial,sans-serif;"><tr><td align="center" style="padding:20px 10px;"><table width="580" cellspacing="0" cellpadding="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">'
          + '<tr><td style="background:#58585A;padding:20px 30px;text-align:center;border-bottom:3px solid #D4940E"><img src="' + LOGO + '" width="320" style="width:100%;max-width:320px;"/></td></tr>'
          + '<tr><td style="padding:30px 30px 10px;"><h1 style="font-size:22px;color:#58585A;margin:0 0 6px;">Reservierungsbestaetigung</h1><div style="width:60px;height:3px;background:#D4940E;border-radius:2px;margin-bottom:20px;"></div></td></tr>'
          + '<tr><td style="padding:0 30px;font-size:15px;color:#58585A;line-height:1.7;">' + greet + ',<br><br>vielen Dank! Ihr Angebot wurde angenommen und Ihre Reservierung ist hiermit bestaetigt.<br><br>Wir freuen uns sehr, Sie demnachst als Gast willkommen zu heissen.</td></tr>'
          + '<tr><td style="padding:20px 30px;"><div style="background:#F5F3EF;border-radius:10px;padding:18px;">'
          + '<table width="100%" style="font-size:14px;color:#58585A;">'
          + '<tr><td style="padding:6px 0;font-weight:600;width:45%;">Zimmerkategorie:</td><td style="padding:6px 0;">' + (ut?.name || "") + '</td></tr>'
          + '<tr><td style="padding:6px 0;font-weight:600;">Anreise:</td><td style="padding:6px 0;">' + fd(rv.check_in) + '</td></tr>'
          + '<tr><td style="padding:6px 0;font-weight:600;">Abreise:</td><td style="padding:6px 0;">' + fd(rv.check_out) + '</td></tr>'
          + '<tr><td style="padding:6px 0;font-weight:600;">Naechte:</td><td style="padding:6px 0;">' + nights + '</td></tr>'
          + '<tr><td style="padding:6px 0;font-weight:600;">Erwachsene:</td><td style="padding:6px 0;">' + (rv.adults || 1) + '</td></tr>'
          + (rv.children > 0 ? '<tr><td style="padding:6px 0;font-weight:600;">Kinder:</td><td style="padding:6px 0;">' + rv.children + '</td></tr>' : '')
          + '<tr><td style="padding:10px 0 6px;font-weight:700;font-size:18px;border-top:2px solid #DDD9D2;">Gesamtpreis:</td><td style="padding:10px 0 6px;font-weight:700;font-size:18px;border-top:2px solid #DDD9D2;">' + parseFloat(rv.total_price || 0).toFixed(2) + ' EUR</td></tr>'
          + '</table></div></td></tr>'
          + '<tr><td style="padding:10px 30px;text-align:center;"><a href="' + infoUrl + '" style="display:inline-block;background:#8B7D6B;color:#ffffff;text-decoration:none;padding:16px 40px;border-radius:10px;font-weight:700;font-size:16px;">Alle Infos zu Ihrem Aufenthalt</a><br><span style="font-size:12px;color:#ABA596;margin-top:8px;display:inline-block;">Check-in &middot; Parken &middot; Golden Masala Restaurant &middot; Umgebung</span></td></tr>'
          + '<tr><td style="padding:10px 30px;"><div style="background:#F5F3EF;border-radius:10px;padding:16px;font-size:12px;color:#58585A;line-height:1.7;"><strong>Wichtige Hinweise</strong><br>Check-in ab 15:00 Uhr | Check-out bis 11:00 Uhr<br>Stornierung bis 7 Tage vor Anreise: 80% Gebuehr. Ab 3 Tagen / No-Show: voller Preis.<br>Im gesamten Hotel gilt striktes Rauchverbot (Reinigungspauschale 300 EUR).</div></td></tr>'
          + '<tr><td style="padding:20px 30px 24px;font-size:14px;color:#58585A;">Wir wuenschen Ihnen eine angenehme Anreise!<br><br>Mit herzlichen Gruessen<br><strong>' + HN + '</strong></td></tr>'
          + '<tr><td style="background:#ABA596;padding:18px 30px;color:#ffffff;font-size:12px;line-height:1.6;text-align:center;"><strong>' + HN + '</strong><br>Marktplatz 1 &middot; 65428 Ruesselsheim<br>Tel.: 015903081422<br>E-Mail: <a style="color:#ffffff;" href="mailto:info@hotel-europa-ruesselsheim.de">info@hotel-europa-ruesselsheim.de</a></td></tr>'
          + '</table></td></tr></table>';

        // Email an Gast senden
        try {
          await fetch("https://pms.hotel-europa-ruesselsheim.de/api/send-email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              to: guest.email,
              subject: "Ihre Reservierungsbestaetigung - " + HN,
              html: emailHtml,
              emailType: "bestaetigung"
            })
          });
        } catch (mailErr) {
          console.error("offer-response: mail error:", mailErr.message);
        }

        // Kopie an Hotel
        try {
          await fetch("https://pms.hotel-europa-ruesselsheim.de/api/send-email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              to: "info@hotel-europa-ruesselsheim.de",
              subject: "Angebot angenommen: " + (guest.first_name || "") + " " + (guest.last_name || "") + " (" + fd(rv.check_in) + " - " + fd(rv.check_out) + ")",
              html: emailHtml.replace("Reservierungsbestaetigung", "Angebot angenommen!").replace(greet + ",", "<strong>Gast hat Angebot angenommen:</strong><br>" + (guest.salutation || "") + " " + (guest.first_name || "") + " " + (guest.last_name || "") + "<br>E-Mail: " + guest.email + (guest.phone ? "<br>Tel: " + guest.phone : "") + "<br><br>"),
              emailType: "hotel-notification"
            })
          });
        } catch (mailErr2) {}
      }

      return res.status(200).send(page("Angebot angenommen!", "Vielen Dank, " + (guest?.first_name || "") + "! Ihre Reservierung ist bestaetigt. Eine Bestaetigungsmail wurde an " + (guest?.email || "Ihre E-Mail-Adresse") + " gesendet.<br><br>Wir freuen uns auf Ihren Besuch!", "success"));
    }

    return res.status(400).send(page("Fehler", "Unbekannte Aktion.", "error"));

  } catch (err) {
    return res.status(500).send(page("Fehler", "Es ist ein technischer Fehler aufgetreten: " + err.message, "error"));
  }
}

function fd(d) {
  var t = new Date(d);
  return t.getDate().toString().padStart(2, "0") + "." + (t.getMonth() + 1).toString().padStart(2, "0") + "." + t.getFullYear();
}

function confirmPage(rv, guest, ut, token) {
  var nights = Math.max(1, Math.round((new Date(rv.check_out) - new Date(rv.check_in)) / 86400000));
  return '<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Angebot annehmen - Hotel Europa</title>'
    + '<style>'
    + '*{margin:0;padding:0;box-sizing:border-box}'
    + 'body{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;background:#F5F3EF;color:#2C2C2C;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}'
    + '.card{background:#fff;border-radius:16px;max-width:580px;width:100%;box-shadow:0 8px 30px rgba(0,0,0,.1);overflow:hidden}'
    + '.header{background:#58585A;padding:24px;text-align:center;border-bottom:3px solid #D4940E}'
    + '.header img{max-width:280px;width:100%;margin-bottom:8px}'
    + '.header h1{color:#fff;font-size:20px;font-weight:700}'
    + '.body{padding:28px}'
    + '.greeting{font-size:15px;color:#58585A;margin-bottom:20px;line-height:1.6}'
    + '.details{background:#F5F3EF;border-radius:10px;padding:16px;margin-bottom:20px}'
    + '.details table{width:100%;font-size:14px}'
    + '.details td{padding:5px 0;color:#58585A}'
    + '.details td:first-child{font-weight:600;width:45%}'
    + '.details .total{font-size:20px;font-weight:800;color:#58585A;border-top:2px solid #DDD9D2;padding-top:10px;margin-top:6px}'
    + '.conditions{background:#fff;border:1px solid #DDD9D2;border-radius:10px;padding:18px;margin-bottom:20px;font-size:13px;color:#58585A;line-height:1.7}'
    + '.conditions h3{font-size:14px;font-weight:700;color:#58585A;margin:14px 0 6px}'
    + '.conditions h3:first-child{margin-top:0}'
    + '.conditions ul{margin:0 0 8px 18px}'
    + '.conditions li{margin-bottom:4px}'
    + '.check-row{display:flex;align-items:flex-start;gap:10px;margin:20px 0;padding:14px 16px;background:#FEF9F0;border:2px solid #E8D5B0;border-radius:10px}'
    + '.check-row input{width:20px;height:20px;margin-top:2px;accent-color:#8B7D6B;flex-shrink:0;cursor:pointer}'
    + '.check-row label{font-size:14px;font-weight:600;color:#58585A;cursor:pointer}'
    + '.btn{display:block;width:100%;padding:16px;border:none;border-radius:12px;font-size:16px;font-weight:700;cursor:pointer;text-align:center;transition:all .2s}'
    + '.btn-accept{background:#8B7D6B;color:#fff}'
    + '.btn-accept:hover{background:#74685A}'
    + '.btn-accept:disabled{background:#CBC6BE;cursor:not-allowed}'
    + '.footer{background:#ABA596;padding:16px 24px;color:#fff;font-size:12px;text-align:center;line-height:1.6}'
    + '.footer a{color:#fff}'
    + '</style></head><body>'
    + '<div class="card">'
    + '<div class="header"><img src="https://pms.hotel-europa-ruesselsheim.de/logo-header.jpg" alt="Hotel Europa"/><h1>Angebot annehmen</h1></div>'
    + '<div class="body">'
    + '<div class="greeting">' + (guest?.salutation || "") + ' ' + (guest?.last_name || "Gast") + ',<br><br>vielen Dank fuer Ihr Interesse! Bitte pruefen Sie die Details Ihrer Buchung und akzeptieren Sie unsere Buchungsbedingungen.</div>'
    + '<div class="details"><table>'
    + '<tr><td>Zimmerkategorie:</td><td>' + (ut?.name || "") + '</td></tr>'
    + '<tr><td>Anreise:</td><td>' + fd(rv.check_in) + '</td></tr>'
    + '<tr><td>Abreise:</td><td>' + fd(rv.check_out) + '</td></tr>'
    + '<tr><td>Naechte:</td><td>' + nights + '</td></tr>'
    + '<tr><td>Erwachsene:</td><td>' + (rv.adults || 1) + '</td></tr>'
    + (rv.children > 0 ? '<tr><td>Kinder:</td><td>' + rv.children + '</td></tr>' : '')
    + '<tr><td class="total">Gesamtpreis:</td><td class="total">' + parseFloat(rv.total_price || 0).toFixed(2) + ' EUR</td></tr>'
    + '</table></div>'
    + '<div class="conditions">'
    + '<h3>Stornierung &amp; No-Show</h3><ul>'
    + '<li>Stornierungen bitten wir schriftlich mitzuteilen.</li>'
    + '<li>Bis 7 Tage vor Anreise: Stornierung moeglich gegen eine Gebuehr von 80&nbsp;% des Gesamtpreises.</li>'
    + '<li>Ab 3 Tagen vor Anreise: Eine Stornierung ist leider nicht mehr moeglich &ndash; es wird der volle Preis berechnet.</li>'
    + '<li>Bei Nichtanreise (No-Show) wird ebenfalls der volle Preis faellig.</li>'
    + '<li>Bei vorzeitiger Abreise ist keine Erstattung moeglich.</li></ul>'
    + '<h3>An- &amp; Abreise</h3><ul>'
    + '<li>Check-in ab 15:00 Uhr</li>'
    + '<li>Check-out bis 11:00 Uhr &ndash; bei spaeterer Raeumung koennen zusaetzliche Kosten anfallen.</li></ul>'
    + '<h3>Rauchverbot</h3><ul>'
    + '<li>Im gesamten Hotelgebaeude gilt ein striktes Rauchverbot. Bei Verstoss wird eine Reinigungspauschale von 300&nbsp;&euro; berechnet.</li></ul>'
    + '</div>'
    + '<div class="check-row"><input type="checkbox" id="agb" onchange="document.getElementById(\'submitBtn\').disabled=!this.checked"/><label for="agb">Ich habe die Buchungsbedingungen gelesen und akzeptiere diese.</label></div>'
    + '<a id="submitBtn" href="/api/offer-response?token=' + token + '&action=accept&confirmed=yes" class="btn btn-accept" disabled style="pointer-events:none;opacity:.5;text-decoration:none" onclick="return document.getElementById(\'agb\').checked">Reservierung verbindlich bestaetigen</a>'
    + '<script>document.getElementById("agb").addEventListener("change",function(){var b=document.getElementById("submitBtn");if(this.checked){b.style.pointerEvents="auto";b.style.opacity="1";b.removeAttribute("disabled")}else{b.style.pointerEvents="none";b.style.opacity=".5";b.setAttribute("disabled","")}})<\/script>'
    + '</div>'
    + '<div class="footer"><strong>Hotel Europa</strong><br>Marktplatz 1 &middot; 65428 Ruesselsheim<br>Tel.: 015903081422<br>E-Mail: <a href="mailto:info@hotel-europa-ruesselsheim.de">info@hotel-europa-ruesselsheim.de</a></div>'
    + '</div></body></html>';
}

function page(title, message, type) {
  var iconBg = type === "success" ? "#8B7D6B" : type === "declined" ? "#ABA596" : type === "info" ? "#58585A" : "#DC2626";
  var icon = type === "success" ? "&#10003;" : type === "declined" ? "&#10005;" : type === "info" ? "&#8505;" : "&#9888;";
  return '<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>' + title + ' - Hotel Europa</title>'
    + '<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;background:#F5F3EF;color:#2C2C2C;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:20px}'
    + '.card{background:#fff;border-radius:16px;max-width:480px;width:100%;box-shadow:0 8px 30px rgba(0,0,0,.1);overflow:hidden;text-align:center}'
    + '.header{background:#58585A;padding:24px}.header img{max-width:250px;width:100%}'
    + '.body{padding:40px 28px}'
    + '.icon{width:70px;height:70px;border-radius:35px;display:inline-flex;align-items:center;justify-content:center;font-size:32px;color:#fff;margin-bottom:16px}'
    + 'h1{font-size:22px;color:#58585A;margin-bottom:12px}'
    + 'p{font-size:15px;color:#7A7A7A;line-height:1.6}'
    + '.footer{background:#ABA596;padding:14px;color:#fff;font-size:11px;border-top:3px solid #D4940E}'
    + '</style></head><body>'
    + '<div class="card">'
    + '<div class="header"><img src="https://pms.hotel-europa-ruesselsheim.de/logo-header.jpg" alt="Hotel Europa"/></div>'
    + '<div class="body"><div class="icon" style="background:' + iconBg + '">' + icon + '</div>'
    + '<h1>' + title + '</h1><p>' + message + '</p></div>'
    + '<div class="footer">Hotel Europa &middot; Marktplatz 1 &middot; 65428 Ruesselsheim</div>'
    + '</div></body></html>';
}
