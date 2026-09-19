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

  /* Losse teksten die je wil kunnen bijsturen.
     In de titel wordt alles tussen *sterretjes* paars en cursief. */
  teksten: {
    titel: 'Edits die mensen *doen stoppen* met scrollen.',
    lead: 'Ik ben Rania. Jij stuurt je ruwe beelden, ik maak er iets van dat past bij jouw merk of bij jou. Voor bedrijven, voor creators, en voor die ene video die gewoon goed moet zijn.',
    levering: '2–5 dagen',
    revisies: 'Inbegrepen'
  },

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
    if (Array.isArray(eigen.faq)) basis.faq = eigen.faq;
    if (Array.isArray(eigen.tarieven) && eigen.tarieven.length) basis.tarieven = eigen.tarieven;
    return basis;
  } catch (e) {
    return basis;
  }
}
