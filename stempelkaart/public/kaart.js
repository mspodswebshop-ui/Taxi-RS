const $ = (id) => document.getElementById(id);
const id = decodeURIComponent(location.pathname.split("/").pop());

const VINK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
const STER = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2.5l2.9 6.2 6.6.8-4.9 4.6 1.3 6.6L12 17.4l-5.9 3.3 1.3-6.6-4.9-4.6 6.6-.8z"/></svg>';

const tijd = (iso) =>
  new Date(iso).toLocaleString("nl-BE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

let config;
let vorigeStempels = null;

function toon(kaart) {
  $("naam").textContent = kaart.naam;
  $("teller").textContent = `${kaart.stempels}/${kaart.nodig}`;
  $("code").textContent = kaart.code;
  $("uitleg").textContent = `${kaart.nodig} stempels = ${kaart.beloning.toLowerCase()}`;

  const vakjes = [];
  for (let i = 0; i < kaart.nodig; i++) {
    const vol = i < kaart.stempels;
    const laatste = i === kaart.nodig - 1;
    const nieuw = vol && vorigeStempels !== null && i >= vorigeStempels;
    const klas = ["stempel", vol ? "vol" : laatste ? "ster" : "", nieuw ? "nieuw" : ""].join(" ");
    vakjes.push(`<div class="${klas}" aria-hidden="true">${vol ? VINK : laatste ? STER : ""}</div>`);
  }
  $("stempels").innerHTML = vakjes.join("");
  $("stempels").setAttribute("aria-label", `${kaart.stempels} van ${kaart.nodig} stempels`);
  vorigeStempels = kaart.stempels;

  $("tegoed").hidden = kaart.tegoed < 1;
  $("tegoed").textContent =
    kaart.tegoed === 1
      ? `Je hebt een ${kaart.beloning.toLowerCase()} tegoed!`
      : `Je hebt ${kaart.tegoed} × ${kaart.beloning.toLowerCase()} tegoed!`;

  if (kaart.geschiedenis) {
    $("inwisselBtn").hidden = kaart.tegoed < 1;
    $("historie").innerHTML = kaart.geschiedenis
      .map((g) => `<li><span>${g.soort}</span><span>${tijd(g.op)}</span></li>`)
      .join("") || '<li class="muted">Nog niets.</li>';
  }
}

async function laad() {
  const r = await fetch(`/api/kaarten/${encodeURIComponent(id)}`);
  const data = await r.json();
  if (!r.ok) throw new Error(data.error || "Kaart niet gevonden.");
  return data;
}

async function actie(pad, body = {}) {
  $("chauffeurFout").textContent = "";
  $("melding").hidden = true;
  const r = await fetch(`/api/kaarten/${encodeURIComponent(id)}/${pad}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await r.json();
  if (r.status === 409 && data.dubbel) {
    if (confirm(data.error)) return actie(pad, { ...body, toch: true });
    return null;
  }
  if (!r.ok) {
    $("chauffeurFout").textContent = data.error || "Er ging iets mis.";
    return null;
  }
  toon(data);
  return data;
}

function meld(tekst, feest = false) {
  $("melding").textContent = tekst;
  $("melding").classList.toggle("feest", feest);
  $("melding").hidden = false;
}

try {
  config = await fetch("/api/config").then((r) => r.json());
  document.querySelectorAll(".bedrijf").forEach((el) => (el.textContent = config.bedrijf));
  const kaart = await laad();
  toon(kaart);
  $("inhoud").hidden = false;
  document.title = `Stempelkaart — ${config.bedrijf}`;

  $("qr").src = `/api/kaarten/${encodeURIComponent(id)}/qr.svg`;

  // Wallet-knoppen: de knop van het eigen toestel bovenaan.
  const ua = navigator.userAgent;
  const iphone = /iPhone|iPad|iPod|Macintosh/.test(ua) && !/Android/.test(ua);
  if (config.apple) {
    $("appleBtn").hidden = false;
    $("appleBtn").href = `/api/kaarten/${encodeURIComponent(id)}/apple.pkpass`;
  }
  if (config.google) {
    $("googleBtn").hidden = false;
    $("googleBtn").href = `/api/kaarten/${encodeURIComponent(id)}/google`;
  }
  if (!iphone) $("wallet").prepend($("googleBtn"));
  $("geenWallet").hidden = config.apple || config.google;

  if (config.chauffeur) {
    $("chauffeur").hidden = false;
    $("chauffeurLink").hidden = false;
    $("klant").hidden = true;

    $("stempelBtn").addEventListener("click", async () => {
      $("stempelBtn").disabled = true;
      const k = await actie("stempel").finally(() => ($("stempelBtn").disabled = false));
      if (!k) return;
      if (navigator.vibrate) navigator.vibrate(60);
      if (k.beloningErbij) meld(`Kaart vol! ${k.naam} heeft nu een ${k.beloning.toLowerCase()} tegoed.`, true);
      else meld(`Stempel gezet. Nog ${k.nodig - k.stempels} te gaan.`);
    });
    $("inwisselBtn").addEventListener("click", async () => {
      if (!confirm(`${config.beloning} inwisselen voor deze rit?`)) return;
      const k = await actie("inwisselen");
      if (k) meld(`${config.beloning} ingewisseld.`);
    });
    $("correctieBtn").addEventListener("click", async () => {
      if (!confirm("De laatste stempel weghalen?")) return;
      const k = await actie("correctie");
      if (k) meld("Stempel weggehaald.");
    });
  } else {
    try { localStorage.setItem("stempelkaart", id); } catch {}
    // Ververs af en toe, zodat de klant zijn stempel ziet verschijnen.
    setInterval(async () => {
      if (document.hidden) return;
      try { toon(await laad()); } catch {}
    }, 15000);
  }
} catch (err) {
  $("laadFout").hidden = false;
  $("laadFout").textContent = err.message;
}
