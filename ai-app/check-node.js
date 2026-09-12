// Deze module wordt als allereerste geimporteerd door server.js, zodat de
// controle draait voordat Express of de SDK geladen wordt. (Een controle
// midden in server.js zou te laat komen: import-regels worden door
// JavaScript naar boven gehaald en dus eerder uitgevoerd.)
const MINIMUM = 20;
const major = Number(process.versions.node.split(".")[0]);

if (major < MINIMUM) {
  console.error(
    `\nJe gebruikt Node ${process.versions.node}, maar deze app heeft Node ` +
      `${MINIMUM} of nieuwer nodig.\n` +
      `Download de nieuwste versie op https://nodejs.org en probeer het daarna opnieuw.\n`,
  );
  process.exit(1);
}
