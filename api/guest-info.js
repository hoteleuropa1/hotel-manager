// api/guest-info.js
export default async function handler(req, res) {
  const SB_URL = process.env.SUPABASE_URL || "https://ztdtkncoyrkvdpytwuhy.supabase.co";
  const SB_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;
  const { token } = req.query;
  const headers = { "Content-Type": "application/json", apikey: SB_KEY, Authorization: "Bearer " + SB_KEY };
  var gn = "", ci = "", co = "", rt = "";
  if (token) { try { const rr = await fetch(SB_URL + "/rest/v1/reservations?offer_token=eq." + token + "&select=*,guests(*),rooms(*,unit_types(*))", { headers }); const rv = (await rr.json())[0]; if (rv) { const g = rv.guests; rt = rv.rooms?.unit_types?.name || ""; gn = (g?.salutation || "") + " " + (g?.last_name || "Gast"); ci = fd(rv.check_in); co = fd(rv.check_out); } } catch (e) {} }
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
<img src="https://pms.hotel-europa-ruesselsheim.de/logo-header.jpg" alt="Hotel Europa"/>
<h1>Willkommen${gn ? ", " + gn : ""}</h1>
<div class="stars">&starf; &starf; &starf;</div>
<p>Alle Informationen fuer Ihren Aufenthalt${ci ? " vom " + ci + " bis " + co : ""}</p>
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
<p>Rund um das Hotel gibt es mehrere Parkmoeglichkeiten:</p>

<a href="https://www.google.com/maps/place/Hotel+Europa,+Marktplatz+1,+65428+R%C3%BCsselsheim/@49.9917,8.4118,16.5z" target="_blank" rel="noopener">
<img class="map-img" src="https://maps.googleapis.com/maps/api/staticmap?center=49.9917,8.4125&zoom=16&size=700x350&scale=2&maptype=roadmap&markers=color:red%7Clabel:H%7C49.9915,8.4135&markers=color:blue%7Clabel:1%7C49.9912,8.4118&markers=color:blue%7Clabel:2%7C49.9935,8.4105&markers=color:green%7Clabel:3%7C49.9888,8.4128&style=feature:poi%7Cvisibility:off&key=" alt="Karte - Hotel Europa und Parkplaetze (klicken fuer Google Maps)"/>
</a>
<p style="font-size:12px;color:#ABA596;text-align:center;margin-top:-8px">Klicken Sie auf die Karte fuer Google Maps</p>

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
<button class="btn" onclick="document.getElementById('menuOverlay').classList.add('active')">Speisekarte ansehen</button>
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
<button class="menu-close" onclick="document.getElementById('menuOverlay').classList.remove('active')">&times;</button>
<div class="menu-content" id="menuContent"></div>
<div class="menu-nav">
<button onclick="menuGo(-1)">&larr;</button>
<span class="menu-page-num" id="menuPageNum">1 / 10</span>
<button onclick="menuGo(1)">&rarr;</button>
</div>
</div>

<div class="footer">
<strong>Hotel Europa</strong><br>
Marktplatz 1 &middot; 65428 Ruesselsheim<br>
Tel.: <a href="tel:+4915903081422">015903081422</a> &middot; <a href="mailto:info@hotel-europa-ruesselsheim.de">info@hotel-europa-ruesselsheim.de</a><br>
<a href="http://www.hotel-europa-ruesselsheim.de">www.hotel-europa-ruesselsheim.de</a>
</div>

<script>
var menuPages=[
{title:"Willkommen",items:[{t:"",d:"Sehr verehrter Gast, wir heissen Sie herzlich willkommen bei uns im Indischen Spezialitaeten Restaurant Golden Masala!\\n\\nWir bieten fuer Sie 7 spezielle indische Kocharten zur Auswahl. Alle Varianten koennen mit Gemuese, Fleisch, Fisch oder hausgemachtem Kaese zubereitet werden. Natuerlich auch als Vegan.\\n\\nBitte geben Sie bei Ihrer Bestellung an, ob Sie Ihr Gericht scharf, mittelscharf oder mild zubereitet haben moechten.\\n\\nAlle Gerichte auch zum Mitnehmen!\\n\\nIhr Golden Masala Team"}]},
{title:"Alkoholfreie Getraenke",items:[{t:"Coca-Cola, Zero, Fanta, Mezzo Mix, Sprite",p:"3,20 EUR",d:"0,33l"},{t:"Bitter Lemon / Tonic Water / Ginger Ale",p:"2,20 EUR",d:"0,2l"},{t:"Apfelsaft oder Orangensaft",p:"2,20 / 3,50 EUR",d:"0,2l / 0,4l"},{t:"Trauben-, Mango-, Guava- oder Litschi Saft",p:"2,20 / 4,90 EUR"},{t:"Fachingen Edelwasser Medium/Naturell",p:"2,50 / 5,90 EUR",d:"0,25l / 0,75l"}],extra:"Indische Getraenke",items2:[{t:"Lassi suess oder sauer",p:"1,30 / 3,30 EUR"},{t:"Lassi Mango, Banane oder Kokos",p:"1,60 / 4,80 EUR"},{t:"Indischer Eistee",p:"5,90 EUR",d:"Zitrone, Mango, Guava, Granatapfel oder Litschi"},{t:"Indischer Volkstee Chai",p:"4,90 EUR",d:"gekocht mit Milch, Kardamom, Zimt und Nelken"},{t:"Kashmiri Tee",p:"4,20 EUR"},{t:"Kaffee/Espresso",p:"2,90 EUR"},{t:"Cappuccino",p:"3,10 EUR"}]},
{title:"Offene Weine",items:[{t:"W10 Riesling halbtrocken",p:"4,70 EUR"},{t:"W11 Chardonnay trocken",p:"4,80 EUR"},{t:"W13 Riesling trocken",p:"4,90 EUR"},{t:"W14 Sauvignon blanc trocken",p:"4,90 EUR"},{t:"W16 Indischer Weisswein",p:"5,70 EUR"}],extra:"Rotweine",items2:[{t:"W21 Dornfelder trocken",p:"4,90 EUR"},{t:"W22 Portugieser lieblich",p:"4,90 EUR"},{t:"W24 Innamorati Fruchtiger Rotwein",p:"5,40 EUR"},{t:"W25 Cabernet Sauvignon",p:"5,40 EUR"},{t:"W27 Indischer Rotwein",p:"5,70 EUR"}]},
{title:"Biere & Cocktails",items:[{t:"Kingfisher Premium indisches Lagerbier",p:"3,90 EUR",d:"0,33l"},{t:"Krombacher Pils vom Fass",p:"3,50 / 4,90 EUR",d:"0,3l / 0,5l"},{t:"Krombacher Weizen vom Fass",p:"3,50 / 4,90 EUR"}],extra:"Cocktails",items2:[{t:"Blue Angel",p:"5,10 EUR"},{t:"Kir Royal",p:"5,10 EUR"},{t:"Anarkali",p:"8,90 EUR",d:"Kokosmilch, Ananassaft und Campari"},{t:"Fontana",p:"8,90 EUR",d:"Campari, Grand Marnier, Cointreau, Orangensaft, Sekt"},{t:"Mango-Cocktail",p:"8,90 EUR",d:"Mangosaft, Grandmarnier, Cointreau und Kokosmilch"}]},
{title:"Suppen & Vorspeisen",items:[{t:"20 Shorba Atlas (Linsensuppe)",p:"4,50 EUR",d:"Delikate Linsensuppe nach suedindischer Art"},{t:"21 Coconut Murgh Shorba",p:"4,90 EUR",d:"Huehnersuppe nordindischer Art mit Knoblauch, Ingwer, Zimt, Kokos"},{t:"22 Tamatar Adrak Shorba",p:"4,50 EUR",d:"Tomatensuppe mit feinsten Kraeutern und Ingwer"}],extra:"Indische Vorspeisen",items2:[{t:"25 Samosa (Gemuese)",p:"3,90 EUR",d:"Teigtaschen mit Gemuese, Kartoffeln und Gewuerzen"},{t:"26 Samosa (Hackfleisch)",p:"5,50 EUR"},{t:"28a Pakorasa Vegetarische Mix",p:"7,90 EUR"},{t:"28c Pakorasa Haehnchen",p:"5,50 EUR"},{t:"28d Onion Bhaji",p:"4,20 EUR",d:"Zwiebelringe"}]},
{title:"Currys",desc:"7 Kocharten, je mit Gemuese, Paneer, Vegan, Chicken, Lamm, Jhinga oder Fisch",vars:[{n:"Gemuese",p:"12,90"},{n:"Paneer",p:"13,90"},{n:"Vegan",p:"13,90"},{n:"Chicken",p:"14,90"},{n:"Lamm",p:"17,90"},{n:"Jhinga",p:"18,90"},{n:"Fisch",p:"14,90"}],items:[{t:"",d:"Zubereitet mit frischen Tomaten, Knoblauch, Zwiebeln, Ingwer, Joghurt und indischen Gewuerzen. Alle Gerichte mit Basmati-Reis.\\n\\nSpezial auch mit: Mango, Spinat oder Kichererbsen (+2,90 EUR)"}]},
{title:"Karahi",desc:"Gusseiserne Pfanne mit Tomaten, Knoblauch, Zwiebel und Ingwer",vars:[{n:"Gemuese",p:"14,90"},{n:"Paneer",p:"15,90"},{n:"Vegan",p:"16,90"},{n:"Chicken",p:"20,90"},{n:"Lamm",p:"17,90"},{n:"Jhinga",p:"19,90"},{n:"Fisch",p:"16,90"}],items:[]},
{title:"Tandoori",desc:"Mariniert in Knoblauch-Joghurt-Sauce, im Tandoor gegrillt",vars:[{n:"Gemuese",p:"17,90"},{n:"Paneer",p:"18,90"},{n:"Vegan",p:"18,90"},{n:"Chicken",p:"19,90"},{n:"Lamm",p:"20,90"},{n:"Jhinga",p:"21,90"},{n:"Fisch",p:"18,90"}],items:[{t:"130 Garlic Mixed Tandoori Platte",p:"24,90 / 49,90 EUR",d:"Fuer 1 oder 2 Personen. Haehnchen, Lamm und Fisch, 24h mariniert."}]},
{title:"Korma & Bhuna & Vindaloo",desc:"Drei weitere Kocharten",items:[{t:"Korma",d:"Delikate Mischung aus Tomatenmark, Cashewnuessen, Sahne und Gewuerzen. Zart gewuerzt."},{t:"Bhuna",d:"Reduzierte Basis aus Tomaten, Zwiebeln und Chili mit Paprika."},{t:"Vindaloo",d:"Scharf! Kartoffel, Ingwer und Chili. Goanische Kueche."},{t:"",d:"Alle drei Kocharten in 7 Varianten: Gemuese ab 13,90 EUR bis Jhinga 21,90 EUR"}]},
{title:"Biryani & Bestseller",desc:"Kulinarische Reis-Spezialitaeten",items:[{t:"61 Gemuese Biryani",p:"12,50 EUR"},{t:"63 Haehnchen Biryani",p:"13,50 EUR"},{t:"64 Lammfleisch Biryani",p:"18,90 EUR"},{t:"65 Prawn Biryani",p:"20,90 EUR"},{t:"67 Mix Masala Biryani",p:"20,90 EUR",d:"Lamm, Haehnchen und Hummerkrabben"}],extra:"Unsere Bestseller",items2:[{t:"Fisch Tikka",p:"24,90 EUR",d:"Im Tandoorofen mit Kokos-Currysosse"},{t:"Mutton Tikka",p:"24,90 EUR",d:"Lammfleisch im Tandoor gegrillt"},{t:"Chicken Kohlapuri",p:"18,90 EUR",d:"In wuerziger Tomaten Currysosse"},{t:"Malai Kofta",p:"19,90 EUR",d:"Frischkaese-Baellchen in Kokos-Currysosse"}]},
{title:"Desserts & Menues",items:[{t:"91 Firni",p:"3,90 EUR",d:"Milchreispudding mit Rosenwasser und Mandeln"},{t:"92 Gajarela",p:"3,90 EUR",d:"Karotten-Milch-Pudding mit Kardamom"},{t:"93 Gulab Jamun",p:"3,90 EUR",d:"Frischkaesebaellchen in Zuckersirup"},{t:"96 Indien Eis Kulfi",p:"5,90 EUR"},{t:"100 Mango Safran Halwa (Vegan)",p:"5,90 EUR"}],extra:"Menues fuer 2 Personen",items2:[{t:"Tandoori-Mix-Platte (Menue 1)",p:"71,90 EUR"},{t:"Golden Masala-Platte (Menue 2)",p:"66,90 EUR"},{t:"Vegetarische Platte (Menue 3)",p:"65,90 EUR"},{t:"Vegan Platte (Menue 4)",p:"69,90 EUR"}]}
];
var menuPage=0;
function renderMenu(){
var pg=menuPages[menuPage];var h='<div style="text-align:center;margin-bottom:16px"><div style="font-size:11px;text-transform:uppercase;letter-spacing:2px;color:#D4940E;font-weight:600;font-family:Inter,sans-serif">Golden Masala</div><h3 style="font-size:22px;color:#58585A;margin:4px 0">'+pg.title+'</h3>'+(pg.desc?'<p class="cat-desc">'+pg.desc+'</p>':'')+'</div>';
if(pg.vars){h+='<div class="menu-var">';for(var i=0;i<pg.vars.length;i++)h+='<span><strong>'+pg.vars[i].n+'</strong><em>'+pg.vars[i].p+' &euro;</em></span>';h+='</div>';}
if(pg.items)for(var i=0;i<pg.items.length;i++){var it=pg.items[i];if(!it.t&&it.d){h+='<p style="font-size:13px;color:#58585A;line-height:1.8;white-space:pre-line;margin:8px 0">'+it.d.replace(/\\n/g,'\\n')+'</p>'}else{h+='<div class="menu-item"><div><div class="name">'+it.t+'</div>'+(it.d?'<div class="desc">'+it.d+'</div>':'')+'</div>'+(it.p?'<div class="price">'+it.p+'</div>':'')+'</div>';}}
if(pg.extra){h+='<h3 style="font-size:17px;color:#A0522D;margin:20px 0 8px;font-family:Playfair Display,serif">'+pg.extra+'</h3>';if(pg.items2)for(var i=0;i<pg.items2.length;i++){var it=pg.items2[i];h+='<div class="menu-item"><div><div class="name">'+it.t+'</div>'+(it.d?'<div class="desc">'+it.d+'</div>':'')+'</div>'+(it.p?'<div class="price">'+it.p+'</div>':'')+'</div>';}}
document.getElementById('menuContent').innerHTML=h;
document.getElementById('menuPageNum').textContent=(menuPage+1)+' / '+menuPages.length;}
function menuGo(d){menuPage=Math.max(0,Math.min(menuPages.length-1,menuPage+d));renderMenu();}
renderMenu();
document.addEventListener('keydown',function(e){if(!document.getElementById('menuOverlay').classList.contains('active'))return;if(e.key==='ArrowRight')menuGo(1);if(e.key==='ArrowLeft')menuGo(-1);if(e.key==='Escape')document.getElementById('menuOverlay').classList.remove('active');});
</script>
</body></html>`;
}
