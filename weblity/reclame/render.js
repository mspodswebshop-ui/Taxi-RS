// Maakt van reclame.html een mp4: zet de tijd beeld voor beeld en geeft elk
// beeldje door aan ffmpeg. Nodig: Node, Playwright (met Chromium) en ffmpeg.
//
//   node render.js                 -> weblity-reclame.mp4 (1080 x 1920, 30 beelden per seconde)
//   node render.js --stills 2,9,18 -> losse png's op die seconden, om te controleren

const { chromium } = require('playwright');
const { spawn } = require('node:child_process');
const path = require('node:path');

const FPS = 30;
const bron = 'file://' + path.join(__dirname, 'reclame.html') + '?render';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  await page.goto(bron);
  await page.evaluate(() => document.fonts.ready);
  const duur = await page.evaluate(() => window.DUUR);
  const beeld = async t => {
    await page.evaluate(t => window.zetTijd(t), t);
    return page.screenshot({ type: 'png', clip: { x: 0, y: 0, width: 1080, height: 1920 } });
  };

  const i = process.argv.indexOf('--stills');
  if (i > -1) {
    const map = process.argv[i + 2] || __dirname;
    for (const t of process.argv[i + 1].split(',').map(Number)) {
      require('node:fs').writeFileSync(path.join(map, `still-${String(t).padStart(4, '0')}.png`), await beeld(t));
    }
    await browser.close();
    return;
  }

  const uit = path.join(__dirname, 'weblity-reclame.mp4');
  const ffmpeg = spawn('ffmpeg', [
    '-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '24', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', uit,
  ], { stdio: ['pipe', 'inherit', 'inherit'] });
  const klaar = new Promise((ok, mis) => ffmpeg.on('close', code => (code ? mis(new Error('ffmpeg stopte met code ' + code)) : ok())));

  const totaal = Math.round(duur * FPS);
  for (let n = 0; n < totaal; n++) {
    const png = await beeld(n / FPS);
    if (!ffmpeg.stdin.write(png)) await new Promise(ok => ffmpeg.stdin.once('drain', ok));
    if (n % 90 === 0) console.log(`${Math.round((n / totaal) * 100)}%`);
  }
  ffmpeg.stdin.end();
  await klaar;
  await browser.close();
  console.log('klaar:', uit);
})();
