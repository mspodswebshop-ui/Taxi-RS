# Prestige Taxi Antwerpen — website met CMS (GitHub Pages)

De website van Prestige Taxi Antwerpen, met een beheer op **`/admin/`**. Alles
draait op GitHub: geen server, geen database, geen Netlify.

- Website: `https://mspodswebshop-ui.github.io/prestige-taxi-antwerpen/`
- Beheer: `https://mspodswebshop-ui.github.io/prestige-taxi-antwerpen/admin/`

## Hoe werkt het?

Het beheer laadt de pagina's van GitHub, jij past teksten en foto's aan, en
**Publiceren** zet alle wijzigingen in één keer terug op GitHub (één commit).
GitHub Pages zet de nieuwe versie daarna binnen ongeveer een minuut online.

Om op GitHub te mogen schrijven heeft het beheer een **GitHub-sleutel** (token)
nodig. Die staat **versleuteld** in `admin/config.json`; alleen met het
wachtwoord van het beheer kan hij ontsleuteld worden (PBKDF2 + AES-GCM, in de
browser). Wie de code bekijkt, kan de sleutel dus niet gebruiken.

## Eerste keer instellen

1. Maak een GitHub-sleutel: <https://github.com/settings/personal-access-tokens/new>
   - *Repository access:* **Only select repositories** → `prestige-taxi-antwerpen`
   - *Permissions → Repository permissions → Contents:* **Read and write**
   - Kies de langste geldigheid.
2. Open `…/admin/`, plak de sleutel, kies het wachtwoord voor het beheer en klik
   **Instellen**.

Daarna log je voortaan in met alleen het wachtwoord.

Sleutel verlopen of wachtwoord vergeten? Haal de regel `"token"` uit
`admin/config.json` weg (op GitHub zelf) en stel opnieuw in.

## Wat kan je in het beheer?

- **Teksten:** klik op een tekst in het voorbeeld en typ.
- **Foto's:** "Foto wijzigen": eigen foto (wordt verkleind) of AI-foto.
- **Reviews, prijzen en vragen:** "+ Kopie" of "Verwijder".
- **Instellingen:** telefoonnummer en e-mail (overal tegelijk), titel en
  omschrijving voor Google, back-up downloaden, uitloggen.

## Eigen domein

*Settings → Pages → Custom domain* in deze repository.
