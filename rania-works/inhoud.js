/* ==========================================================================
   Rania Works — de inhoud van de site
   --------------------------------------------------------------------------
   Dit is de enige plek waar de teksten, de tarieven en het werk staan.
   Zowel de website (index.html) als het beheer (beheer.html) lezen dit
   bestand.

   Verander je iets in het beheer, dan wordt dat bewaard in de browser en
   gaat dat vóór op wat hier staat. Wil je iets blijvend aanpassen, voor
   iedereen en op elk toestel, pas het dan hier aan.
   ========================================================================== */

var STANDAARD_INHOUD = {

  /* Het WhatsApp-nummer, internationaal: zonder +, zonder spaties,
     zonder de nul vooraan. 0473 29 27 39 wordt dus 32473292739. */
  nummer: '32473292739',

  /* Hoe het nummer op de site getoond wordt. */
  nummerGetoond: '0473 29 27 39',

  /* Alle losse teksten van de site.
     Waar *sterretjes* rond staan, wordt het paars en cursief. */
  teksten: {
    /* Bovenaan */
    heroLabel: 'Video-editing studio · België',
    titel: 'Edits die mensen *doen stoppen* met scrollen.',
    lead: 'Ik ben Rania. Jij stuurt je ruwe beelden, ik maak er iets van dat past bij jouw merk of bij jou. Voor bedrijven, voor creators, en voor die ene video die gewoon goed moet zijn.',
    knopA: 'Vraag een edit aan',
    knopB: 'Bekijk het werk',
    levering: '2–5 dagen',
    revisies: 'Inbegrepen',
    boekenVia: 'WhatsApp',
    marquee: 'Reels, TikTok, Shorts, Promovideo, Aftermovie, Ondertiteling, Color grading, Thumbnails',

    /* Werk */
    werkLabel: '01 — Werk',
    werkTitel: 'Een greep uit de edits',
    werkLead: 'Verticaal voor social, horizontaal voor je website. Zelfde aanpak: strak ritme, nette kleuren, geen ruis.',
    werkNoot: 'Meer zien? Vraag het gerust — ik stuur je met plezier voorbeelden die bij jouw project passen.',

    /* Diensten */
    dienstenLabel: '02 — Diensten',
    dienstenTitel: 'Voor je bedrijf, of gewoon voor jezelf',

    /* Werkwijze */
    werkwijzeLabel: '03 — Werkwijze',
    werkwijzeTitel: 'Van appje tot afgewerkte video',

    /* Tarieven */
    tarievenLabel: '04 — Tarieven',
    tarievenTitel: 'Prijs per lengte',
    tarievenLead: 'Je betaalt per lengte van de afgewerkte video. Geen verrassingen achteraf: wat hier staat, is wat het kost.',
    tarievenNoot: 'Andere lengte nodig — bijvoorbeeld tussen 30 en 60 seconden, of langer dan anderhalve minuut? Stuur je aanvraag door, dan krijg je meteen een prijs.',

    /* Aanvraag */
    aanvraagLabel: '05 — Aanvraag',
    aanvraagTitel: 'Vraag je edit aan',
    aanvraagLead: 'Vul in wat je nodig hebt. Met één klik staat het als volledig bericht klaar in WhatsApp — je hoeft alleen nog op verzenden te duwen.',

    /* Vragen */
    faqLabel: '06 — FAQ',
    faqTitel: 'Veelgestelde vragen',

    /* Onderaan */
    slotTitel: 'Heb je beelden liggen? *Dan maken we er iets van.*',
    slotKnop: 'Start je aanvraag',
    voetLijn: 'Video-editing voor bedrijven en particulieren.',
    voetKlein: 'Antwoord meestal binnen een paar uur.'
  },

  /* De vier stappen onder "Van appje tot afgewerkte video". */
  werkwijze: [
    { titel: 'Je stuurt je aanvraag',
      tekst: 'Via het formulier hieronder. Dat belandt meteen als bericht in mijn WhatsApp, met alles wat ik nodig heb.' },
    { titel: 'We leggen het vast',
      tekst: 'Ik bevestig prijs, stijl en deadline. Jij deelt je beelden via WeTransfer, Drive of Dropbox.' },
    { titel: 'Ik monteer',
      tekst: 'Je krijgt een eerste versie om te bekijken. Opmerkingen mag je gewoon per tijdstip doorgeven.' },
    { titel: 'Jij krijgt de bestanden',
      tekst: 'Afgewerkt, in de juiste formaten per kanaal. Klaar om te posten.' }
  ],

  /* De vier blokken onder "Voor je bedrijf, of gewoon voor jezelf". */
  diensten: [
    {
      titel: 'Social media edits',
      tekst: 'Reels, TikToks en Shorts die in de eerste seconden vasthouden. Hooks, ondertiteling, geluid dat klopt.',
      punten: ['Verticaal, 15–60 sec', 'Ondertiteling in jouw stijl', 'Los of in een serie']
    },
    {
      titel: 'Bedrijfs- & promovideo',
      tekst: 'Eén video die uitlegt wat je doet en waarom het deugt. Voor je site, je advertentie of een beurs.',
      punten: ['Script- en montageadvies', 'Logo, kleuren, lettertype', 'Versies per kanaal']
    },
    {
      titel: 'Persoonlijke edits',
      tekst: 'Aftermovie, verjaardag, reisvideo, gaming-highlights. Jouw beelden, netjes en met gevoel gemonteerd.',
      punten: ['Muziek in overleg', 'Korte versie voor social', 'Cadeau-klaar opgeleverd']
    },
    {
      titel: 'Losse afwerking',
      tekst: 'Heb je al een montage? Dan pak ik alleen de laatste laag: kleur, geluid, tekst en thumbnails.',
      punten: ['Color grading', 'Ondertiteling en captions', 'Thumbnails en covers']
    }
  ],

  /* De veelgestelde vragen onderaan de site. */
  faq: [
    { vraag: 'Hoe stuur ik mijn beelden door?',
      antwoord: 'Via WeTransfer, Google Drive of Dropbox. Na je aanvraag stuur ik je precies door hoe en waar.' },
    { vraag: 'Hoe lang duurt een edit?',
      antwoord: 'Meestal 2 tot 5 werkdagen, afhankelijk van de lengte en hoeveel materiaal er is. Heb je het sneller nodig? Zeg het erbij, spoed kan vaak wel.' },
    { vraag: 'Wat als ik iets wil aanpassen?',
      antwoord: 'Dat hoort erbij. Je geeft je opmerkingen door per tijdstip ("op 0:14 iets korter") en ik pas het aan.' },
    { vraag: 'Mag ik zelf muziek kiezen?',
      antwoord: 'Zeker. Stuur je nummer mee, of ik zoek iets dat past en vrij bruikbaar is voor je kanaal.' },
    { vraag: 'Werk je ook voor particulieren?',
      antwoord: 'Ja. Een aftermovie van een trouw, een reisvideo of een montage als cadeau — even welkom als bedrijfswerk.' },
    { vraag: 'Hoe betaal ik?',
      antwoord: 'Via overschrijving of Payconiq, na goedkeuring van de eerste versie. Bij grotere projecten werk ik met een voorschot.' }
  ],

  /* Het werk dat op de site staat. Nu één voorbeeld-edit.
     - formaat:      het label linksboven op het beeld, bv. 9:16 of 16:9
     - beeld:        adres van een afbeelding (leeg = paars vlak met knop)
     - link:         adres van de video (leeg = de kaart is niet klikbaar) */
  werk: [
    {
      titel: 'Sneakerdrop — Reel',
      omschrijving: 'Snelle cuts op de beat, tekst in beeld, 22 seconden. Gemaakt van twaalf losse clips van een shoot.',
      formaat: '9:16',
      beeld: '',
      link: ''
    }
  ],

  /* De tarieven. De volgorde hier is de volgorde op de site.
     - kort:      het kleine label boven de prijs
     - lengte:    hoe het in het WhatsApp-bericht komt te staan
     - uitgelicht: true zet er "Meest gekozen" bij (hou het bij één) */
  tarieven: [
    {
      kort: 'tot 10 sec',
      lengte: 'tot 10 seconden',
      prijs: '€10',
      voor: 'Korte clip of snelle teaser',
      punten: ['Montage op ritme', 'Ondertiteling', '1 revisieronde'],
      uitgelicht: false
    },
    {
      kort: '10 – 20 sec',
      lengte: '10 tot 20 seconden',
      prijs: '€15',
      voor: 'Reel of Short',
      punten: ['Montage op ritme', 'Ondertiteling', '1 revisieronde'],
      uitgelicht: false
    },
    {
      kort: '20 – 30 sec',
      lengte: '20 tot 30 seconden',
      prijs: '€20',
      voor: 'De klassieke social-edit',
      punten: ['Montage op ritme', 'Ondertiteling', 'Kleur en geluid afgewerkt', '1 revisieronde'],
      uitgelicht: true
    },
    {
      kort: '60 – 90 sec',
      lengte: '60 tot 90 seconden',
      prijs: '€40',
      voor: 'Promo of langere montage',
      punten: ['Montage op ritme', 'Ondertiteling', 'Kleur en geluid afgewerkt', 'Versies per kanaal'],
      uitgelicht: false
    }
  ]
};

/* Waar het beheer zijn gegevens bewaart in de browser. */
var OPSLAG_INHOUD = 'raniaworks:inhoud';
var OPSLAG_AANVRAGEN = 'raniaworks:aanvragen';
var OPSLAG_CODE = 'raniaworks:code';

/* De inhoud ophalen: wat in het beheer is opgeslagen, anders het bovenstaande.
   Gaat er iets mis met de opslag (privémodus, geblokkeerde cookies), dan
   vallen we netjes terug op de standaardinhoud. */
function inhoudOphalen() {
  var basis = JSON.parse(JSON.stringify(STANDAARD_INHOUD));
  try {
    var bewaard = window.localStorage.getItem(OPSLAG_INHOUD);
    if (!bewaard) return basis;
    var eigen = JSON.parse(bewaard);
    if (!eigen || typeof eigen !== 'object') return basis;

    if (eigen.nummer) basis.nummer = String(eigen.nummer);
    if (eigen.nummerGetoond) basis.nummerGetoond = String(eigen.nummerGetoond);
    if (eigen.teksten) {
      Object.keys(basis.teksten).forEach(function (k) {
        if (eigen.teksten[k]) basis.teksten[k] = String(eigen.teksten[k]);
      });
    }
    if (Array.isArray(eigen.werk)) basis.werk = eigen.werk;
    if (Array.isArray(eigen.diensten)) basis.diensten = eigen.diensten;
    if (Array.isArray(eigen.werkwijze)) basis.werkwijze = eigen.werkwijze;
    if (Array.isArray(eigen.faq)) basis.faq = eigen.faq;
    if (Array.isArray(eigen.tarieven) && eigen.tarieven.length) basis.tarieven = eigen.tarieven;
    return basis;
  } catch (e) {
    return basis;
  }
}

/* Hoe de teksten in het beheer gegroepeerd en genoemd worden. */
var TEKSTVELDEN = [
  { groep: 'Bovenaan', velden: [
    ['heroLabel', 'Klein labeltje bovenaan', 'kort'],
    ['titel', 'De grote titel', 'lang'],
    ['lead', 'Tekst onder de titel', 'lang'],
    ['knopA', 'Tekst op de paarse knop', 'kort'],
    ['knopB', 'Tekst op de tweede knop', 'kort'],
    ['levering', 'Levertijd', 'kort'],
    ['revisies', 'Revisies', 'kort'],
    ['boekenVia', 'Boeken via', 'kort'],
    ['marquee', 'Woorden in de lopende band', 'lang']
  ]},
  { groep: 'Werk', velden: [
    ['werkLabel', 'Labeltje', 'kort'],
    ['werkTitel', 'Titel', 'kort'],
    ['werkLead', 'Tekst eronder', 'lang'],
    ['werkNoot', 'Regel onder de voorbeelden', 'lang']
  ]},
  { groep: 'Diensten', velden: [
    ['dienstenLabel', 'Labeltje', 'kort'],
    ['dienstenTitel', 'Titel', 'kort']
  ]},
  { groep: 'Werkwijze', velden: [
    ['werkwijzeLabel', 'Labeltje', 'kort'],
    ['werkwijzeTitel', 'Titel', 'kort']
  ]},
  { groep: 'Tarieven', velden: [
    ['tarievenLabel', 'Labeltje', 'kort'],
    ['tarievenTitel', 'Titel', 'kort'],
    ['tarievenLead', 'Tekst eronder', 'lang'],
    ['tarievenNoot', 'Regel onder de prijzen', 'lang']
  ]},
  { groep: 'Aanvraag', velden: [
    ['aanvraagLabel', 'Labeltje', 'kort'],
    ['aanvraagTitel', 'Titel', 'kort'],
    ['aanvraagLead', 'Tekst eronder', 'lang']
  ]},
  { groep: 'Vragen', velden: [
    ['faqLabel', 'Labeltje', 'kort'],
    ['faqTitel', 'Titel', 'kort']
  ]},
  { groep: 'Onderaan', velden: [
    ['slotTitel', 'Slottitel', 'lang'],
    ['slotKnop', 'Tekst op de knop', 'kort'],
    ['voetLijn', 'Regel onder het logo', 'lang'],
    ['voetKlein', 'Kleine regel bij het nummer', 'kort']
  ]}
];
