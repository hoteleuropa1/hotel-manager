// api/guest-info.js
export default async function handler(req, res) {
  const SB_URL = process.env.SUPABASE_URL || "https://ztdtkncoyrkvdpytwuhy.supabase.co";
  const SB_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
  const { token } = req.query;
  const headers = { "Content-Type": "application/json", apikey: SB_KEY, Authorization: "Bearer " + SB_KEY };
  var gn = "", ci = "", co = "", rt = "";
  if (token) { try { const rr = await fetch(SB_URL + "/rest/v1/reservations?offer_token=eq." + token + "&select=*,guests(*),rooms(*,unit_types(*))", { headers }); const rv = (await rr.json())[0]; if (rv) { const g = rv.guests; rt = rv.rooms?.unit_types?.name || ""; gn = (g?.salutation ? g.salutation + " " : "") + (g?.last_name || "Gast"); ci = fd(rv.check_in); co = fd(rv.check_out); } } catch (e) {} }
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  return res.status(200).send(buildPage(gn, ci, co, rt));
}
function fd(d) { var t = new Date(d); return t.getDate().toString().padStart(2, "0") + "." + (t.getMonth() + 1).toString().padStart(2, "0") + "." + t.getFullYear(); }

function buildPage(gn, ci, co, rt) {
return `<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Ihr Aufenthalt - Hotel Europa</title>
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
.info-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin:20px 0}
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
.footer{background:#58585A;padding:30px 20px;text-align:center;color:#ABA596;font-size:13px;line-height:1.8;margin-top:40px;border-top:3px solid #D4940E}
.footer a{color:#fff;text-decoration:none}
.footer strong{color:#fff}
.map-img{width:100%;border-radius:12px;border:1px solid #DDD9D2;margin:16px 0;display:block}
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
.menu-cat .cat-desc{font-size:12px;color:#8B7D6B;margin-bottom:12px;font-style:italic}
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
<h1>Willkommen${gn ? ", " + gn : ""}</h1>
<div class="stars">&starf; &starf; &starf;</div>
<p>Alle Informationen fuer Ihren Aufenthalt${ci ? " vom " + ci + " bis " + co : ""}</p>
</div>
</div>

<div class="wrap">

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
<script>
function togglePin(n){
  for(var i=1;i<=3;i++){var el=document.getElementById('pin'+i);if(el)el.style.display=i===n&&el.style.display==='none'?'block':'none'}
}
</script>

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
<p>Unser Restaurant verwohnt Sie mit authentischer indischer Kueche &ndash; von aromatischen Currys ueber frisch gebackenes Naan bis zu wuerzigen Tandoori-Spezialitaeten. Als Hotelgast geniessen Sie Ihr Essen ohne Reservierung direkt im Haus.</p>
<p style="font-size:13px;color:#8B7D6B"><em>7 spezielle indische Kocharten &ndash; alle auch vegetarisch und vegan. Waehlen Sie zwischen mild, mittelscharf oder scharf.</em></p>
<dl class="restaurant-hours">
<dt>Montag &ndash; Sonntag</dt><dd>11:00 &ndash; 14:00 &amp; 17:00 &ndash; 22:00 Uhr</dd>
<dt>Terrasse</dt><dd>Saisonal auf dem Marktplatz</dd>
<dt>Zum Mitnehmen</dt><dd>Alle Gerichte!</dd>
</dl>
<div style="margin-top:20px;display:flex;gap:12px;flex-wrap:wrap">
<button class="btn" onclick="openMenu()">Speisekarte ansehen</button>
<a href="https://pms.hotel-europa-ruesselsheim.de/speisekarte.pdf" download class="btn btn-outline">&#8681; Speisekarte als PDF</a>
<a href="tel:+4915903081422" class="btn btn-outline">Tisch reservieren</a>
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
<div class="tip">Fruehstueck nicht gebucht? Sprechen Sie uns einfach am Vortag oder beim Check-in an.</div>
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
<a href="https://pms.hotel-europa-ruesselsheim.de/speisekarte.pdf" download class="menu-dl">&#8681; PDF</a>
</div>
</div>

<div class="footer">
<strong>Hotel Europa</strong><br>
Marktplatz 1 &middot; 65428 Ruesselsheim<br>
Tel.: <a href="tel:+4915903081422">015903081422</a> &middot; <a href="mailto:info@hotel-europa-ruesselsheim.de">info@hotel-europa-ruesselsheim.de</a><br>
<a href="http://www.hotel-europa-ruesselsheim.de">www.hotel-europa-ruesselsheim.de</a>
</div>

<script>
var MP=[
{t:"Willkommen",html:'<div style="text-align:center;padding:10px 0"><img src="https://pms.hotel-europa-ruesselsheim.de/golden-masala-logo.png" style="height:80px;margin-bottom:12px" onerror="this.style.display=\\'none\\'"/><h2 style="font-family:Playfair Display,serif;font-size:22px;color:#58585A;margin:0 0 16px">Golden Masala</h2></div><p style="font-size:14px;color:#58585A;line-height:1.8">Sehr verehrter Gast,<br><br>wir heissen Sie herzlich willkommen in unserem Indischen Spezialitaeten Restaurant!<br><br>Wir bieten fuer Sie <strong>7 spezielle indische Kocharten</strong> zur Auswahl. Alle Varianten koennen mit Gemuese, Fleisch, Fisch oder hausgemachtem Kaese zubereitet werden. Natuerlich auch als Vegan.<br><br>Bitte geben Sie bei Ihrer Bestellung an, ob Sie Ihr Gericht <strong>scharf, mittelscharf oder mild</strong> zubereitet haben moechten.<br><br>Alle unsere Speisen werden ohne Natrium-Glutamat zubereitet.<br><br><strong>Alle Gerichte auch zum Mitnehmen!</strong><br><br>Ihr Golden Masala Team</p>'},
{t:"Alkoholfreie Getraenke",html:'<h3 style="font-family:Playfair Display,serif;font-size:20px;color:#A0522D;margin:0 0 14px">Alkoholfreie Getraenke</h3><div class="menu-item"><div><div class="name">Coca-Cola, Zero, Fanta, Mezzo Mix, Sprite</div><div class="desc">0,33l</div></div><div class="price">3,20 &euro;</div></div><div class="menu-item"><div><div class="name">Bitter Lemon / Tonic Water / Ginger Ale</div><div class="desc">0,2l</div></div><div class="price">2,20 &euro;</div></div><div class="menu-item"><div><div class="name">Apfelsaft oder Orangensaft</div><div class="desc">0,2l / 0,4l</div></div><div class="price">2,20 / 3,50 &euro;</div></div><div class="menu-item"><div><div class="name">Apfelschorle / Orangensaftschorle</div><div class="desc">0,2l / 0,4l</div></div><div class="price">2,20 / 3,50 &euro;</div></div><div class="menu-item"><div><div class="name">Trauben-, Mango-, Guava- oder Litschi Saft</div><div class="desc">0,2l / 0,4l</div></div><div class="price">2,20 / 4,90 &euro;</div></div><div class="menu-item"><div><div class="name">Fachingen Edelwasser Medium / Naturell</div><div class="desc">0,25l / 0,75l</div></div><div class="price">2,50 / 5,90 &euro;</div></div><h3 style="font-family:Playfair Display,serif;font-size:18px;color:#A0522D;margin:20px 0 10px">Indische Getraenke (Hausgemacht)</h3><div class="menu-item"><div><div class="name">Lassi suess oder sauer</div><div class="desc">0,1l / 0,3l</div></div><div class="price">1,30 / 3,30 &euro;</div></div><div class="menu-item"><div><div class="name">Lassi Mango, Banane oder Kokos</div><div class="desc">0,1l / 0,3l</div></div><div class="price">1,60 / 4,80 &euro;</div></div><div class="menu-item"><div><div class="name">Mango-, Kokos- oder Bananen-Milch</div><div class="desc">0,1l / 0,3l</div></div><div class="price">1,90 / 5,20 &euro;</div></div><div class="menu-item"><div><div class="name">Indischer Eistee</div><div class="desc">0,5l &ndash; Zitrone, Mango, Guava, Granatapfel oder Litschi</div></div><div class="price">5,90 &euro;</div></div><div class="menu-item"><div><div class="name">Limonade suess oder salzig, mit Minze</div></div><div class="price">5,70 &euro;</div></div>'},
{t:"Warme Getraenke",html:'<h3 style="font-family:Playfair Display,serif;font-size:20px;color:#A0522D;margin:0 0 14px">Warme Getraenke</h3><div class="menu-item"><div><div class="name">Indischer Volkstee &bdquo;Chai&ldquo;</div><div class="desc">Gekocht mit Milch, Kardamom, Zimt und Nelken</div></div><div class="price">4,90 &euro;</div></div><div class="menu-item"><div><div class="name">Kashmiri Tee</div><div class="desc">Schwarzer Tee, Zimt, Kardamom und Nelken</div></div><div class="price">4,20 &euro;</div></div><div class="menu-item"><div><div class="name">Kahwa</div><div class="desc">Gruener Tee, Zimt, Kardamom, Nelken</div></div><div class="price">4,20 &euro;</div></div><div class="menu-item"><div><div class="name">Safran Tee</div><div class="desc">Schwarze Tee mit Safran und Kardamom</div></div><div class="price">4,90 &euro;</div></div><div class="menu-item"><div><div class="name">Kaffee / Espresso</div></div><div class="price">2,90 &euro;</div></div><div class="menu-item"><div><div class="name">Cappuccino</div></div><div class="price">3,10 &euro;</div></div><div class="menu-item"><div><div class="name">Tasse Tee / Chai</div></div><div class="price">2,90 &euro;</div></div>'},
{t:"Weine",html:'<h3 style="font-family:Playfair Display,serif;font-size:20px;color:#A0522D;margin:0 0 14px">Offene Weissweine</h3><div class="menu-item"><div><div class="name">W10 Riesling halbtrocken</div></div><div class="price">4,70 &euro;</div></div><div class="menu-item"><div><div class="name">W11 Chardonnay trocken</div></div><div class="price">4,80 &euro;</div></div><div class="menu-item"><div><div class="name">W13 Riesling trocken</div></div><div class="price">4,90 &euro;</div></div><div class="menu-item"><div><div class="name">W14 Sauvignon blanc trocken</div></div><div class="price">4,90 &euro;</div></div><div class="menu-item"><div><div class="name">W16 Indischer Weisswein (Angoori) trocken</div></div><div class="price">5,70 &euro;</div></div><h3 style="font-family:Playfair Display,serif;font-size:18px;color:#A0522D;margin:18px 0 10px">Offene Rotweine</h3><div class="menu-item"><div><div class="name">W21 Dornfelder trocken</div></div><div class="price">4,90 &euro;</div></div><div class="menu-item"><div><div class="name">W22 Portugieser lieblich</div></div><div class="price">4,90 &euro;</div></div><div class="menu-item"><div><div class="name">W23 Spaetburgunder trocken</div></div><div class="price">4,40 &euro;</div></div><div class="menu-item"><div><div class="name">W25 Cabernet Sauvignon</div></div><div class="price">5,40 &euro;</div></div><div class="menu-item"><div><div class="name">W27 Indischer Rotwein (Angoori) trocken</div></div><div class="price">5,70 &euro;</div></div><h3 style="font-family:Playfair Display,serif;font-size:18px;color:#A0522D;margin:18px 0 10px">Roseweine</h3><div class="menu-item"><div><div class="name">W31 Domfelder Rose trocken</div></div><div class="price">4,90 &euro;</div></div><div class="menu-item"><div><div class="name">W33 Spaetburgunder Rose trocken</div></div><div class="price">5,40 &euro;</div></div><div class="menu-item"><div><div class="name">W34 Weinschorle weiss, rot oder Rose</div><div class="desc">0,25l / 0,5l</div></div><div class="price">3,90 / 5,90 &euro;</div></div>'},
{t:"Biere & Cocktails",html:'<h3 style="font-family:Playfair Display,serif;font-size:20px;color:#A0522D;margin:0 0 14px">Flaschenbiere</h3><div class="menu-item"><div><div class="name">Kingfisher Premium indisches Lagerbier</div><div class="desc">0,33l</div></div><div class="price">3,90 &euro;</div></div><div class="menu-item"><div><div class="name">Krombacher Pils alkoholfrei</div></div><div class="price">3,90 &euro;</div></div><div class="menu-item"><div><div class="name">Erdinger Hefeweizen, alkoholfrei</div></div><div class="price">4,90 &euro;</div></div><h3 style="font-family:Playfair Display,serif;font-size:18px;color:#A0522D;margin:18px 0 10px">Bier vom Fass</h3><div class="menu-item"><div><div class="name">Krombacher Pils</div><div class="desc">0,3l / 0,5l</div></div><div class="price">3,50 / 4,90 &euro;</div></div><div class="menu-item"><div><div class="name">Krombacher Weizen</div><div class="desc">0,3l / 0,5l</div></div><div class="price">3,50 / 4,90 &euro;</div></div><div class="menu-item"><div><div class="name">Krombacher Radler</div><div class="desc">0,3l / 0,5l</div></div><div class="price">3,50 / 4,90 &euro;</div></div><h3 style="font-family:Playfair Display,serif;font-size:18px;color:#A0522D;margin:18px 0 10px">Aperitifs &amp; Cocktails</h3><div class="menu-item"><div><div class="name">Blue Angel / Kir Royal</div></div><div class="price">5,10 &euro;</div></div><div class="menu-item"><div><div class="name">Anarkali</div><div class="desc">Kokosmilch, Ananassaft und Campari</div></div><div class="price">8,90 &euro;</div></div><div class="menu-item"><div><div class="name">Fontana</div><div class="desc">Campari, Grand Marnier, Cointreau, Orangensaft, Sekt</div></div><div class="price">8,90 &euro;</div></div><div class="menu-item"><div><div class="name">Mango-Cocktail</div><div class="desc">Mangosaft, Grandmarnier, Cointreau und Kokosmilch</div></div><div class="price">8,90 &euro;</div></div>'},
{t:"Suppen & Vorspeisen",html:'<h3 style="font-family:Playfair Display,serif;font-size:20px;color:#A0522D;margin:0 0 14px">Suppen</h3><div class="menu-item"><div><div class="name">20 Shorba Atlas (Linsensuppe)</div><div class="desc">Delikate Linsensuppe nach suedindischer Art mit roten Linsen und milden Gewuerzen</div></div><div class="price">4,50 &euro;</div></div><div class="menu-item"><div><div class="name">21 Coconut Murgh Shorba (Huehnersuppe)</div><div class="desc">Nordindische Art mit Knoblauch, Ingwer, Zimt, Kokos und Kardamom</div></div><div class="price">4,90 &euro;</div></div><div class="menu-item"><div><div class="name">22 Tamatar Adrak Shorba (Tomatensuppe)</div><div class="desc">Nach speziellem Rezept, aus feinsten Kraeutern, Ingwer und Gewuerzen</div></div><div class="price">4,50 &euro;</div></div><h3 style="font-family:Playfair Display,serif;font-size:18px;color:#A0522D;margin:18px 0 10px">Indische Vorspeisen</h3><div class="menu-item"><div><div class="name">25 Samosa (Gemuese)</div><div class="desc">Teigtaschen mit Gemuese, Kartoffeln und Gewuerzen</div></div><div class="price">3,90 &euro;</div></div><div class="menu-item"><div><div class="name">26 Samosa mit Hackfleisch und Zwiebeln</div></div><div class="price">5,50 &euro;</div></div><div class="menu-item"><div><div class="name">27 Samosa Teller (2 Stk.) mit Salat</div></div><div class="price">9,90 &euro;</div></div><div class="menu-item"><div><div class="name">28a Pakorasa Vegetarische Mix</div></div><div class="price">7,90 &euro;</div></div><div class="menu-item"><div><div class="name">28b Pakorasa Paneer</div></div><div class="price">6,50 &euro;</div></div><div class="menu-item"><div><div class="name">28c Pakorasa Haehnchen</div></div><div class="price">5,50 &euro;</div></div><div class="menu-item"><div><div class="name">28d Onion Bhaji (Zwiebelringe)</div></div><div class="price">4,20 &euro;</div></div><div class="menu-item"><div><div class="name">28e Pakorasa Fleisch Mix</div></div><div class="price">11,50 &euro;</div></div><div class="menu-item"><div><div class="name">29 Masala Pappadams</div><div class="desc">Knusprige Linsenwaffeln mit Gurken, Tomaten und Kraeutern</div></div><div class="price">4,50 &euro;</div></div><h3 style="font-family:Playfair Display,serif;font-size:18px;color:#A0522D;margin:18px 0 10px">Raita</h3><div class="menu-item"><div><div class="name">31 Raitaf</div></div><div class="price">2,70 &euro;</div></div><div class="menu-item"><div><div class="name">32 Pfefferminz Raitaf</div></div><div class="price">2,90 &euro;</div></div><div class="menu-item"><div><div class="name">33 Gemuese Raitaf</div><div class="desc">mit Gurken und Tomatenstueckchen</div></div><div class="price">3,50 &euro;</div></div><div class="menu-item"><div><div class="name">35 Mango Raitaf</div></div><div class="price">3,90 &euro;</div></div>'},
{t:"Currys",html:'<h3 style="font-family:Playfair Display,serif;font-size:20px;color:#A0522D;margin:0 0 6px">Currys</h3><p style="font-size:13px;color:#8B7D6B;line-height:1.6;margin-bottom:14px">Zubereitet mit frischen Tomaten, Knoblauch, Zwiebeln, Ingwer, Joghurt und indischen Gewuerzen. Alle Gerichte mit Basmati-Reis.<br><em>Spezial mit Mango, Spinat oder Kichererbsen +2,90 &euro;</em></p><div class="menu-var"><span><strong>Gemuese</strong><em>12,90&euro;</em></span><span><strong>Paneer</strong><em>13,90&euro;</em></span><span><strong>Vegan</strong><em>13,90&euro;</em></span><span><strong>Chicken</strong><em>14,90&euro;</em></span><span><strong>Lamm</strong><em>17,90&euro;</em></span><span><strong>Jhinga</strong><em>18,90&euro;</em></span><span><strong>Fisch</strong><em>14,90&euro;</em></span></div>'},
{t:"Karahi & Tandoori",html:'<h3 style="font-family:Playfair Display,serif;font-size:20px;color:#A0522D;margin:0 0 6px">Karahi</h3><p style="font-size:13px;color:#8B7D6B;line-height:1.6;margin-bottom:14px">Gusseiserne tiefe Pfanne. Zubereitet mit frischen Tomatenstueckchen, Knoblauch, Zwiebel und Ingwer in einer dicken Sosse.</p><div class="menu-var"><span><strong>Gemuese</strong><em>14,90&euro;</em></span><span><strong>Paneer</strong><em>15,90&euro;</em></span><span><strong>Vegan</strong><em>16,90&euro;</em></span><span><strong>Chicken</strong><em>20,90&euro;</em></span><span><strong>Lamm</strong><em>17,90&euro;</em></span><span><strong>Jhinga</strong><em>19,90&euro;</em></span><span><strong>Fisch</strong><em>16,90&euro;</em></span></div><h3 style="font-family:Playfair Display,serif;font-size:20px;color:#A0522D;margin:20px 0 6px">Tandoori</h3><p style="font-size:13px;color:#8B7D6B;line-height:1.6;margin-bottom:14px">Mariniert in Knoblauch-Joghurt-Sauce und im Tandoor gegrillt. Wird auf der Grillplatte serviert.</p><div class="menu-var"><span><strong>Gemuese</strong><em>17,90&euro;</em></span><span><strong>Paneer</strong><em>18,90&euro;</em></span><span><strong>Vegan</strong><em>18,90&euro;</em></span><span><strong>Chicken</strong><em>19,90&euro;</em></span><span><strong>Lamm</strong><em>20,90&euro;</em></span><span><strong>Jhinga</strong><em>21,90&euro;</em></span><span><strong>Fisch</strong><em>18,90&euro;</em></span></div><div class="menu-item" style="margin-top:12px"><div><div class="name">130 Garlic Mixed Tandoori Platte</div><div class="desc">Haehnchen, Lamm und Fisch, 24h mariniert, im Tandoor gegrillt. Mit Reis und Salat.</div></div><div class="price">24,90 / 49,90 &euro;</div></div>'},
{t:"Korma & Bhuna & Vindaloo",html:'<h3 style="font-family:Playfair Display,serif;font-size:20px;color:#A0522D;margin:0 0 6px">Korma</h3><p style="font-size:13px;color:#8B7D6B;line-height:1.6;margin-bottom:14px">Delikate Mischung aus Tomatenmark, Cashewnuessen, Sahne und Gewuerzen. Zart und leicht suess.</p><div class="menu-var"><span><strong>Gemuese</strong><em>14,90&euro;</em></span><span><strong>Paneer</strong><em>15,90&euro;</em></span><span><strong>Vegan</strong><em>15,90&euro;</em></span><span><strong>Chicken</strong><em>16,90&euro;</em></span><span><strong>Lamm</strong><em>18,90&euro;</em></span><span><strong>Jhinga</strong><em>21,90&euro;</em></span><span><strong>Fisch</strong><em>16,90&euro;</em></span></div><h3 style="font-family:Playfair Display,serif;font-size:20px;color:#A0522D;margin:20px 0 6px">Bhuna</h3><p style="font-size:13px;color:#8B7D6B;margin-bottom:14px">Reduzierte Basis aus Tomaten, Zwiebeln und Chili mit Paprika, Ingwer.</p><div class="menu-var"><span><strong>Gemuese</strong><em>14,90&euro;</em></span><span><strong>Paneer</strong><em>15,90&euro;</em></span><span><strong>Vegan</strong><em>15,90&euro;</em></span><span><strong>Chicken</strong><em>16,90&euro;</em></span><span><strong>Lamm</strong><em>18,90&euro;</em></span><span><strong>Jhinga</strong><em>21,90&euro;</em></span><span><strong>Fisch</strong><em>16,90&euro;</em></span></div><h3 style="font-family:Playfair Display,serif;font-size:20px;color:#A0522D;margin:20px 0 6px">Vindaloo</h3><p style="font-size:13px;color:#8B7D6B;margin-bottom:14px">Scharf! Kartoffel, Ingwer und Chili. Goanische Kueche.</p><div class="menu-var"><span><strong>Gemuese</strong><em>13,90&euro;</em></span><span><strong>Paneer</strong><em>14,90&euro;</em></span><span><strong>Vegan</strong><em>14,90&euro;</em></span><span><strong>Chicken</strong><em>15,90&euro;</em></span><span><strong>Lamm</strong><em>19,90&euro;</em></span><span><strong>Jhinga</strong><em>20,90&euro;</em></span><span><strong>Fisch</strong><em>15,90&euro;</em></span></div>'},
{t:"Dhansak & Tikka Masala",html:'<h3 style="font-family:Playfair Display,serif;font-size:20px;color:#A0522D;margin:0 0 6px">Dhansak</h3><p style="font-size:13px;color:#8B7D6B;margin-bottom:14px">Parsi-Kueche. Linsen und Gemuese mit Ananas &ndash; suess-saurer Geschmack. In Buttersosse.</p><div class="menu-var"><span><strong>Gemuese</strong><em>14,90&euro;</em></span><span><strong>Paneer</strong><em>15,90&euro;</em></span><span><strong>Vegan</strong><em>15,90&euro;</em></span><span><strong>Chicken</strong><em>16,90&euro;</em></span><span><strong>Lamm</strong><em>20,90&euro;</em></span><span><strong>Jhinga</strong><em>20,90&euro;</em></span><span><strong>Fisch</strong><em>16,90&euro;</em></span></div><h3 style="font-family:Playfair Display,serif;font-size:20px;color:#A0522D;margin:20px 0 6px">Tikka Masala</h3><p style="font-size:13px;color:#8B7D6B;margin-bottom:14px">Eines der beliebtesten Gerichte! Zart marinierte Stuecke in exotischer Gewuerzmischung, mit puerierten Tomaten, Kokosmilch und frischem Koriander.</p><div class="menu-var"><span><strong>Gemuese</strong><em>14,90&euro;</em></span><span><strong>Paneer</strong><em>15,90&euro;</em></span><span><strong>Vegan</strong><em>15,90&euro;</em></span><span><strong>Chicken</strong><em>16,90&euro;</em></span><span><strong>Lamm</strong><em>20,90&euro;</em></span><span><strong>Jhinga</strong><em>20,90&euro;</em></span><span><strong>Fisch</strong><em>16,90&euro;</em></span></div>'},
{t:"Biryani & Bestseller",html:'<h3 style="font-family:Playfair Display,serif;font-size:20px;color:#A0522D;margin:0 0 6px">Kulinarische Reis-Spezialitaeten</h3><p style="font-size:13px;color:#8B7D6B;margin-bottom:14px">Basmati-Pullao-Reis mit Mandeln, Rosinen, Cashew-Nuessen und gruenen Erbsen. Serviert mit Gemuese Raita.</p><div class="menu-item"><div><div class="name">61 Gemuese Biryani</div></div><div class="price">12,50 &euro;</div></div><div class="menu-item"><div><div class="name">62 Vegan Biryani</div><div class="desc">mit Soja oder Tofu</div></div><div class="price">12,50 &euro;</div></div><div class="menu-item"><div><div class="name">63 Haehnchen Biryani</div></div><div class="price">13,50 &euro;</div></div><div class="menu-item"><div><div class="name">64 Lammfleisch Biryani</div></div><div class="price">18,90 &euro;</div></div><div class="menu-item"><div><div class="name">65 Prawn (Garnelen) Biryani</div></div><div class="price">20,90 &euro;</div></div><div class="menu-item"><div><div class="name">66 Fisch Biryani</div></div><div class="price">15,90 &euro;</div></div><div class="menu-item"><div><div class="name">67 Mix Masala Biryani</div><div class="desc">Lammfleisch, Haehnchen und Hummerkrabben</div></div><div class="price">20,90 &euro;</div></div><h3 style="font-family:Playfair Display,serif;font-size:18px;color:#D4940E;margin:20px 0 10px">&#9733; Unsere Bestseller</h3><div class="menu-item"><div><div class="name">Fisch Tikka</div><div class="desc">Im Tandoorofen mit Kokos-Currysosse</div></div><div class="price">24,90 &euro;</div></div><div class="menu-item"><div><div class="name">Jhinga Banglori</div><div class="desc">Garnelen in Kokosmilch-Currysosse, scharf</div></div><div class="price">22,90 &euro;</div></div><div class="menu-item"><div><div class="name">Adraki Chicken Tikka</div><div class="desc">Haehnchen am Spiess mit Curry-Kokosmilchsosse</div></div><div class="price">21,90 &euro;</div></div><div class="menu-item"><div><div class="name">Mutton Tikka</div><div class="desc">Lammfleisch im Tandoor gegrillt</div></div><div class="price">24,90 &euro;</div></div><div class="menu-item"><div><div class="name">Chicken Kohlapuri</div><div class="desc">In wuerziger Tomaten-Currysosse mit Chillischoten</div></div><div class="price">18,90 &euro;</div></div><div class="menu-item"><div><div class="name">Malai Kofta</div><div class="desc">Frischkaese-Baellchen in suesser Kokos-Currysosse</div></div><div class="price">19,90 &euro;</div></div>'},
{t:"Desserts",html:'<h3 style="font-family:Playfair Display,serif;font-size:20px;color:#A0522D;margin:0 0 14px">Desserts / Nachspeisen</h3><div class="menu-item"><div><div class="name">91 Firni</div><div class="desc">Milchreispudding mit Rosenwasser, Mandeln, Pistazien und Rosinen</div></div><div class="price">3,90 &euro;</div></div><div class="menu-item"><div><div class="name">92 Gajarela</div><div class="desc">Suesser Karotten-Milch-Pudding mit Kardamom und Mandeln</div></div><div class="price">3,90 &euro;</div></div><div class="menu-item"><div><div class="name">93 Gulab Jamun</div><div class="desc">Hausgemachte Frischkaesebaellchen in Zuckersirup mit Rosenwasser</div></div><div class="price">3,90 &euro;</div></div><div class="menu-item"><div><div class="name">94 Gemischter Eisbecher</div></div><div class="price">4,90 &euro;</div></div><div class="menu-item"><div><div class="name">95 Eis &amp; Heiss mit Himbeeren</div></div><div class="price">5,90 &euro;</div></div><div class="menu-item"><div><div class="name">96 Indien Eis &ndash; Kulfi</div></div><div class="price">5,90 &euro;</div></div><div class="menu-item"><div><div class="name">97 Mango-Eisbecher</div></div><div class="price">5,90 &euro;</div></div><div class="menu-item"><div><div class="name">99 Rasmalai (2 Stk.)</div></div><div class="price">4,90 &euro;</div></div><div class="menu-item"><div><div class="name">100 Indisches Mango Safran Halwa (Vegan)</div><div class="desc">Kichererbsenmehl, Cashewkernen, Mango, Safran, Kokos, Kardamom</div></div><div class="price">5,90 &euro;</div></div>'},
{t:"Menues fuer 2 Personen",html:'<h3 style="font-family:Playfair Display,serif;font-size:20px;color:#A0522D;margin:0 0 14px">Menues fuer zwei Personen</h3><div style="background:#F5F3EF;border-radius:10px;padding:16px;margin-bottom:14px"><h4 style="color:#D4940E;margin:0 0 8px;font-size:15px">Tandoori-Mix-Platte &ndash; Menue 1 &ndash; 71,90 &euro;</h4><p style="font-size:13px;color:#58585A;line-height:1.7;margin:0">Coconut Murgh Shorba &bull; Murgh Pakoras &bull; Gemischter indischer Salat &bull; Naan nach Wahl &bull; Tandoori Mix-Platte (Haehnchen, Lamm, Garnelen) &bull; Biryani-Reis &bull; Nachtisch nach Wahl</p></div><div style="background:#F5F3EF;border-radius:10px;padding:16px;margin-bottom:14px"><h4 style="color:#D4940E;margin:0 0 8px;font-size:15px">Golden Masala-Platte &ndash; Menue 2 &ndash; 66,90 &euro;</h4><p style="font-size:13px;color:#58585A;line-height:1.7;margin:0">Suppe nach Wahl &bull; Mix Pakoras &bull; Gemischter Salat &bull; Naan nach Wahl &bull; Tandoori Mix Makhni Masala &bull; Biryani-Reis &bull; Nachtisch nach Wahl</p></div><div style="background:#F5F3EF;border-radius:10px;padding:16px;margin-bottom:14px"><h4 style="color:#D4940E;margin:0 0 8px;font-size:15px">Vegetarische Platte &ndash; Menue 3 &ndash; 65,90 &euro;</h4><p style="font-size:13px;color:#58585A;line-height:1.7;margin:0">Atlas Shorba &bull; Pakoras &bull; Naan nach Wahl &bull; Maharani Dal und Vegetarisches Karma &bull; Reis &bull; Nachtisch nach Wahl</p></div><div style="background:#F5F3EF;border-radius:10px;padding:16px"><h4 style="color:#D4940E;margin:0 0 8px;font-size:15px">Vegan Platte &ndash; Menue 4 &ndash; 69,90 &euro;</h4><p style="font-size:13px;color:#58585A;line-height:1.7;margin:0">Suppe nach Wahl &bull; Tofu &amp; Gemuese Pakoras &bull; Veganer Salat &bull; Naan nach Wahl &bull; Vegan Mango Kokosnuss Curry &bull; Biryani-Reis &bull; Mango Safran Halwa</p></div>'}
];
var menuPage=0;
function openMenu(){document.getElementById('menuOverlay').classList.add('active');renderMenu()}
function closeMenu(){document.getElementById('menuOverlay').classList.remove('active')}
function renderMenu(){
  document.getElementById('menuContent').innerHTML='<div style="text-align:center;margin-bottom:12px"><div style="font-size:11px;text-transform:uppercase;letter-spacing:2px;color:#D4940E;font-weight:600">Golden Masala &ndash; Speisekarte</div></div>'+MP[menuPage].html;
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
