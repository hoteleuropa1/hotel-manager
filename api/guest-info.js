// api/guest-info.js
// Gaeste-Infoseite mit Check-in, Parkplaetze, Restaurant

export default async function handler(req, res) {
  const SB_URL = process.env.SUPABASE_URL || "https://ztdtkncoyrkvdpytwuhy.supabase.co";
  const SB_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
  const { token } = req.query;
  const headers = { "Content-Type": "application/json", apikey: SB_KEY, Authorization: "Bearer " + SB_KEY };

  var guestName = "";
  var checkIn = "";
  var checkOut = "";
  var roomType = "";

  if (token) {
    try {
      const rr = await fetch(SB_URL + "/rest/v1/reservations?offer_token=eq." + token + "&select=*,guests(*),rooms(*,unit_types(*))", { headers });
      const reservations = await rr.json();
      if (reservations && reservations.length) {
        const rv = reservations[0];
        const g = rv.guests;
        const ut = rv.rooms?.unit_types;
        guestName = (g?.salutation || "") + " " + (g?.last_name || "Gast");
        checkIn = fd(rv.check_in);
        checkOut = fd(rv.check_out);
        roomType = ut?.name || "";
      }
    } catch (e) {}
  }

  res.setHeader("Content-Type", "text/html; charset=utf-8");
  return res.status(200).send(buildPage(guestName, checkIn, checkOut, roomType));
}

function fd(d) {
  var t = new Date(d);
  return t.getDate().toString().padStart(2, "0") + "." + (t.getMonth() + 1).toString().padStart(2, "0") + "." + t.getFullYear();
}

function buildPage(guestName, checkIn, checkOut, roomType) {
  return '<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Ihr Aufenthalt - Hotel Europa</title>'
  + '<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet">'
  + '<style>'
  + '*{margin:0;padding:0;box-sizing:border-box}'
  + 'body{font-family:Inter,sans-serif;background:#F5F3EF;color:#2C2C2C;-webkit-font-smoothing:antialiased}'
  + 'h1,h2,h3{font-family:"Playfair Display",serif;color:#58585A}'
  + '.hero{background:linear-gradient(135deg,#58585A 0%,#4A4A4C 100%);padding:40px 20px;text-align:center;border-bottom:3px solid #D4940E}'
  + '.hero img{max-width:300px;width:80%;margin-bottom:16px}'
  + '.hero h1{color:#fff;font-size:28px;font-weight:600;margin-bottom:6px}'
  + '.hero p{color:#ABA596;font-size:15px}'
  + '.wrap{max-width:720px;margin:0 auto;padding:0 20px}'
  + '.section{padding:40px 0;border-bottom:1px solid #DDD9D2}'
  + '.section:last-child{border-bottom:none}'
  + '.section-label{font-size:12px;text-transform:uppercase;letter-spacing:2px;color:#D4940E;margin-bottom:8px;font-weight:600}'
  + '.section h2{font-size:24px;margin-bottom:16px}'
  + '.section h2::after{content:"";display:block;width:40px;height:2px;background:#D4940E;margin-top:8px}'
  + '.section p{font-size:15px;color:#58585A;line-height:1.8}'
  + '.info-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin:20px 0}'
  + '.info-card{background:#fff;border-radius:12px;padding:20px;border:1px solid #DDD9D2}'
  + '.info-card .label{font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#D4940E;margin-bottom:4px;font-weight:600}'
  + '.info-card .value{font-size:20px;font-weight:600;color:#58585A}'
  + '.info-card .sub{font-size:13px;color:#8B7D6B;margin-top:4px}'
  + '.tip{background:#FEF6E7;border-left:3px solid #D4940E;border-radius:0 8px 8px 0;padding:14px 18px;margin:16px 0;font-size:13px;color:#7A5F1F;line-height:1.7}'
  + '.map-container{position:relative;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #DDD9D2;margin:20px 0}'
  + '.map-container img{width:100%;display:block}'
  + '.map-pin{position:absolute;width:32px;height:32px;background:#8B7D6B;border-radius:50% 50% 50% 0;transform:rotate(-45deg);cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,.2);transition:transform .2s;z-index:2}'
  + '.map-pin:hover{transform:rotate(-45deg) scale(1.15)}'
  + '.map-pin span{transform:rotate(45deg);color:#fff;font-weight:700;font-size:12px}'
  + '.map-pin.free{background:#6B8F5B}'
  + '.map-popup{display:none;position:absolute;background:#fff;border-radius:10px;padding:16px;box-shadow:0 8px 30px rgba(0,0,0,.15);border:1px solid #DDD9D2;width:240px;z-index:10;font-size:13px;color:#58585A;line-height:1.6}'
  + '.map-popup.active{display:block}'
  + '.map-popup h4{font-family:"Playfair Display",serif;font-size:15px;margin-bottom:6px;color:#58585A}'
  + '.map-popup .close{position:absolute;top:8px;right:10px;background:none;border:none;font-size:18px;cursor:pointer;color:#ABA596}'
  + '.parking-list{display:flex;flex-direction:column;gap:12px;margin:20px 0}'
  + '.parking-item{display:flex;gap:14px;background:#fff;border-radius:12px;padding:16px;border:1px solid #DDD9D2;align-items:flex-start}'
  + '.parking-icon{width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:700;color:#fff;flex-shrink:0}'
  + '.parking-item h4{font-size:14px;font-weight:600;color:#58585A;margin-bottom:2px}'
  + '.parking-item p{font-size:12px;color:#8B7D6B;line-height:1.5;margin:0}'
  + '.restaurant-card{background:#fff;border-radius:16px;overflow:hidden;border:1px solid #DDD9D2;margin:20px 0}'
  + '.restaurant-img{height:220px;background:linear-gradient(135deg,#58585A 0%,#8B7D6B 50%,#D4940E 100%);display:flex;align-items:center;justify-content:center}'
  + '.restaurant-img h3{color:#fff;font-size:32px;font-weight:600}'
  + '.restaurant-body{padding:24px}'
  + '.restaurant-body p{margin-bottom:16px}'
  + '.restaurant-hours{display:grid;grid-template-columns:auto 1fr;gap:4px 16px;font-size:13px;margin:12px 0}'
  + '.restaurant-hours dt{font-weight:600;color:#58585A}'
  + '.restaurant-hours dd{color:#8B7D6B}'
  + '.btn{display:inline-flex;align-items:center;gap:8px;padding:14px 28px;background:#8B7D6B;color:#fff;border:none;border-radius:10px;font-size:15px;font-weight:600;cursor:pointer;text-decoration:none;transition:background .2s}'
  + '.btn:hover{background:#74685A}'
  + '.btn-outline{background:transparent;color:#8B7D6B;border:1.5px solid #8B7D6B}'
  + '.btn-outline:hover{background:#8B7D6B;color:#fff}'
  + '.footer{background:#58585A;padding:30px 20px;text-align:center;color:#ABA596;font-size:13px;line-height:1.8;margin-top:40px;border-top:3px solid #D4940E}'
  + '.footer a{color:#fff;text-decoration:none}'
  + '.footer strong{color:#fff}'
  + '.divider{width:50px;height:2px;background:#D4940E;border-radius:2px;margin:0 auto 24px}'
  + '@media(max-width:600px){.info-grid{grid-template-columns:1fr}.hero h1{font-size:22px}}'
  + '</style></head><body>'

  // HERO
  + '<div class="hero"><img src="https://pms.hotel-europa-ruesselsheim.de/logo-header.jpg" alt="Hotel Europa"/>'
  + '<h1>Willkommen' + (guestName ? ', ' + guestName : '') + '</h1>'
  + '<div style="color:#D4940E;font-size:16px;letter-spacing:4px;margin:6px 0;">&#9733; &#9733; &#9733;</div>'
  + '<p>Alle Informationen fuer Ihren Aufenthalt' + (checkIn ? ' vom ' + checkIn + ' bis ' + checkOut : '') + '</p></div>'

  + '<div class="wrap">'

  // CHECK-IN / CHECK-OUT
  + '<div class="section"><div class="section-label">Ankunft &amp; Abreise</div><h2>Check-in &amp; Check-out</h2>'
  + '<div class="info-grid">'
  + '<div class="info-card"><div class="label">Check-in</div><div class="value">ab 15:00 Uhr</div><div class="sub">Rezeption bis 22:00 Uhr besetzt</div></div>'
  + '<div class="info-card"><div class="label">Check-out</div><div class="value">bis 11:00 Uhr</div><div class="sub">Spaeter auf Anfrage</div></div>'
  + '</div>'
  + (roomType ? '<div class="info-grid"><div class="info-card"><div class="label">Ihr Zimmer</div><div class="value">' + roomType + '</div></div>' + (checkIn ? '<div class="info-card"><div class="label">Zeitraum</div><div class="value" style="font-size:16px">' + checkIn + ' &ndash; ' + checkOut + '</div></div>' : '') + '</div>' : '')
  + '<div class="tip"><strong>Self-Check-in moeglich!</strong> Falls Sie nach 22:00 Uhr anreisen, erhalten Sie vorab einen Zugangscode per E-Mail oder SMS. So koennen Sie jederzeit einchecken.</div>'
  + '<p><strong>Adresse fuer das Navi:</strong><br>Marktplatz 1, 65428 Ruesselsheim</p>'
  + '<p style="margin-top:12px"><strong>Mit der Bahn:</strong> S-Bahn S8 oder S9, Haltestelle Ruesselsheim Bahnhof. Von dort 5 Gehminuten ueber die Marktstrasse zum Marktplatz.</p>'
  + '</div>'

  // PARKPLAETZE
  + '<div class="section"><div class="section-label">Parken</div><h2>Parkmoeglichkeiten</h2>'
  + '<p>Rund um das Hotel gibt es mehrere Parkmoeglichkeiten. Klicken Sie auf die Markierungen in der Karte fuer Details.</p>'
  + '<div class="map-container" style="height:360px;background:#E8E4DC;position:relative">'
  + '<iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2562.5!2d8.4118!3d49.9917!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x47bd95f5a7a9a8a7%3A0x422435029b0c600!2sMarktplatz%201%2C%2065428%20R%C3%BCsselsheim!5e0!3m2!1sde!2sde!4v1" width="100%" height="360" style="border:0;border-radius:12px;" allowfullscreen="" loading="lazy"></iframe>'
  + '</div>'
  + '<div class="parking-list">'
  + '<div class="parking-item"><div class="parking-icon" style="background:#8B7D6B">P1</div><div><h4>Ludwigstrasse</h4><p><strong>1 Gehminute</strong> &ndash; direkt hinter dem Hotel<br>Kostenlos: Mo&ndash;Fr 18:00&ndash;08:00, Sa &amp; So ganztaegig<br>Tagsueber: Parkschein am Automaten</p></div></div>'
  + '<div class="parking-item"><div class="parking-icon" style="background:#A0522D">P2</div><div><h4>Dammgasse / Landungsplatz</h4><p><strong>3 Gehminuten</strong> &ndash; am Mainufer<br>Kostenlos: Mo&ndash;Fr 18:00&ndash;08:00, Sa &amp; So ganztaegig<br>Tagsueber: Parkschein am Automaten</p></div></div>'
  + '<div class="parking-item"><div class="parking-icon free" style="background:#6B8F5B">P3</div><div><h4>Weisenauer Strasse</h4><p><strong>5 Gehminuten</strong> &ndash; <strong style="color:#6B8F5B">immer kostenlos!</strong><br>Keine Zeitbegrenzung, auch tagsueber<br>Unser Tipp fuer Geschaeftsreisende</p></div></div>'
  + '</div>'
  + '<div class="tip"><strong>Tipp:</strong> Wer tagsueber kostenfrei parken moechte, findet an der Weisenauer Strasse immer einen Platz. Am Abend und am Wochenende sind die Parkplaetze in der Ludwigstrasse direkt am Hotel kostenfrei.</div>'
  + '</div>'

  // RESTAURANT
  + '<div class="section"><div class="section-label">Kulinarisches</div><h2>Restaurant Europa</h2>'
  + '<div class="restaurant-card">'
  + '<div class="restaurant-img"><h3>Indische Kueche</h3></div>'
  + '<div class="restaurant-body">'
  + '<p>Unser Restaurant verwohnt Sie mit authentischer indischer Kueche &ndash; von aromatischen Currys ueber frisch gebackenes Naan bis zu wuerzigen Tandoori-Spezialitaeten. Als Hotelgast geniessen Sie Ihr Abendessen ohne Reservierung direkt im Haus.</p>'
  + '<dl class="restaurant-hours">'
  + '<dt>Taeglich</dt><dd>11:00 &ndash; 22:00 Uhr</dd>'
  + '<dt>Warme Kueche</dt><dd>11:30 &ndash; 14:30 &amp; 17:30 &ndash; 21:30 Uhr</dd>'
  + '<dt>Terrasse</dt><dd>Saisonal auf dem Marktplatz</dd>'
  + '</dl>'
  + '<div style="margin-top:20px;display:flex;gap:12px;flex-wrap:wrap">'
  + '<a href="http://www.hotel-europa-ruesselsheim.de/de/Restaurant-Saal/" class="btn">Speisekarte ansehen</a>'
  + '<a href="tel:+4915903081422" class="btn btn-outline">Tisch reservieren</a>'
  + '</div></div></div>'
  + '</div>'

  // FRUEHSTUECK
  + '<div class="section"><div class="section-label">Morgens</div><h2>Fruehstueck</h2>'
  + '<p>Starten Sie gestaerkt in den Tag mit unserem Fruehstuecksbuffet: frische Broetchen, Aufschnitt, Kaese, Muesli, Obst, Eier, Saft und natuerlich Kaffee &amp; Tee. Fruehstueck ist taeglich von <strong>07:00 bis 10:00 Uhr</strong> im Restaurant.</p>'
  + '<div class="info-grid"><div class="info-card"><div class="label">Preis</div><div class="value">14 EUR</div><div class="sub">pro Person / Nacht</div></div><div class="info-card"><div class="label">Uhrzeit</div><div class="value">07:00 &ndash; 10:00</div><div class="sub">Taeglich im Restaurant</div></div></div>'
  + '<div class="tip">Fruehstueck nicht gebucht? Kein Problem &ndash; sprechen Sie uns einfach am Vortag oder beim Check-in an.</div>'
  + '</div>'

  // UMGEBUNG
  + '<div class="section"><div class="section-label">In der Naehe</div><h2>Gut zu wissen</h2>'
  + '<div class="info-grid">'
  + '<div class="info-card"><div class="label">WLAN</div><div class="value">Kostenlos</div><div class="sub">Im gesamten Hotel verfuegbar</div></div>'
  + '<div class="info-card"><div class="label">Supermarkt</div><div class="value">1 Min.</div><div class="sub">REWE direkt um die Ecke</div></div>'
  + '<div class="info-card"><div class="label">Bahnhof</div><div class="value">5 Min.</div><div class="sub">S8/S9 zum Flughafen (12 Min.)</div></div>'
  + '<div class="info-card"><div class="label">Flughafen Frankfurt</div><div class="value">12 Min.</div><div class="sub">S-Bahn S8 oder S9</div></div>'
  + '</div></div>'

  + '</div>'

  // FOOTER
  + '<div class="footer"><strong>Hotel Europa</strong><br>Marktplatz 1 &middot; 65428 Ruesselsheim<br>'
  + 'Tel.: <a href="tel:+4915903081422">015903081422</a> &middot; <a href="mailto:info@hotel-europa-ruesselsheim.de">info@hotel-europa-ruesselsheim.de</a><br>'
  + '<a href="http://www.hotel-europa-ruesselsheim.de">www.hotel-europa-ruesselsheim.de</a></div>'

  + '</body></html>';
}
