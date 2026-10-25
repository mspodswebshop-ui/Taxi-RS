// Zet de studio om naar afbeeldingen en een video.
//   node render.js beelden <uitmap>          alle posts en stories als PNG
//   node render.js proef <uitmap>            losse frames van de video om na te kijken
//   node render.js video <uitmap>            de volledige video als MP4 (via ffmpeg)
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const fs = require('fs'), path = require('path');
const [, , mode, out] = process.argv;
const STUDIO = 'file://' + path.join(__dirname, 'studio.html');
const FPS = 30;

(async () => {
  fs.mkdirSync(out, { recursive: true });
  const b = await chromium.launch();
  const page = async (scene, w, h) => {
    const p = await b.newPage({ viewport: { width: w, height: h } });
    p.on('pageerror', e => console.log(scene, 'FOUT', e.message));
    await p.goto(`${STUDIO}#${scene}`);
    await p.waitForFunction(() => window.studioReady && document.fonts.status === 'loaded');
    await p.evaluate(() => document.fonts.ready);
    await p.waitForTimeout(300);
    return p;
  };
  if (mode === 'beelden') {
    const items = [['post-1', 1350], ['post-2', 1350], ['post-3', 1350], ['post-4', 1350], ['post-5', 1350], ['story-1', 1920], ['story-2', 1920]];
    for (const [s, h] of items) {
      const p = await page(s, 1080, h);
      await p.screenshot({ path: path.join(out, `dripp-it-${s}.png`) });
      await p.close();
      console.log('klaar', s);
    }
  } else {
    const p = await page('video', 1080, 1920);
    const dur = await p.evaluate(() => window.DURATION);
    const times = mode === 'proef' ? [0.6, 1.4, 2.6, 4.4, 6.2, 7.6, 10.0, 11.6, 14.5] : Array.from({ length: dur * FPS }, (_, i) => i / FPS);
    const dir = mode === 'proef' ? out : fs.mkdtempSync(path.join(out, 'frames-'));
    for (let i = 0; i < times.length; i++) {
      await p.evaluate(t => window.renderAt(t), times[i]);
      const name = mode === 'proef' ? `proef-${String(times[i]).replace('.', '_')}.jpg` : `f${String(i).padStart(4, '0')}.jpg`;
      await p.screenshot({ path: path.join(dir, name), type: 'jpeg', quality: 94 });
    }
    if (mode === 'video') {
      const mp4 = path.join(out, 'dripp-it-reclame.mp4');
      execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(FPS), '-i', path.join(dir, 'f%04d.jpg'),
        '-f', 'lavfi', '-i', 'anullsrc=channel_layout=stereo:sample_rate=44100', '-shortest',
        '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-preset', 'slow', '-c:a', 'aac', '-b:a', '128k',
        '-movflags', '+faststart', mp4]);
      fs.rmSync(dir, { recursive: true });
      console.log('video klaar', mp4, (fs.statSync(mp4).size / 1e6).toFixed(1) + ' MB');
    }
  }
  await b.close();
})();
