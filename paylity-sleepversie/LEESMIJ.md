# Paylity — sleepversie

Voor het sleepvak van Netlify (app.netlify.com/drop), dat geen build uitvoert.
Daarom staat hier een **kant-en-klaar gebouwde** function naast een statische
pagina.

```bash
npm install
npm run zip      # → paylity-netlify.zip
```

`statisch/netlify/functions/api.js` is het resultaat van de bundelstap en wordt
daarom niet met de hand bewerkt; de bron is `src/api.js`.

Deze versie leest alleen: inloggen en je dashboard bekijken. Aanmaken,
afrekenen en terugbetalen zitten in de volledige Paylity in `../paylity`.

De verbindingsreeks komt uit de omgevingsvariabele `DATABASE_URL` bij Netlify
en komt nooit in de browser terecht.
