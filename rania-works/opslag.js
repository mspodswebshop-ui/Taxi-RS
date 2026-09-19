/* ==========================================================================
   Rania Works — bestanden in de browser
   --------------------------------------------------------------------------
   Video's en foto's zijn te groot voor de gewone opslag van een browser.
   Ze gaan daarom in IndexedDB: een kast in je browser waar grote bestanden
   in passen.

   Wat je in het beheer uploadt, komt hier terecht onder een pad zoals
   "werk/reel.mp4". De site zoekt dat pad eerst in deze kast; vindt ze niets,
   dan gebruikt ze het pad gewoon zoals het er staat — zo werkt het ook als
   je de site online hebt staan, waar het bestand echt naast de pagina ligt.

   Let op: deze kast hoort bij dit ene toestel en deze ene browser. De
   downloadknop in het beheer stopt alle bestanden mee in de zip, en die zet
   je op je webhosting.
   ========================================================================== */

var BESTANDEN_KAST = 'raniaworks-bestanden';
var BESTANDEN_VAK = 'bestanden';

/* Sommige browsers laten niet eens toe dát je het vraagt: dan geeft het
   uitlezen van window.indexedDB zelf al een fout. Vandaar deze omweg. */
function opslagKan() {
  try { return !!window.indexedDB; } catch (e) { return false; }
}

/* De kast openen (en de eerste keer aanmaken). */
function kastOpenen() {
  return new Promise(function (klaar, mis) {
    if (!opslagKan()) { mis(new Error('Deze browser bewaart geen bestanden.')); return; }
    var poging = window.indexedDB.open(BESTANDEN_KAST, 1);
    poging.onupgradeneeded = function () {
      if (!poging.result.objectStoreNames.contains(BESTANDEN_VAK)) {
        poging.result.createObjectStore(BESTANDEN_VAK);
      }
    };
    poging.onsuccess = function () { klaar(poging.result); };
    poging.onerror = function () { mis(poging.error); };
  });
}

function metVak(soort, doe) {
  return kastOpenen().then(function (kast) {
    return new Promise(function (klaar, mis) {
      var handeling = kast.transaction(BESTANDEN_VAK, soort);
      var vraag = doe(handeling.objectStore(BESTANDEN_VAK));
      vraag.onsuccess = function () { klaar(vraag.result); };
      vraag.onerror = function () { mis(vraag.error); };
      handeling.oncomplete = function () { kast.close(); };
    });
  });
}

/* Lukt de kast niet (privémodus, opslag uit, of een venster dat niets mag
   bewaren), dan houden we het bestand zolang in het geheugen. Je kan dan nog
   altijd je zip downloaden; sluit je het venster, dan is het weg. */
var SESSIEBESTANDEN = {};

/* Een bestand bewaren onder een pad, bijvoorbeeld "werk/reel.mp4".
   Levert { blijvend: true } als het de kast in ging. */
function bestandOpslaan(pad, blob) {
  return metVak('readwrite', function (vak) { return vak.put(blob, pad); })
    .then(function () {
      delete SESSIEBESTANDEN[pad];
      return { blijvend: true };
    })
    .catch(function () {
      SESSIEBESTANDEN[pad] = blob;
      return { blijvend: false };
    });
}

/* Een bestand terughalen. Levert null als het er niet is. */
function bestandOphalen(pad) {
  if (SESSIEBESTANDEN[pad]) return Promise.resolve(SESSIEBESTANDEN[pad]);
  return metVak('readonly', function (vak) { return vak.get(pad); })
    .then(function (r) { return r || null; })
    .catch(function () { return null; });
}

function bestandWissen(pad) {
  delete SESSIEBESTANDEN[pad];
  return metVak('readwrite', function (vak) { return vak['delete'](pad); })
    .catch(function () { return null; });
}

/* Alle paden, met hun grootte en soort — uit de kast én uit het geheugen. */
function bestandenLijst() {
  var uitGeheugen = Object.keys(SESSIEBESTANDEN).map(function (pad) {
    return { pad: pad, grootte: SESSIEBESTANDEN[pad].size,
             soort: SESSIEBESTANDEN[pad].type, blijvend: false };
  });

  return metVak('readonly', function (vak) { return vak.getAllKeys(); })
    .then(function (paden) {
      return Promise.all((paden || []).map(function (pad) {
        return bestandOphalen(pad).then(function (blob) {
          return { pad: pad, grootte: blob ? blob.size : 0,
                   soort: blob ? blob.type : '', blijvend: true };
        });
      }));
    })
    .then(function (uitKast) {
      var alles = uitKast.concat(uitGeheugen.filter(function (b) {
        return !uitKast.some(function (k) { return k.pad === b.pad; });
      }));
      return alles;
    })
    .catch(function () { return uitGeheugen; });
}

/* Is een bestand een video of een afbeelding? */
function isVideo(soort, pad) {
  return /^video\//.test(soort || '') || /\.(mp4|webm|ogv|mov|m4v)$/i.test(pad || '');
}

/* Is dit een pad in onze eigen kast, of een adres op het internet? */
function eigenBestand(pad) {
  return !!pad && !/^(https?:)?\/\//i.test(pad) && !/^data:/i.test(pad);
}

/* Een bestandsnaam die overal werkt: kleine letters, geen spaties of
   rare tekens. */
function veiligePadnaam(naam) {
  var schoon = String(naam).toLowerCase()
    .replace(/[^a-z0-9.\-_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return 'werk/' + (schoon || 'bestand');
}

/* 1536000 wordt "1,5 MB". */
function grootteInTekst(bytes) {
  if (!bytes) return '0 B';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' kB';
  return (Math.round(bytes / 1024 / 1024 * 10) / 10).toString().replace('.', ',') + ' MB';
}
