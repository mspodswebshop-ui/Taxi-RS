/* Dripp It — catalogus: categorieën, producten, prijzen en verzendkosten.
   Dit ene bestand wordt gebruikt door de website (assets/app.js) én door de
   betaalfunctie (netlify/functions/checkout.mjs). De betaalfunctie rekent het
   bedrag altijd opnieuw uit met de prijzen hieronder, nooit met wat de browser stuurt.
   Pas prijzen dus alleen hier aan. */
(function (root) {
  'use strict';

  /* ---------- Winkel ---------- */
  const SHOP = {
    currency: 'eur',
    country: 'BE',
    countryName: 'België',
    freeShipFrom: 250,   /* gratis verzending vanaf dit bedrag (euro) */
    shipping: 5.95,      /* verzendkosten binnen België (euro) */
    maxQty: 5            /* maximum per product per bestelling */
  };

  /* ---------- Categorieën ---------- */
  const CATS = {
    dames: {
      name: 'Dames', art: 'aurum', img: '',
      intro: 'Jurken, blazers, zijde en sieraden. Vrouwelijk, scherp en altijd met een gouden detail.'
    },
    heren: {
      name: 'Heren', art: 'molten', img: '',
      intro: 'Zware hoodies, bombers en cargo’s in onyx, wijnrood en cognac. Gemaakt om jaren te dragen.'
    },
    schoenen: {
      name: 'Schoenen', art: 'gild-runner', img: '',
      intro: 'Sneakers, boots, pumps en slides van echt leer, afgewerkt met verguld detail.'
    },
    elektronica: {
      name: 'Elektronica', art: 'halo-anc', img: '',
      intro: 'Koptelefoons, oordopjes, smartwatches en speakers in onyx en goud. Met 2 jaar garantie.'
    }
  };

  /* ---------- Producten ---------- */
  const DAMES = ['XS', 'S', 'M', 'L'];
  const HEREN = ['S', 'M', 'L', 'XL'];
  const PRODUCTS = [
    /* Dames */
    {
      id: 'aurum', name: 'Aurum Jurk', cat: 'dames', price: 389, shape: 'dress',
      color: '#D8C19A', colorName: 'Champagne', ed: 18, edMax: 150, left: 22, tag: 'Nieuw', featured: 1,
      sizes: DAMES, note: 'Valt soepel en normaal op maat. Verstelbare bandjes.',
      material: '100% moerbeizijde, zijden satijn',
      desc: 'Een slipdress in champagnekleurige zijde die beweegt als vloeibaar goud. Schuin van de draad gesneden, met een kleine gouden druppel op het decolleté.',
      details: ['Schuin van de draad gesneden', 'Verstelbare bandjes', 'Gouden druppel op het decolleté', 'Midi-lengte, 118 cm in maat S']
    },
    {
      id: 'nocturne', name: 'Nocturne Blazer', cat: 'dames', price: 459, shape: 'blazer',
      color: '#2A2227', colorName: 'Onyx', ed: 44, edMax: 150, left: 31, tag: 'Signature',
      sizes: DAMES, note: 'Getailleerd. Neem je normale maat.',
      material: 'Scheerwol met een voering van zijde',
      desc: 'Een scherp gesneden blazer in diep onyx, met vergulde knopen en een voering van wijnrode zijde.',
      details: ['Vergulde knopen met druppelreliëf', 'Wijnrode zijden voering', 'Gepaspelde zakken', 'Lichte schoudervulling']
    },
    {
      id: 'lumen', name: 'Lumen Zijden Top', cat: 'dames', price: 189, shape: 'top',
      color: '#EDE5D8', colorName: 'Ivoor', left: 48, tag: 'Nieuw',
      sizes: DAMES, note: 'Valt los. Neem je normale maat.',
      material: '100% moerbeizijde',
      desc: 'Een zijden top met fijne bandjes en een V-hals. Mooi onder de Nocturne Blazer of los op een warme avond.',
      details: ['Fijne verstelbare bandjes', 'Afgewerkt met gouden biesje', 'Licht uitlopend model', 'Gevoerd tot de borst']
    },
    {
      id: 'cascade', name: 'Cascade Plissérok', cat: 'dames', price: 229, shape: 'skirt',
      color: '#6B2236', colorName: 'Wijnrood', left: 27, tag: 'Collectie 01',
      sizes: DAMES, note: 'Elastische tailleband. Valt normaal op maat.',
      material: 'Satijn met vaste plissé',
      desc: 'Een midirok met scherpe plissé die bij elke stap opengaat. Elastische tailleband met een gouden druppel.',
      details: ['Plissé die in de was blijft zitten', 'Elastische tailleband', 'Midi-lengte, 80 cm', 'Gouden druppel op de band']
    },
    {
      id: 'vault', name: 'Vault Tote', cat: 'dames', price: 349, shape: 'bag',
      color: '#4A3A2C', colorName: 'Espresso', ed: 9, edMax: 100, left: 6, tag: 'Laatste stuks', hot: true,
      sizes: null, note: '38 × 34 × 14 cm. Past een 15-inch laptop.',
      material: 'Volnerf Italiaans leer, plantaardig gelooid',
      desc: 'Een gestructureerde tas van volnerf leer met een vergulde sluiting. Het leer kleurt met de jaren donkerder en mooier.',
      details: ['Vergulde magneetsluiting', 'Binnenvak met rits', 'Handgeschilderde randen', 'Oplage van 100 stuks']
    },
    {
      id: 'droplet', name: 'Droplet Hanger', cat: 'dames', price: 159, shape: 'pendant',
      color: '#CFAE6E', colorName: 'Verguld zilver', ed: 23, edMax: 100, left: 17, tag: 'Sieraad',
      sizes: ['45 cm', '55 cm'], sizeLabel: 'Lengte', note: 'Kies de lengte van de ketting.',
      material: '925 sterling zilver, 18k verguld',
      desc: 'De druppel uit ons logo als hanger. Massief zilver met een dikke laag 18 karaat goud, aan een fijne venetiaanse ketting.',
      details: ['925 sterling zilver', '3 micron 18k verguldsel', 'Gegraveerd met jouw nummer', 'Geleverd in een linnen etui']
    },

    /* Heren */
    {
      id: 'molten', name: 'Molten Hoodie', cat: 'heren', price: 289, shape: 'hoodie',
      color: '#2B2228', colorName: 'Onyx', ed: 37, edMax: 250, left: 41, tag: 'Signature', featured: 2,
      sizes: HEREN, note: 'Oversized. Neem je normale maat voor een ruime val.',
      material: '480 g/m² loopback katoen, 100% biologisch',
      desc: 'Onze signatuur. Een zware, oversized hoodie met dubbellaagse capuchon, vergulde koordeinden en drie gouden druppels die van de zoom lijken te lekken.',
      details: ['Dubbellaagse capuchon', 'Koordeinden van verguld messing', 'Kangoeroezak met verborgen naden', 'Drie druppels, geborduurd met 24k verguld garen']
    },
    {
      id: 'bordeaux', name: 'Bordeaux Bomber', cat: 'heren', price: 549, shape: 'jacket',
      color: '#6B2236', colorName: 'Wijnrood', ed: 219, edMax: 250, left: 11, tag: 'Laatste stuks', hot: true,
      sizes: HEREN, soldOut: ['XL'], note: 'Regular. Valt normaal op maat, iets kort in het lijf.',
      material: 'Zware duchesse-satijn met gewatteerde voering',
      desc: 'Een bomber in diep wijnrood satijn met een vergulde rits over de volle lengte. Binnenin een gewatteerde voering met het nummer van jouw exemplaar.',
      details: ['Vergulde rits', 'Gebreide boorden in onyx', 'Binnenzak met druppelvormige trekker', 'Voering met genummerd label']
    },
    {
      id: 'pour', name: 'Pour Cargo', cat: 'heren', price: 239, shape: 'pants',
      color: '#3A3236', colorName: 'Antraciet', left: 63, tag: 'Collectie 01',
      sizes: HEREN, note: 'Wijd met een tapse enkel. Neem je normale maat.',
      material: '340 g/m² katoenen twill',
      desc: 'Een wijde cargobroek in zware twill met platte zakken en twee gouden druppels aan de enkels. Strak genoeg voor de avond, ruim genoeg voor de dag.',
      details: ['Elastische tailleband met koord', 'Platte opgestikte zakken', 'Verstelbare enkels', 'Druppels aan beide pijpen']
    },
    {
      id: 'nectar', name: 'Nectar Overshirt', cat: 'heren', price: 319, shape: 'shirt',
      color: '#7A4E2D', colorName: 'Cognac', left: 27, tag: 'Collectie 01',
      sizes: HEREN, note: 'Ruim. Draag hem open als jasje of dicht als overhemd.',
      material: 'Wol-kasjmier flanel, 80/20',
      desc: 'Een warm overshirt in cognac flanel met vergulde drukknopen en twee borstzakken. Het jasje voor tussen de seizoenen.',
      details: ['Vergulde drukknopen', 'Twee borstzakken met klep', 'Afgeronde zoom', 'Gevoerde kraag']
    },
    {
      id: 'drop', name: 'Drop Tee', cat: 'heren', price: 129, shape: 'tee',
      color: '#D8C19A', colorName: 'Champagne', left: 96, tag: 'Basis',
      sizes: HEREN, note: 'Relaxed. Valt normaal op maat.',
      material: '260 g/m² gekamd jersey, 100% katoen',
      desc: 'Een stevig gebreid T-shirt met dichte ribkraag en één geborduurde druppel op de borst. Het basisstuk onder alles wat je draagt.',
      details: ['Ribkraag die zijn vorm houdt', 'Gouden druppel op de borst', 'Afgewerkt met zijsplitjes', 'Voorgekrompen, krimpt niet in de was']
    },
    {
      id: 'halo', name: 'Halo Cap', cat: 'heren', price: 89, shape: 'cap',
      color: '#1F191D', colorName: 'Onyx', left: 88, tag: 'Accessoire',
      sizes: null, note: 'Verstelbaar met een leren bandje en een gouden gesp.',
      material: 'Wolmix met vergulde knoop',
      desc: 'Een cap met zes panelen in onyx wol, met een gouden druppel op de voorkant en een vergulde knoop op de kruin.',
      details: ['Leren verstelbandje', 'Gesp van verguld messing', 'Gevoerd zweetbandje', 'Geborduurde druppel']
    },

    /* Schoenen */
    {
      id: 'gild-runner', name: 'Gild Runner', cat: 'schoenen', price: 279, shape: 'sneaker',
      color: '#EFE9DF', colorName: 'Wit leer', left: 64, tag: 'Bestseller', featured: 3,
      sizes: ['40', '41', '42', '43', '44', '45', '46'], note: 'Valt normaal. Twijfel je, neem dan een halve maat groter.',
      material: 'Volnerf kalfsleer met verguld hielstuk',
      desc: 'Een strakke sneaker van wit kalfsleer met een verguld hielstuk en een gouden druppel op de zijkant. Gestikt op een rubberen zool.',
      details: ['Volnerf kalfsleer', 'Verguld hielstuk', 'Leren binnenzool', 'Gestikte rubberen zool']
    },
    {
      id: 'onyx-chelsea', name: 'Onyx Chelsea Boot', cat: 'schoenen', price: 329, shape: 'boot',
      color: '#231C21', colorName: 'Onyx', left: 9, tag: 'Bijna op', hot: true,
      sizes: ['40', '41', '42', '43', '44', '45', '46'], soldOut: ['46'], note: 'Valt normaal op maat.',
      material: 'Geborsteld kalfsleer, Goodyear-gestikt',
      desc: 'Een chelsea boot van onyx leer met elastische zijpanden en een gouden lus aan de hiel. Te verzolen, dus gemaakt voor jaren.',
      details: ['Goodyear-gestikt, te verzolen', 'Elastische zijpanden', 'Gouden treklus', 'Leren zool met rubberen hak']
    },
    {
      id: 'aurelia', name: 'Aurelia Pump', cat: 'schoenen', price: 299, shape: 'heel',
      color: '#C9B08A', colorName: 'Champagne satijn', left: 19, tag: 'Dames',
      sizes: ['36', '37', '38', '39', '40', '41'], note: 'Hak van 9 cm. Valt normaal op maat.',
      material: 'Satijn met een leren binnenzool',
      desc: 'Een slanke pump in champagnekleurig satijn met een vergulde naaldhak van 9 centimeter.',
      details: ['Vergulde naaldhak, 9 cm', 'Gevoerd met lamsleer', 'Zachte binnenzool', 'Spitse neus']
    },
    {
      id: 'drip-slide', name: 'Drip Slide', cat: 'schoenen', price: 119, shape: 'slide',
      color: '#2B2228', colorName: 'Onyx', left: 102, tag: 'Unisex',
      sizes: ['38', '39', '40', '41', '42', '43', '44', '45', '46'], note: 'Valt normaal. Bij halve maten de grotere nemen.',
      material: 'Gewatteerd leer op een zool van kurk',
      desc: 'Een gewatteerde slipper met een brede band van zacht leer en een grote gouden druppel. Voor thuis, het strand en alles ertussen.',
      details: ['Gewatteerde leren band', 'Voetbed van kurk', 'Rubberen loopzool', 'Gouden druppel op de band']
    },
    {
      id: 'gilded-loafer', name: 'Gilded Loafer', cat: 'schoenen', price: 349, shape: 'loafer',
      color: '#5E1F30', colorName: 'Bordeaux leer', left: 23, tag: 'Heren',
      sizes: ['40', '41', '42', '43', '44', '45', '46'], note: 'Valt iets ruim. Twijfel je, neem dan een halve maat kleiner.',
      material: 'Gepolijst kalfsleer met leren zool',
      desc: 'Een klassieke loafer in bordeaux leer met een vergulde gesp over de wreef. Net zo goed op sneakersokken als in pak.',
      details: ['Vergulde gesp over de wreef', 'Leren zool met rubberen inzet', 'Gevoerd met kalfsleer', 'Met de hand gepolijst']
    },
    {
      id: 'riviera', name: 'Riviera Sandaal', cat: 'schoenen', price: 189, shape: 'sandal',
      color: '#D8C19A', colorName: 'Champagne en goud', left: 31, tag: 'Dames',
      sizes: ['36', '37', '38', '39', '40', '41'], note: 'Valt normaal op maat. Verstelbaar enkelbandje.',
      material: 'Gemetalliseerd leer op een leren voetbed',
      desc: 'Een platte sandaal met dunne gouden bandjes en een gesp om de enkel. Voor zomeravonden en vakanties aan zee.',
      details: ['Dunne bandjes van gemetalliseerd leer', 'Verstelbare enkelband', 'Zacht leren voetbed', 'Antislip loopzool']
    },

    /* Elektronica */
    {
      id: 'halo-anc', name: 'Halo Koptelefoon', cat: 'elektronica', price: 449, shape: 'headphones',
      color: '#2B2228', colorName: 'Onyx en goud', left: 35, tag: 'Nieuw', featured: 4,
      sizes: null, note: 'Inclusief leren opbergetui en USB-C-kabel.',
      material: 'Aluminium met oorkussens van lamsleer',
      desc: 'Een draadloze over-ear koptelefoon met actieve ruisonderdrukking, oorkussens van lamsleer en vergulde scharnieren.',
      details: ['Actieve ruisonderdrukking', 'Tot 40 uur batterij', 'Bluetooth 5.3 met multipoint', 'Snel laden: 10 minuten voor 5 uur']
    },
    {
      id: 'pearl', name: 'Pearl Oordopjes', cat: 'elektronica', price: 229, shape: 'buds',
      color: '#EDE5D8', colorName: 'Ivoor', left: 54, tag: 'Draadloos',
      sizes: null, note: 'Inclusief drie maten oordopjes en een USB-C-kabel.',
      material: 'Keramische afwerking met gouden accenten',
      desc: 'Kleine draadloze oordopjes in een ivoren case met een gouden scharnier. Ruisonderdrukking voor onderweg, helder geluid voor thuis.',
      details: ['Ruisonderdrukking', '8 uur luisteren, 32 uur met de case', 'Draadloos opladen', 'Spatwaterdicht (IPX4)']
    },
    {
      id: 'chrono', name: 'Chrono Smartwatch', cat: 'elektronica', price: 399, shape: 'watch',
      color: '#2B2228', colorName: 'Onyx leer', left: 8, tag: 'Bijna op', hot: true,
      sizes: null, note: 'Leren band van 22 mm, past polsen van 14 tot 20 cm.',
      material: 'Geborsteld staal, verguld, met leren band',
      desc: 'Een smartwatch met een vergulde kast en een band van onyx leer. Meldingen, hartslag en slaap, in een horloge dat eruitziet als een horloge.',
      details: ['AMOLED-scherm van 1,4 inch', 'Hartslag, slaap en stappen', 'Tot 7 dagen batterij', 'Werkt met iPhone en Android']
    },
    {
      id: 'vault-speaker', name: 'Vault Speaker', cat: 'elektronica', price: 349, shape: 'speaker',
      color: '#3A3236', colorName: 'Antraciet', left: 41, tag: 'Draagbaar',
      sizes: null, note: 'Inclusief USB-C-kabel en leren draaglus.',
      material: 'Geanodiseerd aluminium met stoffen grille',
      desc: 'Een draagbare speaker met 360° geluid, een gouden band en een leren draaglus. Klein genoeg voor onderweg, groot genoeg voor een feest.',
      details: ['360° geluid', 'Tot 20 uur batterij', 'Waterdicht (IP67)', 'Koppel twee speakers voor stereo']
    },
    {
      id: 'drip-case', name: 'Drip Telefoonhoes', cat: 'elektronica', price: 69, shape: 'phonecase',
      color: '#4A3A2C', colorName: 'Espresso leer', left: 140, tag: 'Leer',
      sizes: ['iPhone 15', 'iPhone 16', 'iPhone 16 Pro'], sizeLabel: 'Model', note: 'Werkt met MagSafe en draadloos opladen.',
      material: 'Volnerf leer met microvezel binnenkant',
      desc: 'Een slanke telefoonhoes van volnerf leer met het Dripp It-embleem in goud. Werkt met MagSafe en draadloos opladen.',
      details: ['Volnerf leer', 'MagSafe-compatibel', 'Verhoogde rand rond de camera', 'Embleem in reliëf met bladgoud']
    },
    {
      id: 'halo-pad', name: 'Halo Oplader', cat: 'elektronica', price: 119, shape: 'charger',
      color: '#2B2228', colorName: 'Onyx en goud', left: 76, tag: 'Draadloos',
      sizes: null, note: 'Inclusief USB-C-kabel en snellader van 20 W.',
      material: 'Aluminium met een bovenkant van leer',
      desc: 'Een draadloze oplader van aluminium en leer met een gouden ring. Leg je telefoon of oordopjes erop en hij laadt vanzelf.',
      details: ['Draadloos laden tot 15 W', 'Werkt met MagSafe en Qi2', 'Leren bovenkant met gouden ring', 'Zacht lampje dat ’s nachts uitgaat']
    }
  ];
  root.DRIPP_CATALOG = { SHOP, CATS, PRODUCTS };
})(typeof window !== 'undefined' ? window : globalThis);
