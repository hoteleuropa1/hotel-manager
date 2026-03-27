// api/offer-response.js
// Gast klickt auf Annehmen/Ablehnen Link in der E-Mail

module.exports = async function handler(req, res) {
  const { token, action } = req.query;

  if (!token || !action) {
    return res.status(400).send(errorPage("Ungültiger Link", "Dieser Link ist nicht gültig."));
  }

  const sbUrl = process.env.SUPABASE_URL || "https://ztdtkncoyrkvdpytwuhy.supabase.co";
  const sbKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY || "";

  try {
    // Reservierung über Token finden
    const findRes = await fetch(
      `${sbUrl}/rest/v1/reservations?offer_token=eq.${token}&select=*`,
      { headers: { apikey: sbKey, Authorization: `Bearer ${sbKey}` } }
    );
    const reservations = await findRes.json();

    if (!reservations || reservations.length === 0) {
      return res.status(404).send(errorPage("Nicht gefunden", "Dieses Angebot wurde nicht gefunden oder ist abgelaufen."));
    }

    const reservation = reservations[0];

    if (reservation.status !== "angebot") {
      return res.status(400).send(successPage(
        reservation.status === "reservierung" ? "Bereits bestätigt" : "Nicht mehr gültig",
        reservation.status === "reservierung" 
          ? "Dieses Angebot wurde bereits angenommen. Ihre Reservierung ist bestätigt!" 
          : "Dieses Angebot ist nicht mehr gültig.",
        reservation.status === "reservierung" ? "#10B981" : "#6B7280"
      ));
    }

    if (action === "accept") {
      // Status auf Reservierung setzen
      await fetch(
        `${sbUrl}/rest/v1/reservations?id=eq.${reservation.id}`,
        {
          method: "PATCH",
          headers: { apikey: sbKey, Authorization: `Bearer ${sbKey}`, "Content-Type": "application/json", Prefer: "return=representation" },
          body: JSON.stringify({ status: "reservierung", offer_accepted_at: new Date().toISOString() })
        }
      );

      // Gast-Daten holen für Bestätigungsmail
      const guestRes = await fetch(
        `${sbUrl}/rest/v1/guests?id=eq.${reservation.guest_id}&select=*`,
        { headers: { apikey: sbKey, Authorization: `Bearer ${sbKey}` } }
      );
      const guests = await guestRes.json();
      const guest = guests[0];

      // Zimmer-Daten holen
      const roomRes = await fetch(
        `${sbUrl}/rest/v1/rooms?id=eq.${reservation.room_id}&select=*`,
        { headers: { apikey: sbKey, Authorization: `Bearer ${sbKey}` } }
      );
      const rooms = await roomRes.json();
      const room = rooms[0];

      // Unit Type holen
      const utRes = await fetch(
        `${sbUrl}/rest/v1/unit_types?id=eq.${room.unit_type_id}&select=*`,
        { headers: { apikey: sbKey, Authorization: `Bearer ${sbKey}` } }
      );
      const unitTypes = await utRes.json();
      const ut = unitTypes[0];

      // Hotel Info holen
      const hiRes = await fetch(
        `${sbUrl}/rest/v1/hotel_info?select=*&limit=1`,
        { headers: { apikey: sbKey, Authorization: `Bearer ${sbKey}` } }
      );
      const hotelInfos = await hiRes.json();
      const hi = hotelInfos[0] || {};

      // Automatische Bestätigungsmail senden
      if (guest && guest.email) {
        const nights = Math.round((new Date(reservation.check_out) - new Date(reservation.check_in)) / 86400000);
        const fd = d => { const t = new Date(d); return `${t.getDate().toString().padStart(2,"0")}.${(t.getMonth()+1).toString().padStart(2,"0")}.${t.getFullYear()}`; };
        const fmt = n => parseFloat(n || 0).toFixed(2);

        const confirmHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;background:#F3F4F6;font-family:sans-serif"><div style="max-width:600px;margin:0 auto;padding:24px"><div style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,.08)"><div style="background:linear-gradient(135deg,#3B82F6,#1D4ED8);padding:32px;text-align:center"><h1 style="color:#fff;margin:0;font-size:24px">${hi.name || 'Hotel'}</h1><p style="color:rgba(255,255,255,.8);margin:8px 0 0;font-size:14px">${hi.address || ''}</p></div><div style="padding:32px"><div style="background:#D1FAE5;border-radius:10px;padding:16px;text-align:center;margin-bottom:20px"><p style="color:#065F46;font-weight:700;font-size:16px;margin:0">✓ Reservierung bestätigt</p></div><h2 style="margin:0 0 8px;font-size:20px">Ihre Reservierungsbestätigung</h2><p style="color:#6B7280;font-size:15px;line-height:1.6">${guest.salutation ? guest.salutation + ' ' : 'Sehr geehrte/r '}${guest.last_name},<br><br>vielen Dank! Ihre Reservierung ist hiermit bestätigt.</p><div style="background:#F9FAFB;border-radius:12px;padding:20px;margin:20px 0;border:1px solid #E5E7EB"><table style="width:100%;font-size:14px"><tr><td style="padding:6px 0;color:#6B7280"><strong>Zimmer</strong></td><td>${room.name} – ${ut ? ut.name : ''}</td></tr><tr><td style="padding:6px 0;color:#6B7280"><strong>Anreise</strong></td><td>${fd(reservation.check_in)} (Check-in ab 15:00)</td></tr><tr><td style="padding:6px 0;color:#6B7280"><strong>Abreise</strong></td><td>${fd(reservation.check_out)} (Check-out bis 11:00)</td></tr><tr><td style="padding:6px 0;color:#6B7280"><strong>Nächte</strong></td><td>${nights}</td></tr><tr><td style="padding:6px 0;color:#6B7280"><strong>Personen</strong></td><td>${reservation.adults} Erw.${reservation.children > 0 ? ', ' + reservation.children + ' Kinder' : ''}</td></tr><tr><td style="padding:6px 0;color:#6B7280"><strong>Preis</strong></td><td style="font-weight:700">€ ${fmt(reservation.total_price)}</td></tr></table></div><p style="color:#374151;margin-top:20px">Wir freuen uns auf Ihren Besuch!<br><strong>${hi.name || ''}</strong></p></div><div style="background:#F9FAFB;padding:24px;border-top:1px solid #E5E7EB;text-align:center;font-size:12px;color:#6B7280"><p style="margin:0">${hi.name || ''} · ${hi.address || ''} · ${hi.phone || ''}</p></div></div></div></body></html>`;

        const resendKey = process.env.RESEND_API_KEY;
        const fromEmail = process.env.FROM_EMAIL || "onboarding@resend.dev";
        const fromName = process.env.FROM_NAME || hi.name || "Hotel";
        const ccEmail = process.env.CC_EMAIL || fromEmail;

        if (resendKey) {
          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${resendKey}` },
            body: JSON.stringify({
              from: `${fromName} <${fromEmail}>`,
              to: [guest.email],
              cc: [ccEmail],
              subject: `Reservierungsbestätigung – ${ut ? ut.name : ''} Zimmer ${room.name} | ${hi.name || 'Hotel'}`,
              html: confirmHtml
            })
          });
          console.log(`✅ Bestätigungsmail automatisch gesendet an ${guest.email}`);
        }
      }

      return res.status(200).send(successPage(
        "Vielen Dank!",
        "Ihr Angebot wurde angenommen. Sie erhalten in Kürze eine Reservierungsbestätigung per E-Mail.",
        "#10B981"
      ));

    } else if (action === "decline") {
      await fetch(
        `${sbUrl}/rest/v1/reservations?id=eq.${reservation.id}`,
        {
          method: "PATCH",
          headers: { apikey: sbKey, Authorization: `Bearer ${sbKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({ status: "abgelehnt", offer_declined_at: new Date().toISOString() })
        }
      );

      return res.status(200).send(successPage(
        "Angebot abgelehnt",
        "Schade! Sollten Sie es sich anders überlegen, kontaktieren Sie uns gerne.",
        "#EF4444"
      ));
    }

    return res.status(400).send(errorPage("Ungültige Aktion", "Bitte nutzen Sie die Links aus der E-Mail."));

  } catch (error) {
    console.error("Offer response error:", error);
    return res.status(500).send(errorPage("Fehler", "Es ist ein Fehler aufgetreten. Bitte kontaktieren Sie uns direkt."));
  }
};

function successPage(title, message, color) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head><body style="margin:0;padding:0;background:#F3F4F6;font-family:-apple-system,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh"><div style="background:#fff;border-radius:20px;padding:48px;max-width:440px;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,.1)"><div style="width:64px;height:64px;border-radius:50%;background:${color};display:flex;align-items:center;justify-content:center;margin:0 auto 20px"><svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3"><path d="${color === '#10B981' ? 'M20 6L9 17l-5-5' : 'M18 6L6 18M6 6l12 12'}"/></svg></div><h1 style="font-size:24px;font-weight:800;margin:0 0 12px">${title}</h1><p style="color:#6B7280;font-size:16px;line-height:1.6">${message}</p></div></body></html>`;
}

function errorPage(title, message) {
  return successPage(title, message, "#6B7280");
}
