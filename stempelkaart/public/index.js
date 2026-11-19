const $ = (id) => document.getElementById(id);

function onthouden() {
  try { return localStorage.getItem("stempelkaart"); } catch { return null; }
}

const config = await fetch("/api/config").then((r) => r.json());
document.querySelectorAll(".bedrijf").forEach((el) => (el.textContent = config.bedrijf));
$("nodig").textContent = config.nodig;
$("beloning").textContent = config.beloning.toLowerCase();
$("beloningTitel").textContent = config.beloning.toLowerCase();
document.title = `Stempelkaart — ${config.bedrijf}`;

const eerder = onthouden();
if (eerder) {
  $("bestaand").hidden = false;
  $("naarKaart").href = `/k/${encodeURIComponent(eerder)}`;
}

$("aanmelden").addEventListener("submit", async (e) => {
  e.preventDefault();
  $("fout").textContent = "";
  $("maakBtn").disabled = true;
  try {
    const r = await fetch("/api/kaarten", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ naam: $("naam").value, telefoon: $("telefoon").value }),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error || "Er ging iets mis.");
    // Een chauffeur die kaarten voor klanten maakt, moet zijn eigen telefoon
    // niet aan die klant koppelen.
    if (!config.chauffeur) {
      try { localStorage.setItem("stempelkaart", data.id); } catch {}
    }
    location.href = `/k/${data.id}?nieuw=1`;
  } catch (err) {
    $("fout").textContent = err.message;
    $("maakBtn").disabled = false;
  }
});
