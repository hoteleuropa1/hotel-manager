// api/guest-info.js
export default async function handler(req, res) {
  const SB_URL = process.env.SUPABASE_URL || "https://ztdtkncoyrkvdpytwuhy.supabase.co";
  const SB_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
  const { token } = req.query;
  const headers = { "Content-Type": "application/json", apikey: SB_KEY, Authorization: "Bearer " + SB_KEY };

  // POST: Gastdaten aktualisieren
  if (req.method === "POST") {
    try {
      const { guest_id, first_name, last_name, company, phone, address, zip, city } = req.body;
      if (!guest_id) return res.status(400).json({ error: "guest_id fehlt" });
      const r = await fetch(SB_URL + "/rest/v1/guests?id=eq." + guest_id, {
        method: "PATCH", headers: { ...headers, Prefer: "return=representation" },
        body: JSON.stringify({ first_name, last_name, company, phone, address, zip, city })
      });
      if (!r.ok) return res.status(500).json({ error: "Update fehlgeschlagen" });
      return res.status(200).json({ success: true });
    } catch (e) { return res.status(500).json({ error: e.message }); }
  }

  var gn = "", ci = "", co = "", rt = "", guestData = null, paymentsHtml = "", balanceHtml = "", guestFormHtml = "", guestId = "";
  if (token) {
    try {
      const rr = await fetch(SB_URL + "/rest/v1/reservations?offer_token=eq." + token + "&select=*,guests(*),rooms(*,unit_types(*))", { headers });
      const rv = (await rr.json())[0];
      if (rv) {
        const g = rv.guests;
        guestData = g;
        guestId = g?.id || "";
        rt = rv.rooms?.unit_types?.name || "";
        gn = (g?.salutation ? g.salutation + " " : "") + (g?.last_name || "Gast");
        ci = fd(rv.check_in); co = fd(rv.check_out);

        // Zahlungen laden
        const pr = await fetch(SB_URL + "/rest/v1/payments?reservation_id=eq." + rv.id + "&order=created_at.desc", { headers });
        const payments = await pr.json();
        const totalPaid = (payments || []).filter(p => p.status === "eingegangen").reduce((s, p) => s + parseFloat(p.amount || 0), 0);

        // Items laden
        const ir = await fetch(SB_URL + "/rest/v1/reservation_items?reservation_id=eq." + rv.id, { headers });
        const items = await ir.json();
        const itemsTotal = (items || []).filter(i => i.item_type === "product").reduce((s, i) => s + parseFloat(i.total_price || 0), 0);

        const grandTotal = parseFloat(rv.total_price || 0) + itemsTotal;
        const balance = grandTotal - totalPaid;

        balanceHtml = '<div class="section"><div class="section-label">Finanzen</div><h2>Zahlungsstatus</h2>'
          + '<div class="info-grid">'
          + '<div class="info-card"><div class="label">Gesamtbetrag</div><div class="value">' + fmt(grandTotal) + ' EUR</div></div>'
          + '<div class="info-card"><div class="label">Bezahlt</div><div class="value" style="color:#059669">' + fmt(totalPaid) + ' EUR</div></div>'
          + '</div>'
          + '<div class="info-card" style="margin:12px 0;text-align:center"><div class="label">Noch offen</div><div class="value" style="font-size:28px;color:' + (balance > 0 ? '#DC2626' : '#059669') + '">' + fmt(balance) + ' EUR</div>'
          + (balance <= 0 ? '<div style="margin-top:8px"><span style="background:#D1FAE5;color:#065F46;padding:4px 14px;border-radius:99px;font-size:12px;font-weight:600">Vollstaendig bezahlt</span></div>' : '<div style="margin-top:8px"><span style="background:#FEF3C7;color:#92400E;padding:4px 14px;border-radius:99px;font-size:12px;font-weight:600">Zahlung offen</span></div>')
          + '</div>';

        if (payments && payments.length > 0) {
          balanceHtml += '<div style="margin-top:16px"><div style="font-size:13px;font-weight:600;color:#58585A;margin-bottom:8px">Zahlungshistorie</div>';
          payments.forEach(p => {
            const methods = { bar: "Bar", ec: "EC-Karte", mastercard: "Mastercard", visa: "Visa", ueberweisung: "Ueberweisung", paypal: "PayPal", booking_online: "Booking" };
            balanceHtml += '<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 14px;background:#fff;border:1px solid #DDD9D2;border-radius:8px;margin-bottom:6px;font-size:13px">'
              + '<div><div style="font-weight:500;color:#58585A">' + (methods[p.payment_method] || p.payment_method) + '</div><div style="font-size:11px;color:#ABA596">' + fd(p.paid_at || p.created_at) + '</div></div>'
              + '<div style="font-weight:600;color:' + (p.status === "eingegangen" ? "#059669" : "#D97706") + '">' + fmt(p.amount) + ' EUR</div></div>';
          });
          balanceHtml += '</div>';
        }
        balanceHtml += '</div>';

        // Gastdaten-Formular
        guestFormHtml = '<div class="section"><div class="section-label">Ihre Daten</div><h2>Daten aktualisieren</h2>'
          + '<p style="margin-bottom:16px">Bitte ueberpruefen und aktualisieren Sie Ihre Daten fuer den Meldeschein.</p>'
          + '<div id="save-success" style="display:none;background:#D1FAE5;color:#065F46;padding:12px 16px;border-radius:10px;font-size:13px;margin-bottom:12px;font-weight:500">Daten erfolgreich aktualisiert!</div>'
          + '<div class="info-grid">'
          + '<div><label class="form-label">Vorname</label><input class="form-input" id="g_fn" value="' + (g?.first_name || '') + '"/></div>'
          + '<div><label class="form-label">Nachname</label><input class="form-input" id="g_ln" value="' + (g?.last_name || '') + '"/></div>'
          + '</div>'
          + '<label class="form-label">Firma</label><input class="form-input" id="g_co" value="' + (g?.company || '') + '"/>'
          + '<label class="form-label">Telefon</label><input class="form-input" id="g_ph" value="' + (g?.phone || '') + '"/>'
          + '<label class="form-label">Strasse und Hausnummer</label><input class="form-input" id="g_ad" value="' + (g?.address || '') + '"/>'
          + '<div class="info-grid">'
          + '<div><label class="form-label">PLZ</label><input class="form-input" id="g_zip" value="' + (g?.zip || '') + '"/></div>'
          + '<div><label class="form-label">Ort</label><input class="form-input" id="g_city" value="' + (g?.city || '') + '"/></div>'
          + '</div>'
          + '<button class="btn" id="save-btn" onclick="saveGuest()" style="width:100%;justify-content:center;margin-top:8px">Daten speichern</button>'
          + '</div>';
      }
    } catch (e) {}
  }
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  return res.status(200).send(buildPage(gn, ci, co, rt, balanceHtml, guestFormHtml, guestId, token));
}
function fd(d) { var t = new Date(d); return t.getDate().toString().padStart(2, "0") + "." + (t.getMonth() + 1).toString().padStart(2, "0") + "." + t.getFullYear(); }
function fmt(n) { return parseFloat(n || 0).toFixed(2); }

function buildPage(gn, ci, co, rt, balanceHtml, guestFormHtml, guestId, token) {
return `<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Ihre digitale Gaestemappe - Hotel Europa</title>
<link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:Inter,sans-serif;background:#F5F3EF;color:#2C2C2C;-webkit-font-smoothing:antialiased}
h1,h2,h3{font-family:"Playfair Display",serif;color:#58585A}
.hero{background:#58585A;padding:40px 20px;text-align:center;border-bottom:3px solid #D4940E}
.hero img{max-width:300px;width:80%;margin-bottom:12px}
.hero h1{color:#fff;font-size:28px;font-weight:600;margin-bottom:6px}
.hero .stars{color:#D4940E;font-size:16px;letter-spacing:4px;margin:6px 0}
.hero p{color:#ABA596;font-size:15px}
.wrap{max-width:720px;margin:0 auto;padding:0 20px}
.section{padding:40px 0;border-bottom:1px solid #DDD9D2}
.section:last-child{border-bottom:none}
.section-label{font-size:12px;text-transform:uppercase;letter-spacing:2px;color:#D4940E;margin-bottom:8px;font-weight:600}
.section h2{font-size:24px;margin-bottom:16px}
.section h2::after{content:"";display:block;width:40px;height:2px;background:#D4940E;margin-top:8px}
.section p{font-size:15px;color:#58585A;line-height:1.8}
.info-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin:12px 0}
.info-card{background:#fff;border-radius:12px;padding:20px;border:1px solid #DDD9D2}
.info-card .label{font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#D4940E;margin-bottom:4px;font-weight:600}
.info-card .value{font-size:20px;font-weight:600;color:#58585A}
.info-card .sub{font-size:13px;color:#8B7D6B;margin-top:4px}
.tip{background:#FEF6E7;border-left:3px solid #D4940E;border-radius:0 8px 8px 0;padding:14px 18px;margin:16px 0;font-size:13px;color:#7A5F1F;line-height:1.7}
.parking-list{display:flex;flex-direction:column;gap:12px;margin:20px 0}
.parking-item{display:flex;gap:14px;background:#fff;border-radius:12px;padding:16px;border:1px solid #DDD9D2;align-items:flex-start}
.parking-icon{width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:700;color:#fff;flex-shrink:0}
.parking-item h4{font-size:14px;font-weight:600;color:#58585A;margin-bottom:2px}
.parking-item p{font-size:12px;color:#8B7D6B;line-height:1.5;margin:0}
.restaurant-card{background:#fff;border-radius:16px;overflow:hidden;border:1px solid #DDD9D2;margin:20px 0}
.restaurant-header{padding:24px;display:flex;align-items:center;gap:16px;background:linear-gradient(135deg,#58585A 0%,#8B7D6B 50%,#D4940E 100%)}
.restaurant-header h3{color:#fff;font-size:24px;font-weight:600;margin:0}
.restaurant-header p{color:rgba(255,255,255,.8);font-size:13px;margin:4px 0 0}
.restaurant-body{padding:24px}
.restaurant-body p{margin-bottom:16px}
.restaurant-hours{display:grid;grid-template-columns:auto 1fr;gap:4px 16px;font-size:13px;margin:12px 0}
.restaurant-hours dt{font-weight:600;color:#58585A}
.restaurant-hours dd{color:#8B7D6B}
.btn{display:inline-flex;align-items:center;gap:8px;padding:14px 28px;background:#8B7D6B;color:#fff;border:none;border-radius:10px;font-size:15px;font-weight:600;cursor:pointer;text-decoration:none;transition:background .2s}
.btn:hover{background:#74685A}
.btn-outline{background:transparent;color:#8B7D6B;border:1.5px solid #8B7D6B}
.btn-outline:hover{background:#8B7D6B;color:#fff}
.btn-orange{background:#D4940E}
.btn-orange:hover{background:#B87D0B}
.form-label{display:block;font-size:12px;font-weight:600;color:#8B7D6B;margin-bottom:4px;text-transform:uppercase;letter-spacing:0.5px}
.form-input{width:100%;padding:12px 14px;border:1px solid #DDD9D2;border-radius:10px;font-size:15px;outline:none;box-sizing:border-box;margin-bottom:12px;font-family:Inter,sans-serif;transition:border .2s}
.form-input:focus{border-color:#D4940E}
.footer{background:#58585A;padding:30px 20px;text-align:center;color:#ABA596;font-size:13px;line-height:1.8;margin-top:40px;border-top:3px solid #D4940E}
.footer a{color:#fff;text-decoration:none}
.footer strong{color:#fff}
.menu-overlay{display:none;position:fixed;inset:0;background:rgba(0,0,0,.85);z-index:1000;align-items:center;justify-content:center;flex-direction:column}
.menu-overlay.active{display:flex}
.menu-close{position:absolute;top:16px;right:20px;background:none;border:none;color:#fff;font-size:32px;cursor:pointer;z-index:1001}
.menu-nav{display:flex;align-items:center;gap:20px;margin-top:16px}
.menu-nav button{background:rgba(255,255,255,.15);border:none;color:#fff;width:48px;height:48px;border-radius:50%;font-size:24px;cursor:pointer;display:flex;align-items:center;justify-content:center}
.menu-nav button:hover{background:rgba(255,255,255,.3)}
.menu-page-num{color:#fff;font-size:14px;font-weight:500}
.menu-content{background:#fff;border-radius:12px;max-width:640px;width:90vw;max-height:75vh;overflow-y:auto;padding:32px;position:relative}
.menu-cat{margin-bottom:28px}
.menu-cat h3{font-family:"Playfair Display",serif;font-size:20px;color:#A0522D;margin-bottom:4px}
.menu-item{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px dotted #DDD9D2;font-size:14px}
.menu-item:last-child{border-bottom:none}
.menu-item .name{font-weight:500;color:#58585A}
.menu-item .desc{font-size:11px;color:#ABA596;margin-top:1px}
.menu-item .price{font-weight:600;color:#D4940E;white-space:nowrap;margin-left:12px}
.menu-var{display:flex;gap:6px;flex-wrap:wrap;margin:8px 0 16px;justify-content:center}
.menu-var span{background:#F5F3EF;border:1px solid #DDD9D2;border-radius:8px;padding:6px 10px;font-size:11px;text-align:center;min-width:70px}
.menu-var span strong{display:block;font-size:12px;color:#58585A}
.menu-var span em{font-style:normal;color:#D4940E;font-weight:600}
@media(max-width:600px){.info-grid{grid-template-columns:1fr}.hero h1{font-size:22px}.menu-content{padding:20px}}
</style></head><body>

<div class="hero">
<div class="logo-strip"><img src="https://pms.hotel-europa-ruesselsheim.de/logo-header.jpg" alt="Hotel Europa"/></div>
<div class="hero-text">
<h1>Ihre digitale Gaestemappe</h1>
<div class="stars">&starf; &starf; &starf;</div>
<p>${gn ? "Willkommen, " + gn + " &ndash; " : ""}${ci ? ci + " bis " + co : "Alle Informationen fuer Ihren Aufenthalt"}</p>
</div>
</div>

<div class="wrap">

${balanceHtml}

${guestFormHtml}

<div class="section">
<div class="section-label">Ankunft &amp; Abreise</div>
<h2>Check-in &amp; Check-out</h2>
<div class="info-grid">
<div class="info-card"><div class="label">Check-in</div><div class="value">ab 15:00 Uhr</div><div class="sub">Rezeption bis 22:00 Uhr besetzt</div></div>
<div class="info-card"><div class="label">Check-out</div><div class="value">bis 11:00 Uhr</div><div class="sub">Spaeter auf Anfrage</div></div>
</div>
${rt ? '<div class="info-grid"><div class="info-card"><div class="label">Ihr Zimmer</div><div class="value">' + rt + '</div></div>' + (ci ? '<div class="info-card"><div class="label">Zeitraum</div><div class="value" style="font-size:16px">' + ci + ' &ndash; ' + co + '</div></div>' : '') + '</div>' : ''}
<div class="tip"><strong>Self-Check-in moeglich!</strong> Falls Sie nach 22:00 Uhr anreisen, erhalten Sie vorab einen Zugangscode per E-Mail oder SMS.</div>
<p><strong>Adresse fuers Navi:</strong> Marktplatz 1, 65428 Ruesselsheim</p>
<p style="margin-top:12px"><strong>Mit der Bahn:</strong> S8 oder S9, Haltestelle Ruesselsheim Bahnhof &ndash; dann 5 Gehminuten ueber die Marktstrasse.</p>
</div>

<div class="section">
<div class="section-label">Parken</div>
<h2>Parkmoeglichkeiten</h2>
<p>Rund um das Hotel gibt es mehrere Parkmoeglichkeiten. Tippen Sie auf die Markierungen fuer Details.</p>
<div style="position:relative;border-radius:12px;overflow:hidden;border:1px solid #DDD9D2;margin:16px 0">
<img src="https://pms.hotel-europa-ruesselsheim.de/parkplaetze-karte.png" style="width:100%;display:block" alt="Karte"/>
<div onclick="togglePin(1)" style="position:absolute;left:40%;top:53%;transform:translate(-50%,-100%);cursor:pointer;z-index:2">
<div style="background:#8B7D6B;color:#fff;font-weight:700;font-size:13px;padding:6px 12px;border-radius:20px;box-shadow:0 2px 8px rgba(0,0,0,.3);white-space:nowrap">P1</div>
<div style="width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:6px solid #8B7D6B;margin:0 auto"></div>
</div>
<div onclick="togglePin(2)" style="position:absolute;left:38%;top:18%;transform:translate(-50%,-100%);cursor:pointer;z-index:2">
<div style="background:#A0522D;color:#fff;font-weight:700;font-size:13px;padding:6px 12px;border-radius:20px;box-shadow:0 2px 8px rgba(0,0,0,.3);white-space:nowrap">P2</div>
<div style="width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:6px solid #A0522D;margin:0 auto"></div>
</div>
<div onclick="togglePin(3)" style="position:absolute;left:58%;top:88%;transform:translate(-50%,-100%);cursor:pointer;z-index:2">
<div style="background:#6B8F5B;color:#fff;font-weight:700;font-size:13px;padding:6px 12px;border-radius:20px;box-shadow:0 2px 8px rgba(0,0,0,.3);white-space:nowrap">P3 Kostenlos!</div>
<div style="width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:6px solid #6B8F5B;margin:0 auto"></div>
</div>
<div id="pin1" style="display:none;position:absolute;left:40%;top:53%;transform:translate(-50%,-110%) translateY(-32px);background:#fff;border-radius:10px;padding:14px;box-shadow:0 4px 20px rgba(0,0,0,.2);width:220px;z-index:10;font-size:12px;color:#58585A;line-height:1.5">
<button onclick="togglePin(1)" style="position:absolute;top:6px;right:8px;background:none;border:none;font-size:16px;cursor:pointer;color:#ABA596">&times;</button>
<strong style="color:#8B7D6B">P1 &ndash; Ludwigstrasse</strong><br>1 Gehminute, direkt hinter dem Hotel<br><br><strong>Kostenlos:</strong> Mo&ndash;Fr 18&ndash;08 Uhr, Sa &amp; So ganztaegig<br>Tagsueber: Parkschein am Automaten
</div>
<div id="pin2" style="display:none;position:absolute;left:38%;top:18%;transform:translate(-50%,-110%) translateY(-32px);background:#fff;border-radius:10px;padding:14px;box-shadow:0 4px 20px rgba(0,0,0,.2);width:220px;z-index:10;font-size:12px;color:#58585A;line-height:1.5">
<button onclick="togglePin(2)" style="position:absolute;top:6px;right:8px;background:none;border:none;font-size:16px;cursor:pointer;color:#ABA596">&times;</button>
<strong style="color:#A0522D">P2 &ndash; Dammgasse / Landungsplatz</strong><br>3 Gehminuten, am Mainufer<br><br><strong>Kostenlos:</strong> Mo&ndash;Fr 18&ndash;08 Uhr, Sa &amp; So ganztaegig<br>Tagsueber: Parkschein am Automaten
</div>
<div id="pin3" style="display:none;position:absolute;left:58%;top:88%;transform:translate(-50%,-110%) translateY(-32px);background:#fff;border-radius:10px;padding:14px;box-shadow:0 4px 20px rgba(0,0,0,.2);width:220px;z-index:10;font-size:12px;color:#58585A;line-height:1.5">
<button onclick="togglePin(3)" style="position:absolute;top:6px;right:8px;background:none;border:none;font-size:16px;cursor:pointer;color:#ABA596">&times;</button>
<strong style="color:#6B8F5B">P3 &ndash; Weisenauer Strasse</strong><br>5 Gehminuten<br><br><span style="color:#6B8F5B;font-weight:700">Immer kostenlos!</span><br>Keine Zeitbegrenzung, auch tagsueber.<br>Unser Tipp fuer Geschaeftsreisende!
</div>
</div>

<div class="parking-list">
<div class="parking-item"><div class="parking-icon" style="background:#8B7D6B">P1</div><div><h4>Ludwigstrasse</h4><p><strong>1 Gehminute</strong> &ndash; direkt hinter dem Hotel<br>Kostenlos: Mo&ndash;Fr 18:00&ndash;08:00, Sa &amp; So ganztaegig<br>Tagsueber: Parkschein am Automaten</p></div></div>
<div class="parking-item"><div class="parking-icon" style="background:#A0522D">P2</div><div><h4>Dammgasse / Landungsplatz</h4><p><strong>3 Gehminuten</strong> &ndash; am Mainufer<br>Kostenlos: Mo&ndash;Fr 18:00&ndash;08:00, Sa &amp; So ganztaegig<br>Tagsueber: Parkschein am Automaten</p></div></div>
<div class="parking-item"><div class="parking-icon" style="background:#6B8F5B">P3</div><div><h4>Weisenauer Strasse</h4><p><strong>5 Gehminuten</strong> &ndash; <strong style="color:#6B8F5B">immer kostenlos!</strong><br>Keine Zeitbegrenzung, auch tagsueber<br>Unser Tipp fuer Geschaeftsreisende</p></div></div>
</div>
<div class="tip"><strong>Tipp:</strong> Wer tagsueber kostenfrei parken moechte, findet an der Weisenauer Strasse immer einen Platz.</div>
</div>

<div class="section">
<div class="section-label">Kulinarisches</div>
<h2>Golden Masala</h2>
<div class="restaurant-card">
<div class="restaurant-header">
<img src="https://pms.hotel-europa-ruesselsheim.de/golden-masala-logo.png" style="height:70px;border-radius:8px;flex-shrink:0" alt="Golden Masala" onerror="this.style.display='none'"/>
<div>
<h3>Golden Masala</h3>
<p>Indian Restaurant &ndash; im Hotel Europa</p>
</div>
</div>
<div class="restaurant-body">
<p>Unser Restaurant verwohnt Sie mit authentischer indischer Kueche &ndash; von aromatischen Currys ueber frisch gebackenes Naan bis zu wuerzigen Tandoori-Spezialitaeten.</p>
<dl class="restaurant-hours">
<dt>Montag &ndash; Sonntag</dt><dd>11:00 &ndash; 14:00 &amp; 17:00 &ndash; 22:00 Uhr</dd>
<dt>Terrasse</dt><dd>Saisonal auf dem Marktplatz</dd>
<dt>Zum Mitnehmen</dt><dd>Alle Gerichte!</dd>
</dl>
<div style="margin-top:20px;display:flex;gap:12px;flex-wrap:wrap">
<button class="btn btn-orange" onclick="openMenu()">Speisekarte ansehen</button>
<a href="https://pms.hotel-europa-ruesselsheim.de/speisekarte.pdf" download class="btn btn-outline">&#8681; PDF</a>
</div>
</div></div>
</div>

<div class="section">
<div class="section-label">Morgens</div>
<h2>Fruehstueck</h2>
<p>Starten Sie gestaerkt in den Tag mit unserem Fruehstuecksbuffet.</p>
<div class="info-grid">
<div class="info-card"><div class="label">Preis</div><div class="value">14 EUR</div><div class="sub">pro Person / Nacht</div></div>
<div class="info-card"><div class="label">Uhrzeit</div><div class="value">07:00 &ndash; 10:00</div><div class="sub">Taeglich im Restaurant</div></div>
</div>
</div>

<div class="section">
<div class="section-label">Gut zu wissen</div>
<h2>In der Naehe</h2>
<div class="info-grid">
<div class="info-card"><div class="label">WLAN</div><div class="value">Kostenlos</div><div class="sub">Im gesamten Hotel</div></div>
<div class="info-card"><div class="label">Supermarkt</div><div class="value">1 Min.</div><div class="sub">REWE direkt um die Ecke</div></div>
<div class="info-card"><div class="label">Bahnhof</div><div class="value">5 Min.</div><div class="sub">S8/S9 zum Flughafen (12 Min.)</div></div>
<div class="info-card"><div class="label">Flughafen</div><div class="value">12 Min.</div><div class="sub">S-Bahn S8 oder S9</div></div>
</div>
</div>
</div>

<!-- SPEISEKARTEN VIEWER -->
<div class="menu-overlay" id="menuOverlay">
<button class="menu-close" onclick="closeMenu()">&times;</button>
<div class="menu-content" id="menuContent"></div>
<div class="menu-nav">
<button onclick="menuGo(-1)" id="menuPrev">&larr;</button>
<span class="menu-page-num" id="menuPageNum">1 / 12</span>
<button onclick="menuGo(1)" id="menuNext">&rarr;</button>
</div>
</div>

<div class="footer">
<strong>Hotel Europa</strong><br>
Marktplatz 1 &middot; 65428 Ruesselsheim<br>
Tel.: <a href="tel:+4915903081422">015903081422</a> &middot; <a href="mailto:info@hotel-europa-ruesselsheim.de">info@hotel-europa-ruesselsheim.de</a><br>
<a href="http://www.hotel-europa-ruesselsheim.de">www.hotel-europa-ruesselsheim.de</a>
</div>

<script>
function togglePin(n){for(var i=1;i<=3;i++){var el=document.getElementById('pin'+i);if(el)el.style.display=i===n&&el.style.display==='none'?'block':'none'}}

async function saveGuest(){
  var btn=document.getElementById('save-btn');
  btn.disabled=true;btn.textContent='Speichere...';
  try{
    var r=await fetch(window.location.pathname+'?token=${token||""}',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
      guest_id:'${guestId}',
      first_name:document.getElementById('g_fn').value,
      last_name:document.getElementById('g_ln').value,
      company:document.getElementById('g_co').value,
      phone:document.getElementById('g_ph').value,
      address:document.getElementById('g_ad').value,
      zip:document.getElementById('g_zip').value,
      city:document.getElementById('g_city').value
    })});
    var d=await r.json();
    if(d.success){var m=document.getElementById('save-success');m.style.display='block';setTimeout(function(){m.style.display='none'},4000)}
    else{alert('Fehler: '+(d.error||'Unbekannt'))}
  }catch(e){alert('Fehler: '+e.message)}
  btn.disabled=false;btn.textContent='Daten speichern';
}

var MP=[
{t:"Willkommen",html:'<div style="text-align:center;padding:10px 0"><h2 style="font-family:Playfair Display,serif;font-size:22px;color:#58585A;margin:0 0 16px">Golden Masala</h2></div><p style="font-size:14px;color:#58585A;line-height:1.8">Wir bieten <strong>7 spezielle indische Kocharten</strong>. Alle Varianten mit Gemuese, Fleisch, Fisch oder Kaese. Auch Vegan.<br><br>Bitte waehlen Sie: <strong>scharf, mittelscharf oder mild</strong>.<br><br>Ohne Natrium-Glutamat. <strong>Alle Gerichte auch zum Mitnehmen!</strong></p>'},
{t:"Getraenke",html:'<h3 style="font-family:Playfair Display,serif;font-size:20px;color:#A0522D;margin:0 0 14px">Alkoholfreie Getraenke</h3><div class="menu-item"><div><div class="name">Coca-Cola, Zero, Fanta, Sprite</div><div class="desc">0,33l</div></div><div class="price">3,20 &euro;</div></div><div class="menu-item"><div><div class="name">Apfelsaft / Orangensaft</div><div class="desc">0,2l / 0,4l</div></div><div class="price">2,20 / 3,50 &euro;</div></div><div class="menu-item"><div><div class="name">Fachingen Edelwasser</div><div class="desc">0,25l / 0,75l</div></div><div class="price">2,50 / 5,90 &euro;</div></div><div class="menu-item"><div><div class="name">Lassi suess oder sauer</div><div class="desc">0,1l / 0,3l</div></div><div class="price">1,30 / 3,30 &euro;</div></div><div class="menu-item"><div><div class="name">Indischer Eistee</div><div class="desc">0,5l</div></div><div class="price">5,90 &euro;</div></div><h3 style="font-family:Playfair Display,serif;font-size:18px;color:#A0522D;margin:18px 0 10px">Warme Getraenke</h3><div class="menu-item"><div><div class="name">Indischer Chai</div></div><div class="price">4,90 &euro;</div></div><div class="menu-item"><div><div class="name">Kaffee / Espresso</div></div><div class="price">2,90 &euro;</div></div><div class="menu-item"><div><div class="name">Cappuccino</div></div><div class="price">3,10 &euro;</div></div>'},
{t:"Weine & Biere",html:'<h3 style="font-family:Playfair Display,serif;font-size:20px;color:#A0522D;margin:0 0 14px">Weine (offen, 0,2l)</h3><div class="menu-item"><div><div class="name">Riesling / Chardonnay</div></div><div class="price">ab 4,70 &euro;</div></div><div class="menu-item"><div><div class="name">Dornfelder / Spaetburgunder</div></div><div class="price">ab 4,40 &euro;</div></div><div class="menu-item"><div><div class="name">Indischer Wein (Angoori)</div></div><div class="price">5,70 &euro;</div></div><h3 style="font-family:Playfair Display,serif;font-size:18px;color:#A0522D;margin:18px 0 10px">Biere</h3><div class="menu-item"><div><div class="name">Kingfisher (indisch)</div><div class="desc">0,33l</div></div><div class="price">3,90 &euro;</div></div><div class="menu-item"><div><div class="name">Krombacher Pils vom Fass</div><div class="desc">0,3l / 0,5l</div></div><div class="price">3,50 / 4,90 &euro;</div></div>'},
{t:"Vorspeisen",html:'<h3 style="font-family:Playfair Display,serif;font-size:20px;color:#A0522D;margin:0 0 14px">Suppen &amp; Vorspeisen</h3><div class="menu-item"><div><div class="name">Linsensuppe (Shorba Atlas)</div></div><div class="price">4,50 &euro;</div></div><div class="menu-item"><div><div class="name">Huehnersuppe mit Kokos</div></div><div class="price">4,90 &euro;</div></div><div class="menu-item"><div><div class="name">Samosa (Gemuese)</div></div><div class="price">3,90 &euro;</div></div><div class="menu-item"><div><div class="name">Samosa Teller mit Salat</div></div><div class="price">9,90 &euro;</div></div><div class="menu-item"><div><div class="name">Pakorasa Mix</div></div><div class="price">7,90 &euro;</div></div>'},
{t:"Currys",html:'<h3 style="font-family:Playfair Display,serif;font-size:20px;color:#A0522D;margin:0 0 6px">Currys</h3><p style="font-size:13px;color:#8B7D6B;margin-bottom:14px">Mit Basmati-Reis. Spezial mit Mango, Spinat oder Kichererbsen +2,90 &euro;</p><div class="menu-var"><span><strong>Gemuese</strong><em>12,90&euro;</em></span><span><strong>Paneer</strong><em>13,90&euro;</em></span><span><strong>Chicken</strong><em>14,90&euro;</em></span><span><strong>Lamm</strong><em>17,90&euro;</em></span><span><strong>Garnelen</strong><em>18,90&euro;</em></span></div>'},
{t:"Tandoori & Karahi",html:'<h3 style="font-family:Playfair Display,serif;font-size:20px;color:#A0522D;margin:0 0 6px">Tandoori</h3><p style="font-size:13px;color:#8B7D6B;margin-bottom:14px">Im Lehmofen gegrillt, auf der Grillplatte serviert.</p><div class="menu-var"><span><strong>Gemuese</strong><em>17,90&euro;</em></span><span><strong>Chicken</strong><em>19,90&euro;</em></span><span><strong>Lamm</strong><em>20,90&euro;</em></span><span><strong>Garnelen</strong><em>21,90&euro;</em></span></div><h3 style="font-family:Playfair Display,serif;font-size:20px;color:#A0522D;margin:20px 0 6px">Karahi</h3><p style="font-size:13px;color:#8B7D6B;margin-bottom:14px">In der Gusseisenpfanne mit Tomaten und Ingwer.</p><div class="menu-var"><span><strong>Gemuese</strong><em>14,90&euro;</em></span><span><strong>Chicken</strong><em>20,90&euro;</em></span><span><strong>Lamm</strong><em>17,90&euro;</em></span></div>'},
{t:"Biryani & Bestseller",html:'<h3 style="font-family:Playfair Display,serif;font-size:20px;color:#A0522D;margin:0 0 14px">Biryani</h3><div class="menu-item"><div><div class="name">Gemuese Biryani</div></div><div class="price">12,50 &euro;</div></div><div class="menu-item"><div><div class="name">Haehnchen Biryani</div></div><div class="price">13,50 &euro;</div></div><div class="menu-item"><div><div class="name">Lamm Biryani</div></div><div class="price">18,90 &euro;</div></div><div class="menu-item"><div><div class="name">Mix Masala Biryani</div></div><div class="price">20,90 &euro;</div></div><h3 style="font-family:Playfair Display,serif;font-size:18px;color:#D4940E;margin:20px 0 10px">&#9733; Bestseller</h3><div class="menu-item"><div><div class="name">Tandoori Mix Platte</div></div><div class="price">24,90 &euro;</div></div><div class="menu-item"><div><div class="name">Chicken Kohlapuri</div></div><div class="price">18,90 &euro;</div></div><div class="menu-item"><div><div class="name">Malai Kofta</div></div><div class="price">19,90 &euro;</div></div>'},
{t:"Desserts",html:'<h3 style="font-family:Playfair Display,serif;font-size:20px;color:#A0522D;margin:0 0 14px">Desserts</h3><div class="menu-item"><div><div class="name">Firni (Milchreispudding)</div></div><div class="price">3,90 &euro;</div></div><div class="menu-item"><div><div class="name">Gulab Jamun</div></div><div class="price">3,90 &euro;</div></div><div class="menu-item"><div><div class="name">Kulfi (Indisches Eis)</div></div><div class="price">5,90 &euro;</div></div><div class="menu-item"><div><div class="name">Mango Safran Halwa (Vegan)</div></div><div class="price">5,90 &euro;</div></div>'},
{t:"Menues",html:'<h3 style="font-family:Playfair Display,serif;font-size:20px;color:#A0522D;margin:0 0 14px">Menues fuer 2 Personen</h3><div style="background:#F5F3EF;border-radius:10px;padding:16px;margin-bottom:14px"><h4 style="color:#D4940E;margin:0 0 8px">Tandoori-Mix &ndash; 71,90 &euro;</h4><p style="font-size:13px;color:#58585A;line-height:1.7;margin:0">Suppe, Pakoras, Salat, Naan, Tandoori Mix-Platte, Biryani, Dessert</p></div><div style="background:#F5F3EF;border-radius:10px;padding:16px;margin-bottom:14px"><h4 style="color:#D4940E;margin:0 0 8px">Golden Masala &ndash; 66,90 &euro;</h4><p style="font-size:13px;color:#58585A;line-height:1.7;margin:0">Suppe, Mix Pakoras, Salat, Naan, Makhni Masala, Biryani, Dessert</p></div><div style="background:#F5F3EF;border-radius:10px;padding:16px"><h4 style="color:#D4940E;margin:0 0 8px">Vegan &ndash; 69,90 &euro;</h4><p style="font-size:13px;color:#58585A;line-height:1.7;margin:0">Suppe, Tofu Pakoras, Salat, Naan, Mango Kokos Curry, Biryani, Halwa</p></div>'}
];
var menuPage=0;
function openMenu(){document.getElementById('menuOverlay').classList.add('active');renderMenu()}
function closeMenu(){document.getElementById('menuOverlay').classList.remove('active')}
function renderMenu(){
  document.getElementById('menuContent').innerHTML='<div style="text-align:center;margin-bottom:12px"><div style="font-size:11px;text-transform:uppercase;letter-spacing:2px;color:#D4940E;font-weight:600">Golden Masala</div></div>'+MP[menuPage].html;
  document.getElementById('menuPageNum').textContent=(menuPage+1)+' / '+MP.length;
  document.getElementById('menuPrev').style.opacity=menuPage<=0?'0.3':'1';
  document.getElementById('menuNext').style.opacity=menuPage>=MP.length-1?'0.3':'1';
  document.getElementById('menuContent').scrollTop=0;
}
function menuGo(d){var n=menuPage+d;if(n<0||n>=MP.length)return;menuPage=n;renderMenu()}
document.addEventListener('keydown',function(e){if(!document.getElementById('menuOverlay').classList.contains('active'))return;if(e.key==='ArrowRight')menuGo(1);if(e.key==='ArrowLeft')menuGo(-1);if(e.key==='Escape')closeMenu()});
document.getElementById('menuOverlay').addEventListener('click',function(e){if(e.target===this)closeMenu()});
</script>
</body></html>`;
}
