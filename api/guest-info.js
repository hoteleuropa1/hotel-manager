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

<!-- SPEISEKARTEN VIEWER (PDF) -->
<div class="menu-overlay" id="menuOverlay">
<button class="menu-close" onclick="closeMenu()">&times;</button>
<div class="menu-canvas-wrap"><canvas id="menuCanvas"></canvas></div>
<div class="menu-nav">
<button onclick="menuGo(-1)" id="menuPrev">&larr;</button>
<span class="menu-page-num" id="menuPageNum">Laden...</span>
<button onclick="menuGo(1)" id="menuNext">&rarr;</button>
</div>
</div>

<div class="footer">
<strong>Hotel Europa</strong><br>
Marktplatz 1 &middot; 65428 Ruesselsheim<br>
Tel.: <a href="tel:+4915903081422">015903081422</a> &middot; <a href="mailto:info@hotel-europa-ruesselsheim.de">info@hotel-europa-ruesselsheim.de</a><br>
<a href="http://www.hotel-europa-ruesselsheim.de">www.hotel-europa-ruesselsheim.de</a>
</div>

<script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
<script>
var pdfDoc=null,pageNum=1,pageCount=0,rendering=false;
pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

function openMenu(){
  document.getElementById('menuOverlay').classList.add('active');
  if(!pdfDoc){
    document.getElementById('menuPageNum').textContent='Laden...';
    pdfjsLib.getDocument('https://pms.hotel-europa-ruesselsheim.de/speisekarte.pdf').promise.then(function(pdf){
      pdfDoc=pdf;pageCount=pdf.numPages;pageNum=1;renderPage(pageNum);
    }).catch(function(err){
      document.getElementById('menuPageNum').textContent='Fehler beim Laden';
    });
  } else {
    renderPage(pageNum);
  }
}

function closeMenu(){document.getElementById('menuOverlay').classList.remove('active')}

function renderPage(num){
  if(!pdfDoc||rendering)return;
  rendering=true;
  pdfDoc.getPage(num).then(function(page){
    var canvas=document.getElementById('menuCanvas');
    var ctx=canvas.getContext('2d');
    var maxH=window.innerHeight*0.78;
    var vp=page.getViewport({scale:1});
    var scale=Math.min(maxH/vp.height, (window.innerWidth*0.9)/vp.width, 2);
    var viewport=page.getViewport({scale:scale});
    canvas.height=viewport.height;
    canvas.width=viewport.width;
    page.render({canvasContext:ctx,viewport:viewport}).promise.then(function(){
      rendering=false;
      document.getElementById('menuPageNum').textContent=num+' / '+pageCount;
      document.getElementById('menuPrev').style.opacity=num<=1?'0.3':'1';
      document.getElementById('menuNext').style.opacity=num>=pageCount?'0.3':'1';
    });
  });
}

function menuGo(d){
  var n=pageNum+d;
  if(n<1||n>pageCount||rendering)return;
  pageNum=n;renderPage(pageNum);
}

document.addEventListener('keydown',function(e){
  if(!document.getElementById('menuOverlay').classList.contains('active'))return;
  if(e.key==='ArrowRight')menuGo(1);
  if(e.key==='ArrowLeft')menuGo(-1);
  if(e.key==='Escape')closeMenu();
});

document.getElementById('menuOverlay').addEventListener('click',function(e){
  if(e.target===this)closeMenu();
});
</script>
</body></html>`;
}
