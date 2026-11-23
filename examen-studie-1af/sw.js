/* Service worker Examen studie 1Af: offline werken en dagelijkse herinneringen. */
const VERSIE = "es1af-v3";
const BESTANDEN = ["./", "index.html", "app.js", "vragen.js", "leerstof.js", "manifest.webmanifest", "icon.svg", "icon-192.png", "icon-512.png", "icon-180.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(VERSIE).then(c => c.addAll(BESTANDEN)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSIE && k !== "es1af-state").map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin === location.origin) {
    // Eerst het netwerk (nieuwste versie), anders de offline kopie.
    e.respondWith(fetch(req).then(res => { const copy = res.clone(); caches.open(VERSIE).then(c => c.put(req, copy)); return res; }).catch(() => caches.match(req).then(r => r || caches.match("index.html"))));
  } else if (url.hostname.endsWith("fonts.googleapis.com") || url.hostname.endsWith("fonts.gstatic.com")) {
    e.respondWith(caches.match(req).then(r => r || fetch(req).then(res => { const copy = res.clone(); caches.open(VERSIE).then(c => c.put(req, copy)); return res; })));
  }
});

async function herinner() {
  const c = await caches.open("es1af-state");
  const res = await c.match("state.json"); if (!res) return;
  const s = await res.json(); if (!s.on) return;
  const now = new Date(), pad = x => String(x).padStart(2, "0");
  const t = now.getFullYear() + "-" + pad(now.getMonth() + 1) + "-" + pad(now.getDate());
  if (s.lastStudy === t || s.last === t) return;
  const [h, m] = (s.time || "16:30").split(":").map(Number);
  if (now.getHours() * 60 + now.getMinutes() < h * 60 + m) return;
  s.last = t; await c.put("state.json", new Response(JSON.stringify(s), { headers: { "content-type": "application/json" } }));
  const lijst = s.motivatie || ["Tijd om te studeren!"];
  await self.registration.showNotification(s.streak > 0 ? "Hou je reeks van " + s.streak + " dagen vol!" : "Tijd om te studeren!", { body: lijst[now.getDate() % lijst.length], icon: "icon-192.png", badge: "icon-192.png", tag: "studie" });
}
self.addEventListener("periodicsync", e => { if (e.tag === "studie-herinnering") e.waitUntil(herinner()); });
self.addEventListener("push", e => { e.waitUntil(herinner()); });
self.addEventListener("notificationclick", e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(list => {
    for (const w of list) if ("focus" in w) return w.focus();
    return self.clients.openWindow("./#vandaag");
  }));
});
