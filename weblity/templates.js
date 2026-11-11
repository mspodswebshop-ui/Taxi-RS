/* ==========================================================================
   Weblity — de templates
   Dit bestand maakt van een handvol gegevens (naam, teksten, kleur, ...) een
   volledige website. De bouwer gebruikt het voor het live voorbeeld; de
   beheerversie gebruikt het om het eindbestand te maken.

   Een gemaakte site is één HTML-bestand zonder JavaScript en zonder externe
   bestanden. Alles wat een klant intypt, wordt eerst onschadelijk gemaakt
   (zie esc en clean), zodat niemand via een tekstveld of een gedeelde link
   code in een site kan smokkelen.
   ========================================================================== */
(function (root) {
  "use strict";

  /* ---------- Hulpjes ---------- */

  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));
  const multiline = (s) => esc(s).replace(/\r?\n/g, "<br>");
  const isColor = (s) => typeof s === "string" && /^#[0-9a-f]{6}$/i.test(s);
  const isPhoto = (s) => typeof s === "string" && /^data:image\/(jpeg|png|webp);base64,[a-z0-9+/=]+$/i.test(s);

  const telHref = (s) => String(s || "").replace(/[^\d+]/g, "");
  // WhatsApp wil het nummer internationaal en zonder plus. Een nummer dat met
  // één 0 begint, lezen we als Belgisch.
  const waNumber = (s) => {
    let n = telHref(s);
    if (n.startsWith("+")) n = n.slice(1);
    else if (n.startsWith("00")) n = n.slice(2);
    else if (n.startsWith("0")) n = "32" + n.slice(1);
    return n;
  };

  // Helderheid van een kleur en het contrast tussen twee kleuren (WCAG).
  const lum = (hex) => {
    const n = parseInt(hex.slice(1), 16);
    const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
      v /= 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const contrast = (a, b) => {
    const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
  };

  /* ---------- De templates ---------- */

  const SERIF = '"Iowan Old Style", "Palatino Linotype", Palatino, "Book Antiqua", Georgia, serif';
  const SANS = 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
  const ROUND = 'ui-rounded, "SF Pro Rounded", "Arial Rounded MT Bold", "Trebuchet MS", system-ui, sans-serif';
  const MONO = 'ui-monospace, "SF Mono", Menlo, Consolas, monospace';

  const UREN = "Maandag – vrijdag: 9u – 18u\nZaterdag: 9u – 16u\nZondag: gesloten";
  const CONTACT = { tel: "+32 000 00 00 00", mail: "hallo@example.com", adres: "Voorbeeldstraat 12, 2000 Antwerpen" };

  const TEMPLATES = [
    {
      id: "atelier", naam: "Atelier", voor: "Kapsalon · Schoonheid · Praktijk",
      kleur: "#b4586a", bg: "#fbf6f1", ink: "#2b201d", hero: "split", items: "cards",
      vars: `--fh:${SERIF};--fb:${SANS};--hw:500;--ls:-.02em;--rb:999px;--rc:26px;--ra:999px 999px 26px 26px;--h1:4.6rem`,
      d: {
        naam: "Studio Lien", slogan: "Even tijd voor jezelf.",
        intro: "Knippen, kleuren en verzorgen in een rustig salon in het hart van de stad. Op afspraak, zonder haast.",
        knop: "Maak een afspraak", itemsTitel: "Behandelingen",
        items: [
          { n: "Knippen en stylen", d: "Wassen, knippen en brushen.", p: "€ 38" },
          { n: "Kleuren", d: "Van subtiele glans tot een volledig nieuwe kleur.", p: "vanaf € 65" },
          { n: "Verzorging", d: "Een kuur die je haar weer sterk en soepel maakt.", p: "€ 25" },
        ],
        over: "Studio Lien is een klein salon waar je als persoon binnenkomt, niet als nummer. We nemen de tijd om te luisteren en werken met producten die zacht zijn voor je haar.",
        uren: "Dinsdag – vrijdag: 9u – 18u\nZaterdag: 9u – 16u\nZondag en maandag: gesloten", ...CONTACT,
      },
    },
    {
      id: "bistro", naam: "Bistro", voor: "Restaurant · Bakkerij · Café",
      kleur: "#e0a23c", bg: "#15110d", ink: "#f6ead9", hero: "center", items: "menu",
      vars: `--fh:${SERIF};--fb:${SANS};--hw:500;--ls:-.02em;--rb:6px;--rc:10px;--ra:14px;--h1:5.4rem`,
      d: {
        naam: "De Korst", slogan: "Eerlijk eten, elke dag vers.",
        intro: "Een keuken die kookt met wat het seizoen geeft. Schuif aan voor de lunch of blijf hangen tot het donker wordt.",
        knop: "Reserveer een tafel", itemsTitel: "Op de kaart",
        items: [
          { n: "Soep van de dag", d: "Met zuurdesembrood en gezouten boter.", p: "€ 7" },
          { n: "Stoofvlees van het huis", d: "Traag gegaard, met frietjes en sla.", p: "€ 19" },
          { n: "Geroosterde groenten", d: "Met hummus, granaatappel en munt.", p: "€ 16" },
          { n: "Appeltaart", d: "Warm, met een bol vanille-ijs.", p: "€ 6" },
        ],
        over: "De Korst begon als bakkerij en groeide uit tot een plek waar de buurt samenkomt. Het brood bakken we nog altijd zelf, elke ochtend.",
        uren: "Woensdag – zondag: 11u – 22u\nMaandag en dinsdag: gesloten", ...CONTACT,
      },
    },
    {
      id: "rijklaar", naam: "Rijklaar", voor: "Taxi · Aannemer · Diensten",
      kleur: "#ffcc00", bg: "#101010", ink: "#ffffff", hero: "bold", items: "list",
      vars: `--fh:${SANS};--fb:${SANS};--hw:900;--ls:-.04em;--tt:uppercase;--rb:8px;--rc:8px;--ra:10px;--h1:6rem`,
      d: {
        naam: "Taxi Voorbeeld", slogan: "Altijd op tijd. Dag en nacht.",
        intro: "Betrouwbaar vervoer voor korte en lange ritten. Je weet de prijs vooraf en je chauffeur staat klaar wanneer jij vertrekt.",
        knop: "Boek je rit", itemsTitel: "Onze diensten",
        items: [
          { n: "Luchthavenvervoer", d: "Naar Zaventem, Charleroi of Schiphol, met een vaste prijs.", p: "" },
          { n: "Stadsritten", d: "Snel van deur tot deur, ook 's nachts.", p: "" },
          { n: "Groepsvervoer", d: "Een minibus voor tot acht personen.", p: "" },
          { n: "Zakelijk vervoer", d: "Op factuur, voor jou en je klanten.", p: "" },
        ],
        over: "Wij rijden al jaren in de regio en kennen de weg. Nette wagens, vriendelijke chauffeurs en afspraken die we nakomen.",
        uren: "Elke dag: 24 uur op 24\nReserveren kan altijd", ...CONTACT,
      },
    },
    {
      id: "studio", naam: "Studio", voor: "Portfolio · Fotograaf · Ontwerper",
      kleur: "#111111", bg: "#ffffff", ink: "#111111", hero: "side", items: "gallery",
      vars: `--fh:${SANS};--fb:${SANS};--hw:500;--ls:-.05em;--rb:999px;--rc:0px;--ra:0px;--h1:7rem`,
      d: {
        naam: "Noor Peeters", slogan: "Fotograaf van mensen en plekken.",
        intro: "Ik maak beelden voor merken, magazines en mensen die een verhaal te vertellen hebben. Werkzaam vanuit Antwerpen, onderweg waar het werk is.",
        knop: "Werk samen", itemsTitel: "Recent werk",
        items: [
          { n: "Zomer in de stad", d: "Reeks voor een stadsmagazine", p: "2026" },
          { n: "Handen aan het werk", d: "Portretten van ambachtslui", p: "2025" },
          { n: "Kust", d: "Vrij werk", p: "2025" },
        ],
        over: "Na tien jaar in de reclame koos ik voor de camera. Ik werk het liefst met natuurlijk licht en met mensen die zichzelf mogen blijven.",
        uren: "", ...CONTACT, adres: "",
      },
    },
    {
      id: "winkel", naam: "Winkel", voor: "Webshop · Producten · Makers",
      kleur: "#3f6fe8", bg: "#f4f6fb", ink: "#141926", hero: "split", items: "tiles",
      vars: `--fh:${SANS};--fb:${SANS};--hw:750;--ls:-.035em;--rb:12px;--rc:18px;--ra:26px;--h1:4.4rem`,
      d: {
        naam: "Kaarsenmakerij Flam", slogan: "Met de hand gegoten kaarsen.",
        intro: "Kleine oplages, natuurlijke was en geuren die niet overheersen. Bestel online en haal af of laat thuis leveren.",
        knop: "Bekijk het aanbod", itemsTitel: "Onze producten",
        items: [
          { n: "Kaars Bos", d: "Ceder en mos, 40 branduren.", p: "€ 24" },
          { n: "Kaars Zee", d: "Zout, salie en een vleugje citrus.", p: "€ 24" },
          { n: "Geschenkset", d: "Drie kleine kaarsen in een doos.", p: "€ 39" },
          { n: "Navulling", d: "Voor je lege pot, minder afval.", p: "€ 15" },
        ],
        over: "Elke kaars gieten we zelf in ons atelier. Geen paraffine, geen plastic verpakking, wel veel geduld.",
        uren: "Afhalen: woensdag en zaterdag, 10u – 17u", ...CONTACT,
      },
    },
    {
      id: "buurt", naam: "Buurt", voor: "Vereniging · Coach · Kinderopvang",
      kleur: "#ef6a3a", bg: "#fff8ec", ink: "#33250a", hero: "center", items: "cards",
      vars: `--fh:${ROUND};--fb:${SANS};--hw:800;--ls:-.03em;--rb:999px;--rc:30px;--ra:40px;--h1:5rem`,
      d: {
        naam: "Buurthuis De Linde", slogan: "Een plek waar iedereen welkom is.",
        intro: "Samen koken, sporten, repeteren of gewoon een koffie drinken. Het buurthuis is van en voor de wijk.",
        knop: "Doe mee", itemsTitel: "Wat er te doen is",
        items: [
          { n: "Open tafel", d: "Elke donderdag eten we samen. Schuif gerust aan.", p: "€ 5" },
          { n: "Huiswerkklas", d: "Vrijwilligers helpen kinderen na school.", p: "gratis" },
          { n: "Repaircafé", d: "Breng je kapotte toestel, we herstellen het samen.", p: "gratis" },
        ],
        over: "De Linde draait op vrijwilligers uit de buurt. Heb je een idee of wil je een handje helpen? Kom langs, de deur staat open.",
        uren: UREN, ...CONTACT,
      },
    },
  ];
  const byId = (id) => TEMPLATES.find((t) => t.id === id) || TEMPLATES[0];

  /* ---------- Gegevens opschonen ---------- */
  // Alles wat van buiten komt (een formulier, een gedeelde link, de opslag in
  // de browser) gaat hierdoor: alleen bekende velden, als tekst, met een
  // maximale lengte.
  const LIMITS = { naam: 60, slogan: 90, intro: 320, knop: 40, itemsTitel: 50, over: 900, uren: 320, tel: 30, mail: 80, adres: 140 };
  const MAX_ITEMS = 8;

  function clean(raw) {
    const out = {};
    if (!raw || typeof raw !== "object") return out;
    if (typeof raw.t === "string") out.t = byId(raw.t).id;
    for (const [key, max] of Object.entries(LIMITS)) {
      if (typeof raw[key] === "string") out[key] = raw[key].slice(0, max);
    }
    if (isColor(raw.kleur)) out.kleur = raw.kleur.toLowerCase();
    if (Array.isArray(raw.items)) {
      out.items = raw.items.slice(0, MAX_ITEMS).map((it) => ({
        n: String((it && it.n) || "").slice(0, 60),
        d: String((it && it.d) || "").slice(0, 160),
        p: String((it && it.p) || "").slice(0, 24),
      }));
    }
    if (isPhoto(raw.foto)) out.foto = raw.foto;
    if (typeof raw.credit === "boolean") out.credit = raw.credit;
    return out;
  }

  /* ---------- De stijl van een gemaakte site ---------- */

  const CSS = `
*,*::before,*::after{box-sizing:border-box}
html{scroll-behavior:smooth;-webkit-text-size-adjust:100%}
body{margin:0;background:var(--bg);color:var(--ink);font:400 17px/1.65 var(--fb);-webkit-font-smoothing:antialiased;overflow-x:hidden}
img{display:block;max-width:100%}
a{color:inherit}
h1,h2,h3,p,ul{margin:0}
ul{padding:0;list-style:none}
:focus-visible{outline:3px solid var(--ac2);outline-offset:3px}
.w{width:min(1120px,100% - 44px);margin-inline:auto}
h1,h2,h3{font-family:var(--fh);font-weight:var(--hw);letter-spacing:var(--ls);line-height:1.04;text-wrap:balance;text-transform:var(--tt,none)}
h1{font-size:clamp(2.5rem,7.4vw,var(--h1))}
h2{font-size:clamp(1.9rem,4.4vw,3rem)}
h3{font-size:1.22rem;line-height:1.2;letter-spacing:-.01em}
.kick{display:block;margin-bottom:14px;font-size:.78rem;font-weight:650;letter-spacing:.16em;text-transform:uppercase;color:var(--ac2)}
.mute{color:var(--mute)}
.btn{display:inline-flex;align-items:center;justify-content:center;gap:.5em;padding:.92em 1.6em;border-radius:var(--rb);background:var(--ac);color:var(--on);font-weight:650;line-height:1.2;text-decoration:none;transition:transform .25s,box-shadow .25s,filter .25s}
.btn:hover{transform:translateY(-2px);box-shadow:0 14px 28px -14px var(--ac);filter:brightness(1.06)}
.btn--line{background:none;color:inherit;box-shadow:inset 0 0 0 1.5px var(--line2)}
.btn--line:hover{box-shadow:inset 0 0 0 1.5px currentColor;filter:none}
.btn--s{padding:.62em 1.15em;font-size:.92rem}

.top{position:sticky;top:0;z-index:5;background:color-mix(in srgb,var(--bg) 88%,transparent);-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px);border-bottom:1px solid var(--line)}
.top__in{display:flex;align-items:center;gap:26px;min-height:68px}
.brand{margin-right:auto;font-family:var(--fh);font-weight:var(--hw);font-size:1.28rem;letter-spacing:var(--ls);text-transform:var(--tt,none);text-decoration:none}
.top nav{display:flex;gap:24px;font-size:.95rem}
.top nav a{text-decoration:none;opacity:.72;transition:opacity .2s}
.top nav a:hover{opacity:1}
@media(max-width:760px){.top nav{display:none}}

.hero{padding:clamp(48px,8vw,104px) 0}
.lead{margin-top:22px;max-width:48ch;font-size:clamp(1.05rem,1.5vw,1.2rem);color:var(--mute);text-wrap:pretty}
.acts{margin-top:30px;display:flex;flex-wrap:wrap;gap:12px}
.art{position:relative;overflow:hidden;aspect-ratio:4/4.3;border-radius:var(--ra);background:var(--soft)}
.art img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.art i{position:absolute;border-radius:50%;background:var(--ac)}
.art i:nth-child(1){width:44%;aspect-ratio:1;right:13%;top:14%;opacity:.92}
.art i:nth-child(2){width:130%;aspect-ratio:2.2;left:-36%;bottom:-32%;opacity:.28}
.art i:nth-child(3){width:96%;aspect-ratio:2.2;right:-32%;bottom:-28%;opacity:.5}

.hero--split .w{display:grid;gap:clamp(30px,5vw,76px);align-items:center}
@media(min-width:860px){.hero--split .w{grid-template-columns:1.08fr .92fr}}

.hero--center{text-align:center}
.hero--center .lead{margin-inline:auto}
.hero--center .acts{justify-content:center}
.hero--center .art{margin-top:clamp(36px,6vw,64px);aspect-ratio:21/9}
.hero--center .art i:nth-child(1){width:18%;right:20%;top:16%}

.hero--bold{background:var(--ac);color:var(--on)}
.hero--bold .kick{color:inherit;opacity:.7}
.hero--bold .lead{color:inherit;opacity:.82;font-weight:500}
.hero--bold .btn{background:var(--on);color:var(--ac)}
.hero--bold .btn:hover{box-shadow:0 14px 28px -14px var(--on)}
.hero--bold .btn--line{background:none;color:inherit;box-shadow:inset 0 0 0 2px currentColor}
.hero--bold .w{display:grid;gap:clamp(30px,5vw,70px);align-items:center}
@media(min-width:900px){.hero--bold .w.has-photo{grid-template-columns:1.2fr .8fr}}
.hero--bold .art{display:none}
.hero--bold .has-photo .art{display:block}

.hero--side h1{max-width:13ch}
.hero--side .hero__row{margin-top:clamp(26px,4vw,48px);display:grid;gap:26px;align-items:end}
@media(min-width:860px){.hero--side .hero__row{grid-template-columns:1fr auto}}
.hero--side .lead{margin-top:0}
.hero--side .acts{margin-top:0}
.hero--side .art{margin-top:clamp(36px,6vw,70px);aspect-ratio:16/7}
.hero--side .art i:nth-child(1){width:22%;right:14%;top:16%}

.sec{padding:clamp(60px,9vw,118px) 0}
.sec--alt{background:var(--soft)}
.sec__head{margin-bottom:clamp(30px,4.5vw,54px)}

.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:18px}
.card{display:flex;flex-direction:column;gap:10px;padding:28px;border-radius:var(--rc);background:var(--panel);border:1px solid var(--line);transition:transform .3s,box-shadow .3s}
.card:hover{transform:translateY(-4px);box-shadow:0 24px 40px -30px var(--ink)}
.card p{color:var(--mute);font-size:.98rem}
.price{margin-top:auto;padding-top:10px;font-weight:650;color:var(--ac2)}

.menu{max-width:780px;display:grid;gap:26px}
.menu__top{display:flex;align-items:baseline;gap:14px}
.menu__top::after{content:"";flex:1;order:1;border-bottom:1.5px dotted var(--line2);transform:translateY(-.3em)}
.menu__top b{order:2;font-weight:600;color:var(--ac2);white-space:nowrap}
.menu p{margin-top:4px;color:var(--mute);font-size:.98rem}

.rows{border-bottom:1px solid var(--line)}
.row{display:grid;grid-template-columns:auto 1fr;gap:6px clamp(18px,4vw,48px);align-items:baseline;padding:26px 0;border-top:1px solid var(--line);transition:padding-left .3s}
.row:hover{padding-left:12px}
.row__nr{font-family:${MONO};font-size:.85rem;color:var(--ac2)}
.row h3{font-size:clamp(1.3rem,2.6vw,1.9rem)}
.row p{grid-column:2;color:var(--mute);max-width:56ch}
.row b{grid-column:2;color:var(--ac2)}

.tiles{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:18px}
.tile{display:flex;flex-direction:column;padding:12px 12px 18px;border-radius:var(--rc);background:var(--panel);border:1px solid var(--line);transition:transform .3s,box-shadow .3s}
.tile:hover{transform:translateY(-4px);box-shadow:0 24px 40px -30px var(--ink)}
.tile__pic{aspect-ratio:1;border-radius:calc(var(--rc) - 6px);background:linear-gradient(140deg,var(--ac),color-mix(in srgb,var(--ac) 22%,var(--bg)))}
.tile:nth-child(2n) .tile__pic{background:linear-gradient(220deg,var(--ac),color-mix(in srgb,var(--ac) 14%,var(--bg)))}
.tile:nth-child(3n) .tile__pic{background:radial-gradient(circle at 30% 30%,color-mix(in srgb,var(--ac) 30%,var(--bg)),var(--ac))}
.tile h3{margin:16px 6px 0}
.tile p{margin:6px 6px 0;color:var(--mute);font-size:.95rem}
.tile__foot{margin:auto 6px 0;padding-top:16px;display:flex;align-items:center;justify-content:space-between;gap:10px}
.tile__foot b{font-size:1.1rem}

.gal{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:14px}
.shot{position:relative;aspect-ratio:4/5;overflow:hidden;display:flex;flex-direction:column;justify-content:flex-end;padding:22px;color:#fff;background:linear-gradient(160deg,color-mix(in srgb,var(--ac) 55%,#888),#1b1b1b)}
.shot:nth-child(2n){background:linear-gradient(200deg,#cfcfcf,color-mix(in srgb,var(--ac) 70%,#333))}
.shot:nth-child(3n){background:linear-gradient(120deg,#2a2a2a,color-mix(in srgb,var(--ac) 40%,#aaa))}
.shot::after{content:"";position:absolute;inset:0;background:linear-gradient(transparent 45%,rgba(0,0,0,.6));transition:opacity .4s}
.shot>*{position:relative;z-index:1}
.shot span{font-family:${MONO};font-size:.8rem;opacity:.85}
.shot h3{margin-top:4px;font-size:1.4rem}

.about{display:grid;gap:clamp(30px,5vw,70px)}
@media(min-width:860px){.about--two{grid-template-columns:1.25fr .75fr;align-items:start}}
.about__text{font-size:clamp(1.08rem,1.6vw,1.3rem);line-height:1.6;max-width:60ch;text-wrap:pretty}
.hours{padding:28px;border-radius:var(--rc);background:var(--bg);border:1px solid var(--line)}
.hours h3{margin-bottom:12px}
.hours p{color:var(--mute);line-height:1.9}

.contact{display:grid;gap:clamp(28px,5vw,70px)}
@media(min-width:860px){.contact{grid-template-columns:1fr 1fr;align-items:end}}
.contact__list{display:grid;gap:18px}
.contact__list div{display:grid;gap:2px}
.contact__list span{font-size:.78rem;letter-spacing:.14em;text-transform:uppercase;color:var(--mute)}
.contact__list a,.contact__list p{font-size:1.18rem;font-weight:550;text-decoration:none}
.contact__list a:hover{color:var(--ac2)}

.foot{padding:30px 0;border-top:1px solid var(--line);font-size:.9rem;color:var(--mute)}
.foot .w{display:flex;flex-wrap:wrap;gap:8px 24px;justify-content:space-between}
.foot a{text-decoration:none}
.foot a:hover{color:var(--ink)}

/* Template-eigen accenten */
.t-bistro .top{border-bottom-color:transparent}
.t-bistro h1{font-style:italic}
.t-rijklaar .card,.t-rijklaar .hours{border-width:2px}
.t-studio .top{border-bottom-color:var(--ink)}
.t-studio .kick{font-family:${MONO};letter-spacing:.06em}
.t-studio .sec--alt{background:var(--bg);border-top:1px solid var(--ink)}
.t-winkel .top{background:color-mix(in srgb,#fff 90%,transparent)}
.t-buurt .card:nth-child(3n+1){background:color-mix(in srgb,var(--ac) 16%,var(--bg))}
.t-buurt .card:nth-child(3n+2){background:color-mix(in srgb,#2f9e6e 16%,var(--bg))}
.t-buurt .card:nth-child(3n){background:color-mix(in srgb,#f2b705 22%,var(--bg))}
.t-buurt .card{border-color:transparent}
.t-buurt .art{border-radius:60px 60px 60px 160px}

/* Beweging: de kop komt binnen bij het laden, de rest bij het scrollen.
   Browsers die scroll-animaties in CSS niet kennen, tonen alles meteen. */
@keyframes up{from{opacity:0;transform:translateY(28px)}}
@media(prefers-reduced-motion:no-preference){
  .anim .hero h1,.anim .hero .kick,.anim .hero .lead,.anim .hero .acts,.anim .hero .art{animation:up .9s cubic-bezier(.22,1,.36,1) both}
  .anim .hero .lead{animation-delay:.12s}
  .anim .hero .acts{animation-delay:.22s}
  .anim .hero .art{animation-delay:.3s}
  @supports (animation-timeline:view()){
    .anim .rv{animation:up linear both;animation-timeline:view();animation-range:entry 0% entry 40%}
  }
}
@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}*{transition:none!important}}
`;

  /* ---------- Van gegevens naar een site ---------- */

  function itemsHtml(kind, items, c) {
    const list = items.filter((it) => it.n || it.d);
    if (!list.length) return "";
    const price = (it, tag = "b") => (it.p ? `<${tag}>${esc(it.p)}</${tag}>` : "");

    if (kind === "menu") {
      return `<div class="menu">${list.map((it) => `
        <div class="rv"><div class="menu__top"><h3>${esc(it.n)}</h3>${price(it)}</div>${it.d ? `<p>${esc(it.d)}</p>` : ""}</div>`).join("")}</div>`;
    }
    if (kind === "list") {
      return `<div class="rows">${list.map((it, i) => `
        <div class="row rv"><span class="row__nr">${String(i + 1).padStart(2, "0")}</span><h3>${esc(it.n)}</h3>${it.d ? `<p>${esc(it.d)}</p>` : ""}${price(it)}</div>`).join("")}</div>`;
    }
    if (kind === "tiles") {
      const order = (it) => {
        const text = encodeURIComponent(`Hallo, ik wil graag bestellen: ${it.n}`);
        if (c.tel) return `https://wa.me/${waNumber(c.tel)}?text=${text}`;
        if (c.mail) return `mailto:${encodeURIComponent(c.mail)}?subject=${encodeURIComponent(`Bestelling: ${it.n}`)}`;
        return "#contact";
      };
      return `<div class="tiles">${list.map((it) => `
        <article class="tile rv"><div class="tile__pic"></div><h3>${esc(it.n)}</h3>${it.d ? `<p>${esc(it.d)}</p>` : ""}
          <div class="tile__foot">${price(it) || "<span></span>"}<a class="btn btn--s" href="${esc(order(it))}">Bestel</a></div></article>`).join("")}</div>`;
    }
    if (kind === "gallery") {
      return `<div class="gal">${list.map((it) => `
        <figure class="shot rv">${it.p ? `<span>${esc(it.p)}</span>` : ""}<h3>${esc(it.n)}</h3>${it.d ? `<span>${esc(it.d)}</span>` : ""}</figure>`).join("")}</div>`;
    }
    return `<div class="cards">${list.map((it) => `
      <article class="card rv"><h3>${esc(it.n)}</h3>${it.d ? `<p>${esc(it.d)}</p>` : ""}${it.p ? `<span class="price">${esc(it.p)}</span>` : ""}</article>`).join("")}</div>`;
  }

  // Geeft de onderdelen van een site terug. opts.preview zet de
  // binnenkom-animaties uit, zodat het voorbeeld niet flikkert bij elke toets.
  function render(config, opts = {}) {
    const t = byId(config && config.t);
    const c = { ...t.d, ...clean(config) };
    const ac = c.kleur || t.kleur;
    const on = contrast(ac, "#ffffff") >= contrast(ac, "#111111") ? "#ffffff" : "#111111";
    // De accentkleur als tekst op de achtergrond: alleen als dat leesbaar is.
    const ac2 = contrast(ac, t.bg) >= 3 ? ac : t.ink;
    const items = c.items || [];
    const hasItems = items.some((it) => it.n || it.d);
    const hasContact = c.tel || c.mail || c.adres;
    const photo = c.foto ? `<img src="${c.foto}" alt="">` : "<i></i><i></i><i></i>";
    const art = `<div class="art">${photo}</div>`;

    const vars = `:root{--ac:${ac};--ac2:${ac2};--on:${on};--bg:${t.bg};--ink:${t.ink};`
      + `--mute:color-mix(in srgb,var(--ink) 66%,var(--bg));--soft:color-mix(in srgb,var(--ac) 11%,var(--bg));`
      + `--panel:color-mix(in srgb,var(--ink) 4%,var(--bg));--line:color-mix(in srgb,var(--ink) 13%,transparent);`
      + `--line2:color-mix(in srgb,var(--ink) 32%,transparent);${t.vars}}`;

    const acts = `<div class="acts">
        ${c.knop ? `<a class="btn" href="#contact">${esc(c.knop)}</a>` : ""}
        ${hasItems && c.itemsTitel ? `<a class="btn btn--line" href="#aanbod">${esc(c.itemsTitel)}</a>` : ""}</div>`;
    const lead = c.intro ? `<p class="lead">${esc(c.intro)}</p>` : "";
    const h1 = `<h1>${esc(c.slogan || c.naam)}</h1>`;

    let hero;
    if (t.hero === "center") {
      hero = `<div class="w">${h1}${lead}${acts}${art}</div>`;
    } else if (t.hero === "bold") {
      hero = `<div class="w${c.foto ? " has-photo" : ""}"><div><span class="kick">${esc(c.naam)}</span>${h1}${lead}${acts}</div>${art}</div>`;
    } else if (t.hero === "side") {
      hero = `<div class="w">${h1}<div class="hero__row">${lead}${acts}</div>${art}</div>`;
    } else {
      hero = `<div class="w"><div>${h1}${lead}${acts}</div>${art}</div>`;
    }

    const nav = [
      hasItems && c.itemsTitel ? `<a href="#aanbod">${esc(c.itemsTitel)}</a>` : "",
      c.over ? '<a href="#over">Over ons</a>' : "",
      hasContact ? '<a href="#contact">Contact</a>' : "",
    ].join("");

    const contactRows = [
      c.tel ? `<div><span>Telefoon</span><a href="tel:${esc(telHref(c.tel))}">${esc(c.tel)}</a></div>` : "",
      c.mail ? `<div><span>E-mail</span><a href="mailto:${esc(c.mail)}">${esc(c.mail)}</a></div>` : "",
      c.adres ? `<div><span>Adres</span><p>${esc(c.adres)}</p></div>` : "",
    ].join("");
    const contactActs = [
      c.tel ? `<a class="btn" href="tel:${esc(telHref(c.tel))}">Bel ons</a>` : "",
      c.tel ? `<a class="btn btn--line" href="https://wa.me/${waNumber(c.tel)}">WhatsApp</a>` : "",
      !c.tel && c.mail ? `<a class="btn" href="mailto:${esc(c.mail)}">Stuur een mail</a>` : "",
      c.adres ? `<a class="btn btn--line" href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(c.adres)}" target="_blank" rel="noopener">Route</a>` : "",
    ].join("");

    const body = `
<header class="top"><div class="w top__in">
  <a class="brand" href="#top">${esc(c.naam)}</a>
  <nav aria-label="Hoofdmenu">${nav}</nav>
  ${c.tel ? `<a class="btn btn--s" href="tel:${esc(telHref(c.tel))}">Bel ons</a>` : ""}
</div></header>
<main id="top">
  <section class="hero hero--${t.hero}">${hero}</section>
  ${hasItems ? `<section class="sec" id="aanbod"><div class="w">
    <div class="sec__head rv"><h2>${esc(c.itemsTitel || "Aanbod")}</h2></div>
    ${itemsHtml(t.items, items, c)}</div></section>` : ""}
  ${c.over || c.uren ? `<section class="sec sec--alt" id="over"><div class="w about${c.over && c.uren ? " about--two" : ""}">
    ${c.over ? `<div class="rv"><span class="kick">Over ons</span><p class="about__text">${multiline(c.over)}</p></div>` : ""}
    ${c.uren ? `<aside class="hours rv"><h3>Openingsuren</h3><p>${multiline(c.uren)}</p></aside>` : ""}</div></section>` : ""}
  ${hasContact ? `<section class="sec" id="contact"><div class="w contact">
    <div class="rv"><span class="kick">Contact</span><h2>${esc(c.knop || "Neem contact op")}</h2><div class="acts">${contactActs}</div></div>
    <div class="contact__list rv">${contactRows}</div></div></section>` : ""}
</main>
<footer class="foot"><div class="w">
  <span>© ${new Date().getFullYear()} ${esc(c.naam)}</span>
  ${c.credit === false ? "" : "<span>Gemaakt met Weblity</span>"}
</div></footer>`;

    return {
      title: c.naam + (c.slogan ? ` — ${c.slogan}` : ""),
      description: c.intro || c.slogan || c.naam,
      css: vars + CSS,
      bodyClass: `t-${t.id}${opts.preview ? "" : " anim"}`,
      theme: t.hero === "bold" ? ac : t.bg,
      body,
    };
  }

  // De volledige site als één HTML-bestand.
  function html(config, opts = {}) {
    const s = render(config, opts);
    return `<!doctype html>
<html lang="nl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(s.title)}</title>
<meta name="description" content="${esc(s.description)}">
<meta name="theme-color" content="${s.theme}">
<style id="s">${s.css}</style>
</head>
<body class="${s.bodyClass}">${s.body}
</body>
</html>
`;
  }

  root.Weblity = { TEMPLATES, LIMITS, MAX_ITEMS, byId, clean, render, html, isPhoto, waNumber };
})(typeof window !== "undefined" ? window : globalThis);
