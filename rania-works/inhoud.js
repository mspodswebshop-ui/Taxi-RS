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

  /* Losse teksten die je wil kunnen bijsturen. */
  teksten: {
    lead: 'Ik ben Rania. Jij stuurt je ruwe beelden, ik maak er iets van dat past bij jouw merk of bij jou. Voor bedrijven, voor creators, en voor die ene video die gewoon goed moet zijn.',
    levering: '2–5 dagen',
    revisies: 'Inbegrepen'
  },

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
    if (Array.isArray(eigen.tarieven) && eigen.tarieven.length) basis.tarieven = eigen.tarieven;
    return basis;
  } catch (e) {
    return basis;
  }
}
