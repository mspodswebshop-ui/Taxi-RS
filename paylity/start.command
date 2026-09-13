#!/bin/bash
#
# Paylity starten.
#
# Op een Mac: dubbelklik dit bestand in Finder.
# Elders:     bash start.command
#
# Dit script doet alles wat nodig is en stopt met een duidelijke uitleg zodra
# er iets ontbreekt. Het installeert niets buiten deze map zonder het te zeggen.

cd "$(dirname "$0")" || exit 1

rood=$'\033[31m'; groen=$'\033[32m'; geel=$'\033[33m'; vet=$'\033[1m'; uit=$'\033[0m'

kop()   { printf '\n%s%s%s\n' "$vet" "$1" "$uit"; }
goed()  { printf '  %s✓%s %s\n' "$groen" "$uit" "$1"; }
let_op(){ printf '  %s!%s %s\n' "$geel" "$uit" "$1"; }
stop() {
  printf '\n%s%s✗ %s%s\n\n' "$vet" "$rood" "$1" "$uit"
  shift
  for regel in "$@"; do printf '  %s\n' "$regel"; done
  printf '\nDit venster kun je sluiten.\n\n'
  read -r -p "Druk op Enter om af te sluiten." _
  exit 1
}

printf '\n%s  Paylity — Payments made simple%s\n' "$vet" "$uit"
printf '  Testomgeving. Er wordt geen echt geld verwerkt.\n'

# ---------------------------------------------------------------- Node.js
kop "1. Node.js"
if ! command -v node >/dev/null 2>&1; then
  stop "Node.js staat niet op deze computer." \
       "Paylity heeft Node.js 20 of nieuwer nodig." \
       "" \
       "Download het van https://nodejs.org (kies de LTS-versie)," \
       "installeer het, en dubbelklik dit bestand daarna opnieuw."
fi
versie=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$versie" -lt 20 ]; then
  stop "Node.js $(node -v) is te oud." \
       "Paylity heeft versie 20 of nieuwer nodig." \
       "Haal de nieuwste van https://nodejs.org en probeer opnieuw."
fi
goed "Node.js $(node -v)"

# ---------------------------------------------------------------- .env
kop "2. Instellingen"
if [ ! -f .env ]; then
  cp .env.example .env || stop ".env.example ontbreekt." "Pak de zip opnieuw uit."
  goed ".env aangemaakt vanuit .env.example"
else
  goed ".env bestaat al"
fi

# Een eigen webhook-geheim, als daar nog de voorbeeldwaarde staat.
if grep -q "whsec_vervang_dit" .env 2>/dev/null; then
  geheim="whsec_$(node -e "console.log(require('crypto').randomBytes(24).toString('hex'))")"
  node -e "
    const fs = require('fs');
    fs.writeFileSync('.env', fs.readFileSync('.env', 'utf8')
      .replace(/WEBHOOK_SIGNING_SECRET=.*/, 'WEBHOOK_SIGNING_SECRET=\"$geheim\"'));
  "
  goed "eigen webhook-geheim gezet"
fi

# ---------------------------------------------------------------- Database
kop "3. Database"

# Draait er iets op de poort uit DATABASE_URL? Zo ja, dan is dit klaar.
bereikbaar() {
  node -e "
    const net = require('net');
    const url = new URL(process.argv[1]);
    const s = net.connect(Number(url.port || 5432), url.hostname);
    s.on('connect', () => { s.end(); process.exit(0); });
    s.on('error', () => process.exit(1));
    setTimeout(() => process.exit(1), 2500);
  " "$1" 2>/dev/null
}

huidige=$(grep -E '^DATABASE_URL=' .env | head -1 | cut -d= -f2- | tr -d '"')

if [ -n "$huidige" ] && [ "${huidige#*gebruiker:wachtwoord}" = "$huidige" ] && bereikbaar "$huidige"; then
  goed "database bereikbaar volgens .env"
else
  let_op "de database uit .env is niet bereikbaar — ik zoek er zelf een"

  # Postgres.app (de makkelijkste op een Mac) aan het pad toevoegen.
  for map in /Applications/Postgres.app/Contents/Versions/*/bin; do
    [ -d "$map" ] && PATH="$map:$PATH" && break
  done
  export PATH

  gevonden=""

  # a. Draait er al een PostgreSQL op de standaardpoort?
  if bereikbaar "postgresql://localhost:5432"; then
    gevonden="localhost:5432"

  # b. Homebrew-installatie die nog uit staat.
  elif command -v brew >/dev/null 2>&1 && brew list 2>/dev/null | grep -q '^postgresql'; then
    let_op "PostgreSQL via Homebrew gevonden, ik start hem"
    brew services start "$(brew list | grep '^postgresql' | head -1)" >/dev/null 2>&1
    sleep 4
    bereikbaar "postgresql://localhost:5432" && gevonden="localhost:5432"

  # c. Postgres.app geïnstalleerd maar niet gestart.
  elif [ -d /Applications/Postgres.app ]; then
    let_op "Postgres.app gevonden, ik start hem"
    open -a Postgres >/dev/null 2>&1
    for _ in 1 2 3 4 5 6 7 8 9 10; do
      sleep 2
      bereikbaar "postgresql://localhost:5432" && gevonden="localhost:5432" && break
    done

  # d. Docker, als laatste optie.
  elif command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
    let_op "geen PostgreSQL gevonden, ik start er een in Docker"
    docker rm -f paylity-db >/dev/null 2>&1
    docker run -d --name paylity-db \
      -e POSTGRES_PASSWORD=paylity -e POSTGRES_DB=paylity \
      -p 5432:5432 postgres:16 >/dev/null 2>&1
    for _ in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15; do
      sleep 2
      bereikbaar "postgresql://localhost:5432" && gevonden="localhost:5432" && break
    done
  fi

  if [ -z "$gevonden" ]; then
    stop "Ik kan geen database vinden." \
         "Paylity bewaart zijn gegevens in PostgreSQL. Er staat er geen op" \
         "deze computer, of hij is niet bereikbaar." \
         "" \
         "Op een Mac is dit de makkelijkste manier:" \
         "" \
         "  1. Ga naar https://postgresapp.com" \
         "  2. Download de app en sleep hem naar je Programma's-map" \
         "  3. Open hem en klik op \"Initialize\"" \
         "  4. Dubbelklik dit bestand opnieuw" \
         "" \
         "Heb je al een database draaien? Zet de verbindingsreeks dan zelf" \
         "in .env achter DATABASE_URL en start dit script opnieuw."
  fi

  goed "database gevonden op $gevonden"

  # Database aanmaken als hij nog niet bestaat, en .env bijwerken.
  gebruiker="${USER:-postgres}"
  for kandidaat in "$gebruiker" postgres; do
    if psql -h localhost -p 5432 -U "$kandidaat" -lqt >/dev/null 2>&1; then
      psql -h localhost -p 5432 -U "$kandidaat" -lqt | cut -d\| -f1 | grep -qw paylity \
        || createdb -h localhost -p 5432 -U "$kandidaat" paylity >/dev/null 2>&1
      nieuw="postgresql://$kandidaat@localhost:5432/paylity?schema=public"
      break
    fi
    if PGPASSWORD=paylity psql -h localhost -p 5432 -U "$kandidaat" -lqt >/dev/null 2>&1; then
      PGPASSWORD=paylity psql -h localhost -p 5432 -U "$kandidaat" -lqt | cut -d\| -f1 | grep -qw paylity \
        || PGPASSWORD=paylity createdb -h localhost -p 5432 -U "$kandidaat" paylity >/dev/null 2>&1
      nieuw="postgresql://$kandidaat:paylity@localhost:5432/paylity?schema=public"
      break
    fi
  done

  [ -z "$nieuw" ] && stop "De database draait, maar ik mag er niet in." \
    "Zet de juiste verbindingsreeks zelf in .env achter DATABASE_URL." \
    "Die vind je in Postgres.app onder de databasenaam."

  node -e "
    const fs = require('fs');
    fs.writeFileSync('.env', fs.readFileSync('.env', 'utf8')
      .replace(/DATABASE_URL=.*/, 'DATABASE_URL=\"$nieuw\"'));
  "
  goed "DATABASE_URL in .env bijgewerkt"
fi

# ---------------------------------------------------------------- Pakketten
kop "4. Pakketten"
if [ -d node_modules ] && [ -d node_modules/@prisma/client ]; then
  goed "staan er al"
else
  printf '  even geduld, dit duurt een halve minuut…\n'
  npm install --no-audit --no-fund >/dev/null 2>&1 || stop "npm install is mislukt." \
    "Probeer het in een terminal met: npm install" \
    "Dan zie je de fout die erbij hoort."
  goed "geïnstalleerd"
fi

# ---------------------------------------------------------------- Tabellen
kop "5. Tabellen"
npx prisma migrate deploy >/dev/null 2>&1 || stop "De tabellen konden niet worden aangemaakt." \
  "Voer in een terminal uit: npx prisma migrate deploy" \
  "Dan zie je waar het op vastloopt."
goed "tabellen staan klaar"

# ---------------------------------------------------------------- Account
kop "6. Account"
aantal=$(npx tsx -e "
  import 'dotenv/config';
  import { PrismaClient } from '@prisma/client';
  const db = new PrismaClient();
  db.user.count().then((n) => { console.log(n); return db.\$disconnect(); });
" 2>/dev/null | tail -1)

if [ "$aantal" = "0" ] || [ -z "$aantal" ]; then
  printf '  Er is nog geen account. Ik maak er nu een.\n\n'

  printf '  E-mailadres:\n  > '
  read -r email

  printf '\n  Wachtwoord (minstens 10 tekens — je ziet niets tijdens het typen):\n  > '
  stty -echo 2>/dev/null; read -r wachtwoord; stty echo 2>/dev/null; printf '\n'

  printf '\n  Bedrijfsnaam (Enter voor "%s"):\n  > ' "${email%%@*}"
  read -r bedrijf
  [ -z "$bedrijf" ] && bedrijf="${email%%@*}"
  printf '\n'

  PAYLITY_WACHTWOORD="$wachtwoord" npx tsx prisma/account.ts \
      --email "$email" --naam "$bedrijf" --bedrijf "$bedrijf" --demo \
    || stop "Het account aanmaken is mislukt." "Zie de melding hierboven."
else
  goed "er staat al een account klaar ($aantal in totaal)"
  printf '  Wachtwoord kwijt? Voer dit uit in een terminal:\n'
  printf '    npm run account -- --email jouw@adres.be --wachtwoord "nieuwwachtwoord"\n'
fi

# ---------------------------------------------------------------- Starten
kop "7. Starten"
printf '  Paylity draait zo op http://localhost:3000\n'
printf '  Stoppen doe je met Ctrl-C, of door dit venster te sluiten.\n\n'

(sleep 4 && (open http://localhost:3000/login 2>/dev/null || xdg-open http://localhost:3000/login 2>/dev/null)) &

exec npm run dev
