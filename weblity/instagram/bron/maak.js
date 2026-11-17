// Maakt van elk kader in posts.html een png in de map instagram/.
//   node maak.js
const { chromium } = require('playwright');
const path = require('node:path');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1200, height: 2100 }, deviceScaleFactor: 1 });
  await page.goto('file://' + path.join(__dirname, 'posts.html'));
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(500);
  const uit = path.join(__dirname, '..');
  const kaders = await page.$$('section.k');
  for (const k of kaders) {
    const naam = await k.getAttribute('data-naam');
    await k.screenshot({ path: path.join(uit, naam + '.png') });
  }
  console.log(kaders.length, 'afbeeldingen gemaakt in', uit);
  await browser.close();
})();
