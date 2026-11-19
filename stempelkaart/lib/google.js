/**
 * Google Wallet.
 *
 * Google werkt met een "klasse" (het programma: naam, logo, kleur) en per
 * klant een "object" (de kaart zelf: stempels, QR-code). De knop "Toevoegen
 * aan Google Wallet" is een link met een ondertekend JWT erin; daarin zit de
 * hele kaart, en Google maakt hem aan zodra de klant op Opslaan tikt.
 *
 * Krijgt de klant een stempel, dan passen we het object aan via de Google
 * Wallet API. Google zet de wijziging zelf door naar de telefoon.
 *
 * Ondertekenen gebeurt met de sleutel van een Google-serviceaccount, met
 * alleen de ingebouwde crypto van Node.
 */

import crypto from "node:crypto";
import { leesGeheim } from "./geheimen.js";

const API = "https://walletobjects.googleapis.com/walletobjects/v1";
const SCOPE = "https://www.googleapis.com/auth/wallet_object.issuer";

const b64url = (data) => Buffer.from(data).toString("base64url");

function onderteken(payload, sleutel, sleutelId) {
  const kop = { alg: "RS256", typ: "JWT", ...(sleutelId ? { kid: sleutelId } : {}) };
  const ongetekend = `${b64url(JSON.stringify(kop))}.${b64url(JSON.stringify(payload))}`;
  const handtekening = crypto.sign("RSA-SHA256", Buffer.from(ongetekend), sleutel);
  return `${ongetekend}.${handtekening.toString("base64url")}`;
}

export function maakGoogle(instellingen) {
  const issuerId = (process.env.GOOGLE_ISSUER_ID || "").trim();
  let account = null;
  let fout = null;
  try {
    const json = leesGeheim("GOOGLE_SERVICE_ACCOUNT");
    if (json) {
      account = JSON.parse(json);
      if (!account.client_email || !account.private_key) {
        throw new Error("GOOGLE_SERVICE_ACCOUNT mist client_email of private_key.");
      }
    }
  } catch (err) {
    fout = `Google-serviceaccount onleesbaar: ${err.message}`;
    account = null;
  }

  const ingesteld = Boolean(issuerId && account);
  // Alleen letters, cijfers, punt, liggend en gewoon streepje zijn toegestaan.
  const klasseId = `${issuerId}.${(process.env.GOOGLE_CLASS_SUFFIX || "stempelkaart").replace(/[^\w.-]/g, "_")}`;
  const objectId = (kaart) => `${issuerId}.${kaart.id.replace(/[^\w.-]/g, "_")}`;

  /* ---------- Toegangssleutel voor de API, een uur geldig ---------- */

  let toegang = { token: null, tot: 0 };

  async function toegangsToken() {
    if (toegang.token && Date.now() < toegang.tot - 60_000) return toegang.token;
    const nu = Math.floor(Date.now() / 1000);
    const bewering = onderteken(
      {
        iss: account.client_email,
        scope: SCOPE,
        aud: "https://oauth2.googleapis.com/token",
        iat: nu,
        exp: nu + 3600,
      },
      account.private_key,
      account.private_key_id,
    );
    const antwoord = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: bewering,
      }),
    });
    const data = await antwoord.json().catch(() => ({}));
    if (!antwoord.ok) {
      throw new Error(`Google weigerde de serviceaccount: ${data.error_description || data.error || antwoord.status}`);
    }
    toegang = { token: data.access_token, tot: Date.now() + data.expires_in * 1000 };
    return toegang.token;
  }

  async function api(methode, pad, body) {
    const antwoord = await fetch(`${API}${pad}`, {
      method: methode,
      headers: {
        authorization: `Bearer ${await toegangsToken()}`,
        "content-type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await antwoord.json().catch(() => ({}));
    return { status: antwoord.status, ok: antwoord.ok, data };
  }

  /* ---------- Hoe de kaart eruitziet ---------- */

  function klasse() {
    const { bedrijf, baseUrl, beloning, nodig } = instellingen;
    return {
      id: klasseId,
      issuerName: bedrijf,
      programName: "Stempelkaart",
      programLogo: {
        sourceUri: { uri: `${baseUrl}/logo.png` },
        contentDescription: { defaultValue: { language: "nl", value: `Logo ${bedrijf}` } },
      },
      hexBackgroundColor: "#111110",
      reviewStatus: "UNDER_REVIEW",
      rewardsTier: `${nodig} ritten = ${beloning.toLowerCase()}`,
      countryCode: "BE",
      multipleDevicesAndHoldersAllowedStatus: "ONE_USER_ALL_DEVICES",
    };
  }

  function object(kaart) {
    const { nodig, beloning, baseUrl, telefoon } = instellingen;
    const url = `${baseUrl}/k/${kaart.id}`;
    const tekst = [
      {
        id: "uitleg",
        header: "Zo werkt het",
        body: `Laat deze kaart scannen bij elke rit. Na ${nodig} stempels is je volgende rit: ${beloning.toLowerCase()}.`,
      },
    ];
    if (telefoon) tekst.push({ id: "bel", header: "Taxi bestellen", body: telefoon });
    if (instellingen.voorwaarden) {
      tekst.push({ id: "voorwaarden", header: "Voorwaarden", body: instellingen.voorwaarden });
    }

    return {
      id: objectId(kaart),
      classId: klasseId,
      state: "ACTIVE",
      accountId: kaart.code,
      accountName: kaart.naam,
      loyaltyPoints: {
        label: "Stempels",
        balance: { string: `${kaart.stempels}/${nodig}` },
      },
      secondaryLoyaltyPoints: {
        label: "Tegoed",
        balance: { string: kaart.tegoed > 0 ? `${kaart.tegoed} × ${beloning}` : "—" },
      },
      barcode: { type: "QR_CODE", value: url, alternateText: kaart.code },
      // Dezelfde strook met stempels als op de iPhone. Het versienummer in de
      // link dwingt Google om het nieuwe plaatje op te halen.
      heroImage: {
        sourceUri: { uri: `${baseUrl}/api/kaarten/${kaart.id}/strook.png?v=${kaart.stempels}-${kaart.tegoed}` },
        contentDescription: {
          defaultValue: { language: "nl", value: `${kaart.stempels} van ${nodig} stempels` },
        },
      },
      textModulesData: tekst,
      linksModuleData: {
        uris: [{ uri: url, description: "Je kaart online", id: "kaart" }],
      },
    };
  }

  /* ---------- Wat de server ermee doet ---------- */

  let klasseKlaar = false;

  /** Zorgt dat het programma bestaat bij Google, en houdt het bij. */
  async function zorgVoorKlasse() {
    if (klasseKlaar) return;
    const bestaand = await api("GET", `/loyaltyClass/${klasseId}`);
    if (bestaand.status === 404) {
      const r = await api("POST", "/loyaltyClass", klasse());
      if (!r.ok) throw new Error(`Google-klasse aanmaken mislukt: ${r.data?.error?.message || r.status}`);
    } else if (bestaand.ok) {
      const r = await api("PATCH", `/loyaltyClass/${klasseId}`, klasse());
      if (!r.ok) console.warn("Google-klasse bijwerken mislukt:", r.data?.error?.message || r.status);
    } else {
      throw new Error(`Google Wallet API: ${bestaand.data?.error?.message || bestaand.status}`);
    }
    klasseKlaar = true;
  }

  /** De link achter de knop "Toevoegen aan Google Wallet". */
  async function opslaanLink(kaart) {
    if (!ingesteld) throw new Error("Google Wallet is nog niet ingesteld.");
    await zorgVoorKlasse();
    const jwt = onderteken(
      {
        iss: account.client_email,
        aud: "google",
        typ: "savetowallet",
        iat: Math.floor(Date.now() / 1000),
        origins: [instellingen.baseUrl],
        payload: { loyaltyObjects: [object(kaart)] },
      },
      account.private_key,
      account.private_key_id,
    );
    return `https://pay.google.com/gp/v/save/${jwt}`;
  }

  /**
   * Zet de nieuwe stand door. Heeft de klant de kaart (nog) niet in Google
   * Wallet bewaard, dan bestaat het object niet en is er niets te doen.
   */
  async function werkBij(kaart) {
    if (!ingesteld) return;
    const r = await api("PUT", `/loyaltyObject/${objectId(kaart)}`, object(kaart));
    if (r.status === 404) return;
    if (!r.ok) throw new Error(r.data?.error?.message || `status ${r.status}`);
  }

  return { ingesteld, fout, opslaanLink, werkBij, zorgVoorKlasse, _object: object, _klasse: klasse };
}
