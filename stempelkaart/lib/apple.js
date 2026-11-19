/**
 * Apple Wallet.
 *
 * Een Apple-pas is een zip-bestand (.pkpass) met een pass.json, plaatjes en
 * een handtekening met jouw Pass Type ID-certificaat. Zonder geldige
 * handtekening weigert de iPhone de pas, dus dit werkt pas als de
 * certificaten in .env staan (zie README, stap "Apple Wallet").
 *
 * Bijwerken: bij het toevoegen meldt de iPhone zich bij deze server
 * (webServiceURL). Krijgt de klant een stempel, dan sturen we via Apple (APNs)
 * een leeg duwtje; de iPhone haalt daarop zelf de nieuwe pas op.
 */

import http2 from "node:http2";
import { PKPass } from "passkit-generator";
import { leesGeheim } from "./geheimen.js";
import { applePlaatjes } from "./afbeeldingen.js";

export function maakApple(instellingen) {
  const passTypeId = process.env.APPLE_PASS_TYPE_ID;
  const teamId = process.env.APPLE_TEAM_ID;

  let certificaten = null;
  let fout = null;
  try {
    const wwdr = leesGeheim("APPLE_WWDR_CERT");
    const signerCert = leesGeheim("APPLE_SIGNER_CERT");
    const signerKey = leesGeheim("APPLE_SIGNER_KEY");
    if (passTypeId && teamId && wwdr && signerCert && signerKey) {
      certificaten = {
        wwdr,
        signerCert,
        signerKey,
        signerKeyPassphrase: process.env.APPLE_SIGNER_KEY_PASSPHRASE || undefined,
      };
    }
  } catch (err) {
    fout = err.message;
  }

  // Apple wil de webservice alleen via https. Lokaal (http) laten we hem weg;
  // de pas werkt dan wel, maar werkt zichzelf niet bij.
  const webServiceURL = instellingen.baseUrl.startsWith("https://")
    ? `${instellingen.baseUrl}/apple`
    : null;

  function passJson(kaart) {
    const { nodig, beloning, bedrijf, telefoon } = instellingen;
    const url = `${instellingen.baseUrl}/k/${kaart.id}`;

    const achterkant = [
      {
        key: "uitleg",
        label: "Zo werkt het",
        value:
          `Laat deze kaart scannen bij elke rit. Na ${nodig} stempels is je ` +
          `volgende rit: ${beloning.toLowerCase()}.`,
      },
      { key: "code", label: "Kaartcode", value: kaart.code },
      { key: "link", label: "Je kaart online", value: url },
    ];
    if (telefoon) {
      achterkant.push({ key: "bel", label: "Taxi bestellen", value: telefoon });
    }
    if (instellingen.voorwaarden) {
      achterkant.push({ key: "voorwaarden", label: "Voorwaarden", value: instellingen.voorwaarden });
    }

    return {
      formatVersion: 1,
      passTypeIdentifier: passTypeId,
      teamIdentifier: teamId,
      serialNumber: kaart.id,
      organizationName: bedrijf,
      description: `Stempelkaart ${bedrijf}`,
      logoText: bedrijf,
      foregroundColor: "rgb(255, 255, 255)",
      labelColor: "rgb(255, 204, 0)",
      backgroundColor: "rgb(17, 17, 16)",
      sharingProhibited: true,
      ...(webServiceURL
        ? { webServiceURL, authenticationToken: kaart.appleToken }
        : {}),
      barcodes: [
        {
          format: "PKBarcodeFormatQR",
          message: url,
          messageEncoding: "iso-8859-1",
          altText: kaart.code,
        },
      ],
      storeCard: {
        headerFields: [
          {
            key: "stempels",
            label: "STEMPELS",
            value: `${kaart.stempels}/${nodig}`,
            changeMessage: "Stempel erbij! Je hebt er nu %@.",
          },
        ],
        secondaryFields: [
          { key: "naam", label: "NAAM", value: kaart.naam },
          {
            key: "tegoed",
            label: "TEGOED",
            value: kaart.tegoed > 0 ? `${kaart.tegoed} × ${beloning}` : "—",
            changeMessage: "Gefeliciteerd! Je hebt nu %@.",
            textAlignment: "PKTextAlignmentRight",
          },
        ],
        backFields: achterkant,
      },
    };
  }

  async function maakPas(kaart) {
    if (!certificaten) throw new Error("Apple Wallet is nog niet ingesteld.");
    const bestanden = {
      "pass.json": Buffer.from(JSON.stringify(passJson(kaart))),
      ...applePlaatjes(kaart.stempels, instellingen.nodig),
    };
    const pas = new PKPass(bestanden, certificaten);
    return pas.getAsBuffer();
  }

  /**
   * Stuurt een leeg duwtje naar elke iPhone met deze kaart. Apple zegt welke
   * tokens niet meer geldig zijn; die geven we terug zodat ze weg kunnen.
   */
  async function duw(pushTokens) {
    if (!certificaten || pushTokens.length === 0) return [];
    const sessie = http2.connect("https://api.push.apple.com", {
      cert: certificaten.signerCert,
      key: certificaten.signerKey,
      passphrase: certificaten.signerKeyPassphrase,
    });
    sessie.on("error", (err) => console.error("APNs-verbinding:", err.message));

    const verlopen = [];
    try {
      await Promise.all(
        pushTokens.map(
          (token) =>
            new Promise((klaar) => {
              const verzoek = sessie.request({
                ":method": "POST",
                ":path": `/3/device/${token}`,
                "apns-topic": passTypeId,
                "content-type": "application/json",
              });
              let status = 0;
              verzoek.on("response", (h) => (status = h[":status"]));
              verzoek.on("data", () => {});
              verzoek.on("end", () => {
                if (status === 410) verlopen.push(token);
                else if (status !== 200) console.warn(`APNs gaf status ${status}.`);
                klaar();
              });
              verzoek.on("error", (err) => {
                console.error("APNs-melding mislukt:", err.message);
                klaar();
              });
              verzoek.setTimeout(10_000, () => verzoek.close());
              verzoek.end("{}");
            }),
        ),
      );
    } finally {
      sessie.close();
    }
    return verlopen;
  }

  return {
    ingesteld: Boolean(certificaten),
    fout,
    passTypeId,
    webServiceURL,
    maakPas,
    duw,
  };
}
