const $ = (id) => document.getElementById(id);

const config = await fetch("/api/config").then((r) => r.json());
document.querySelectorAll(".bedrijf").forEach((el) => (el.textContent = config.bedrijf));

if (!config.chauffeurAan) $("uit").hidden = false;
else if (!config.chauffeur) $("login").hidden = false;
else start();

$("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  $("loginFout").textContent = "";
  const r = await fetch("/api/chauffeur/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ pin: $("pin").value }),
  });
  const data = await r.json();
  if (!r.ok) {
    $("loginFout").textContent = data.error;
    return;
  }
  location.reload();
});

$("uitloggen").addEventListener("click", async () => {
  await fetch("/api/chauffeur/logout", { method: "POST" });
  location.reload();
});

function rij(k) {
  const li = document.createElement("li");
  const a = document.createElement("a");
  a.href = `/k/${encodeURIComponent(k.id)}`;
  const links = document.createElement("span");
  links.textContent = k.naam;
  if (k.tegoed > 0) {
    const b = document.createElement("span");
    b.className = "badge";
    b.textContent = `${k.tegoed} tegoed`;
    links.append(b);
  }
  const rechts = document.createElement("span");
  rechts.className = "rechts";
  rechts.textContent = `${k.stempels}/${k.nodig} · ${k.code}`;
  a.append(links, rechts);
  li.append(a);
  return li;
}

let wacht;
async function zoek() {
  const r = await fetch(`/api/chauffeur/kaarten?zoek=${encodeURIComponent($("zoek").value)}`);
  if (r.status === 401) return location.reload();
  const data = await r.json();
  $("lijst").replaceChildren(...data.kaarten.map(rij));
  $("totaal").textContent = `${data.totaal} ${data.totaal === 1 ? "kaart" : "kaarten"} in totaal.`;
}

function start() {
  $("binnen").hidden = false;
  $("uitloggen").hidden = false;
  $("zoek").addEventListener("input", () => {
    clearTimeout(wacht);
    wacht = setTimeout(zoek, 200);
  });
  zoek();
}
