// api/send-arrival-info.js
// Vercel Cron Job — sendet 5 Tage vor Anreise eine Willkommens-E-Mail
// Cron: taeglich um 08:00 UTC (= 10:00 MESZ)

module.exports = async function handler(req, res) {
  // Sicherheit: nur Vercel Cron oder manueller Aufruf mit Secret
  const authHeader = req.headers["authorization"];
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const SB_URL = "https://ztdtkncoyrkvdpytwuhy.supabase.co";
  const SB_KEY = process.env.SUPABASE_SERVICE_KEY;
  const RESEND_KEY = process.env.RESEND_API_KEY;
  const FROM_EMAIL = process.env.FROM_EMAIL || "info@hotel-europa-ruesselsheim.de";
  const FROM_NAME = process.env.FROM_NAME || "Hotel Europa Ruesselsheim";
  const BASE_URL = "https://pms.hotel-europa-ruesselsheim.de";

  if (!SB_KEY || !RESEND_KEY) {
    return res.status(500).json({ error: "Missing env vars" });
  }

  const headers = {
    "Content-Type": "application/json",
    apikey: SB_KEY,
    Authorization: "Bearer " + SB_KEY,
  };

  try {
    // Datum: heute + 5 Tage
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(today);
    target.setDate(target.getDate() + 5);
    const todayStr = fmt(today);
    const targetStr = fmt(target);

    // Reservierungen laden: Anreise zwischen heute und heute+5,
    // Status reservierung/checkedin, info_email_sent_at ist null
    const rvResp = await fetch(
      SB_URL +
        "/rest/v1/reservations?select=*,guests(*),rooms(*,unit_types(*))" +
        "&check_in=gte." + todayStr +
        "&check_in=lte." + targetStr +
        "&status=in.(reservierung,kostenuebernahme)" +
        "&info_email_sent_at=is.null" +
        "&order=check_in",
      { headers }
    );
    const reservations = await rvResp.json();

    if (!Array.isArray(reservations)) {
      return res.status(200).json({ sent: 0, error: "Unexpected response", raw: reservations });
    }

    let sent = 0;
    let skipped = 0;
    const errors = [];

    for (const rv of reservations) {
      const guest = rv.guests;
      if (!guest?.email) {
        skipped++;
        continue;
      }

      const room = rv.rooms;
      const ut = room?.unit_types;
      const greet =
        (guest.salutation === "Frau"
          ? "Sehr geehrte Frau"
          : guest.salutation === "Herr"
          ? "Sehr geehrter Herr"
          : "Sehr geehrte/r") +
        " " +
        (guest.last_name || "Gast");

      const roomName = ut?.name || "";
      const infoUrl = BASE_URL + "/api/guest-info?token=" + rv.offer_token;

      const subj = "Willkommen im Hotel Europa - Infos zu Ihrem Aufenthalt";
      const html = buildEmail(greet, rv, roomName, infoUrl);

      try {
        // E-Mail senden via Resend
        const emailResp = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + RESEND_KEY,
          },
          body: JSON.stringify({
            from: FROM_NAME + " <" + FROM_EMAIL + ">",
            to: [guest.email],
            cc: [FROM_EMAIL],
            reply_to: FROM_EMAIL,
            subject: subj,
            html: html,
          }),
        });

        const emailData = await emailResp.json();

        if (emailResp.ok) {
          // Tracking: info_email_sent_at setzen
          await fetch(
            SB_URL + "/rest/v1/reservations?id=eq." + rv.id,
            {
              method: "PATCH",
              headers: { ...headers, Prefer: "return=minimal" },
              body: JSON.stringify({ info_email_sent_at: new Date().toISOString() }),
            }
          );
          sent++;
        } else {
          errors.push({ guest: guest.email, error: emailData.message || "Resend error" });
        }
      } catch (e) {
        errors.push({ guest: guest.email, error: e.message });
      }

      // Kleine Pause zwischen E-Mails
      await new Promise((r) => setTimeout(r, 500));
    }

    return res.status(200).json({
      success: true,
      total: reservations.length,
      sent,
      skipped,
      errors: errors.length > 0 ? errors : undefined,
      date: todayStr,
      targetDate: targetStr,
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
};

function fmt(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return y + "-" + m + "-" + day;
}

function fmtDE(dateStr) {
  const d = new Date(dateStr);
  return (
    String(d.getDate()).padStart(2, "0") +
    "." +
    String(d.getMonth() + 1).padStart(2, "0") +
    "." +
    d.getFullYear()
  );
}

function buildEmail(greet, rv, roomName, infoUrl) {
  const LOGO = "https://pms.hotel-europa-ruesselsheim.de/logo-header.jpg";
  const HN = "Hotel Europa";

  return (
    '<table width="100%" cellspacing="0" cellpadding="0" style="background-color:#F5F5F7;font-family:Arial,sans-serif;"><tr><td align="center" style="padding:20px 10px;"><table width="580" cellspacing="0" cellpadding="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.06);">' +
    '<tr><td style="background:#fff;padding:20px 30px;text-align:center;border-bottom:1px solid #E5E7EB"><img src="' + LOGO + '" width="320" style="width:100%;max-width:320px;"/></td></tr>' +
    '<tr><td style="padding:30px 30px 10px;"><h1 style="font-size:22px;color:#111;margin:0 0 6px;">Willkommen im ' + HN + '!</h1><div style="width:60px;height:3px;background:#D4940E;border-radius:2px;margin-bottom:20px;"></div></td></tr>' +
    '<tr><td style="padding:0 30px;font-size:15px;color:#374151;line-height:1.7;">' +
    greet + ',<br><br>' +
    'in wenigen Tagen ist es soweit &ndash; wir freuen uns sehr, Sie bei uns begruessen zu duerfen!<br><br>' +
    'Damit Sie bestens vorbereitet sind, haben wir alle wichtigen Informationen zu Ihrem Aufenthalt fuer Sie zusammengestellt:' +
    '</td></tr>' +
    '<tr><td style="padding:20px 30px;"><div style="background:#FEF6E7;border-radius:10px;padding:18px;border:1px solid #F0D9A0;">' +
    '<table width="100%" cellspacing="0" style="font-size:14px;color:#374151;">' +
    '<tr><td style="padding:6px 0;font-weight:600;">Anreise:</td><td style="padding:6px 0;">' + fmtDE(rv.check_in) + '</td></tr>' +
    '<tr><td style="padding:6px 0;font-weight:600;">Abreise:</td><td style="padding:6px 0;">' + fmtDE(rv.check_out) + '</td></tr>' +
    '<tr><td style="padding:6px 0;font-weight:600;">Zimmer:</td><td style="padding:6px 0;">' + roomName + '</td></tr>' +
    '<tr><td style="padding:6px 0;font-weight:600;">WLAN:</td><td style="padding:6px 0;font-family:monospace;letter-spacing:1px;">Hotelguest2023</td></tr>' +
    '</table></div></td></tr>' +
    '<tr><td style="padding:10px 30px 10px;font-size:14px;color:#374151;line-height:1.7;">' +
    'In Ihrer digitalen Gaestemappe finden Sie alles Wichtige:<br>' +
    '&#10003; Check-in &amp; Check-out Zeiten<br>' +
    '&#10003; Parkmoeglichkeiten<br>' +
    '&#10003; Unser Restaurant Golden Masala<br>' +
    '&#10003; WLAN-Zugang &amp; Fruehstueckszeiten<br>' +
    '&#10003; Zahlungsuebersicht' +
    '</td></tr>' +
    '<tr><td style="padding:10px 30px 10px;text-align:center;">' +
    '<a href="' + infoUrl + '" style="display:inline-block;background:#D4940E;color:#ffffff;text-decoration:none;padding:16px 40px;border-radius:10px;font-weight:700;font-size:16px;">Ihre digitale Gaestemappe</a>' +
    '<br><span style="font-size:12px;color:#9CA3AF;margin-top:8px;display:inline-block;">Alle Infos auf einen Blick</span>' +
    '</td></tr>' +
    '<tr><td style="padding:20px 30px 24px;font-size:14px;color:#374151;">' +
    'Wir wuenschen Ihnen eine angenehme Anreise und freuen uns auf Sie!<br><br>' +
    'Mit herzlichen Gruessen<br><strong>' + HN + '</strong>' +
    '</td></tr>' +
    '<tr><td style="background:#374151;padding:18px 30px;color:#ffffff;font-size:12px;line-height:1.6;text-align:center;">' +
    '<strong>' + HN + '</strong><br>Marktplatz 1 &middot; 65428 Ruesselsheim<br>' +
    'Tel.: 015903081422<br>' +
    'E-Mail: <a style="color:#ffffff;" href="mailto:info@hotel-europa-ruesselsheim.de">info@hotel-europa-ruesselsheim.de</a><br>' +
    '<a style="color:#ffffff;" href="http://www.hotel-europa-ruesselsheim.de">www.hotel-europa-ruesselsheim.de</a>' +
    '</td></tr>' +
    '</table></td></tr></table>'
  );
}
