// Zet weblity.html beeld voor beeld om naar MP4-video's.
//
// Gebruik:  node render.mjs            -> beide formaten
//           node render.mjs staand     -> alleen 9:16 (telefoon)
//           node render.mjs liggend    -> alleen 16:9 (laptop)
//
// Nodig: Node.js, Playwright (met Chromium) en ffmpeg.

import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
let playwright;
try {
  playwright = require("playwright");
} catch {
  // Valt terug op een globaal geïnstalleerde Playwright.
  const { execSync } = await import("node:child_process");
  const root = execSync("npm root -g").toString().trim();
  playwright = require(join(root, "playwright"));
}

const hier = dirname(fileURLToPath(import.meta.url));
const FPS = 30;
const FORMATEN = {
  staand: { width: 1080, height: 1920, bestand: "weblity-reclame-telefoon.mp4" },
  liggend: { width: 1920, height: 1080, bestand: "weblity-reclame-laptop.mp4" },
};

const gekozen = process.argv[2] ? [process.argv[2]] : Object.keys(FORMATEN);
mkdirSync(join(hier, "video"), { recursive: true });

const browser = await playwright.chromium.launch();
for (const naam of gekozen) {
  const f = FORMATEN[naam];
  if (!f) throw new Error(`Onbekend formaat: ${naam} (kies staand of liggend)`);

  const page = await browser.newPage({ viewport: { width: f.width, height: f.height } });
  const url = pathToFileURL(join(hier, "weblity.html")).href + `?formaat=${naam}&render`;
  await page.goto(url);
  await page.evaluate(() => document.fonts.ready);
  const duur = await page.evaluate(() => window.DUUR);
  const totaal = Math.round(duur * FPS);

  const uit = join(hier, "video", f.bestand);
  // Geluidsband (voice-over + muziek) uit audio/maak_audio.py, als die er is.
  const audio = join(hier, "audio", "weblity-audio.wav");
  const geluid = existsSync(audio)
    ? ["-i", audio, "-map", "0:v", "-map", "1:a", "-af", "loudnorm=I=-14:TP=-1.5:LRA=11,aresample=44100",
       "-c:a", "aac", "-b:a", "192k", "-shortest"]
    : [];
  const ffmpeg = spawn("ffmpeg", [
    "-y", "-loglevel", "error",
    "-f", "image2pipe", "-framerate", String(FPS), "-i", "-",
    ...geluid,
    "-c:v", "libx264", "-preset", "slow", "-crf", "18",
    "-pix_fmt", "yuv420p", "-movflags", "+faststart",
    uit,
  ], { stdio: ["pipe", "inherit", "inherit"] });
  const klaar = new Promise((ok, fout) => ffmpeg.on("close", (c) => (c === 0 ? ok() : fout(new Error(`ffmpeg stopte met code ${c}`)))));

  for (let i = 0; i < totaal; i++) {
    await page.evaluate((t) => window.renderFrame(t), i / FPS);
    const png = await page.screenshot({ type: "png" });
    if (!ffmpeg.stdin.write(png)) await new Promise((r) => ffmpeg.stdin.once("drain", r));
    if (i % FPS === 0) process.stdout.write(`\r${naam}: ${Math.round((i / totaal) * 100)}%`);
  }
  ffmpeg.stdin.end();
  await klaar;
  console.log(`\r${naam}: klaar -> video/${f.bestand}`);
  await page.close();
}
await browser.close();
