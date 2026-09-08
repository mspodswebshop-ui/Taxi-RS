/* Arena FC 27 — geluid. Alles wordt live gesynthetiseerd met de Web Audio API,
   dus het spel heeft geen enkel audiobestand nodig. */
const Sound = (function () {
  "use strict";

  let ctx = null, master = null, ready = false, muted = false;
  let crowd = null, crowdGain = null, crowdFilter = null;
  let anthemTimer = null, anthemNodes = [];

  const NOTES = { C: -9, "C#": -8, D: -7, "D#": -6, E: -5, F: -4, "F#": -3, G: -2, "G#": -1, A: 0, "A#": 1, B: 2 };

  function freq(note) {
    const m = /^([A-G]#?)(\d)$/.exec(note);
    if (!m) return 440;
    const semis = NOTES[m[1]] + (Number(m[2]) - 4) * 12;
    return 440 * Math.pow(2, semis / 12);
  }

  function init() {
    if (ready) return true;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain();
      master.gain.value = 0.9;
      master.connect(ctx.destination);
      ready = true;
    } catch (e) { ready = false; }
    return ready;
  }

  function resume() { if (ctx && ctx.state === "suspended") ctx.resume(); }
  function on() { return ready && !muted; }

  /* ---------- Publiek: ruis door een banddoorlaatfilter, live geregeld ---------- */
  function startCrowd() {
    if (!on() || crowd) return;
    const len = ctx.sampleRate * 3;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;      // bruine ruis: klinkt als een menigte
      d[i] = last * 3.2 + white * 0.12;
    }
    crowd = ctx.createBufferSource();
    crowd.buffer = buf;
    crowd.loop = true;
    crowdFilter = ctx.createBiquadFilter();
    crowdFilter.type = "bandpass";
    crowdFilter.frequency.value = 620;
    crowdFilter.Q.value = 0.7;
    crowdGain = ctx.createGain();
    crowdGain.gain.value = 0.05;
    crowd.connect(crowdFilter); crowdFilter.connect(crowdGain); crowdGain.connect(master);
    crowd.start();
  }

  function stopCrowd() {
    if (crowd) { try { crowd.stop(); } catch (e) {} crowd = null; }
  }

  /* Spanningsniveau 0–1: hoe dichter bij een doelpunt, hoe luider en feller. */
  function crowdLevel(x) {
    if (!on() || !crowdGain) return;
    const v = Math.max(0, Math.min(1, x));
    crowdGain.gain.setTargetAtTime(0.035 + v * 0.10, ctx.currentTime, 0.6);
    crowdFilter.frequency.setTargetAtTime(560 + v * 520, ctx.currentTime, 0.6);
  }

  function roar(strength) {
    if (!on() || !crowdGain) return;
    const t = ctx.currentTime, s = strength || 1;
    crowdGain.gain.cancelScheduledValues(t);
    crowdGain.gain.setValueAtTime(crowdGain.gain.value, t);
    crowdGain.gain.linearRampToValueAtTime(0.30 * s, t + 0.25);
    crowdGain.gain.setTargetAtTime(0.06, t + 1.2, 1.8);
    crowdFilter.frequency.cancelScheduledValues(t);
    crowdFilter.frequency.setValueAtTime(crowdFilter.frequency.value, t);
    crowdFilter.frequency.linearRampToValueAtTime(1500, t + 0.3);
    crowdFilter.frequency.setTargetAtTime(640, t + 1.4, 1.6);
  }

  /* ---------- Losse effecten ---------- */
  function blip(f, dur, type, vol, slideTo) {
    if (!on()) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || "sine";
    o.frequency.setValueAtTime(f, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(vol || 0.06, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(master);
    o.start(t); o.stop(t + dur + 0.02);
  }

  function whistle(kind) {
    if (!on()) return;
    const t = ctx.currentTime;
    const blast = (start, dur) => {
      const o = ctx.createOscillator(), g = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain();
      o.type = "triangle"; o.frequency.value = 2350;
      lfo.type = "sine"; lfo.frequency.value = 28; lg.gain.value = 130;
      lfo.connect(lg); lg.connect(o.frequency);
      g.gain.setValueAtTime(0.0001, t + start);
      g.gain.exponentialRampToValueAtTime(0.16, t + start + 0.03);
      g.gain.setValueAtTime(0.16, t + start + dur - 0.05);
      g.gain.exponentialRampToValueAtTime(0.0001, t + start + dur);
      o.connect(g); g.connect(master);
      o.start(t + start); o.stop(t + start + dur + 0.02);
      lfo.start(t + start); lfo.stop(t + start + dur + 0.02);
    };
    if (kind === "long") { blast(0, 1.1); }
    else if (kind === "double") { blast(0, 0.22); blast(0.3, 0.22); }
    else if (kind === "triple") { blast(0, 0.28); blast(0.36, 0.28); blast(0.72, 0.9); }
    else blast(0, 0.3);
  }

  function kick(power) {
    if (!on()) return;
    const p = Math.max(0.2, Math.min(1, power || 0.6));
    blip(90 + p * 60, 0.09, "square", 0.05 + p * 0.05, 55);
    const t = ctx.currentTime;
    const n = ctx.createBufferSource(), len = ctx.sampleRate * 0.05;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    n.buffer = buf;
    const g = ctx.createGain(); g.gain.value = 0.05 + p * 0.06;
    n.connect(g); g.connect(master); n.start(t);
  }

  function post() { blip(320, 0.35, "triangle", 0.14, 180); }
  function save() { blip(180, 0.12, "sine", 0.07); }

  /* ---------- Volkslied ---------- */
  function playAnthem(key, onDone) {
    stopAnthem();
    const song = ANTHEMS[key];
    if (!on() || !song) { if (onDone) anthemTimer = setTimeout(onDone, 1200); return 8; }
    const beat = 60 / song.tempo;
    let t = ctx.currentTime + 0.35, total = 0;

    song.notes.forEach(([note, beats]) => {
      const dur = beats * beat;
      if (note !== "-") {
        const f = freq(note);
        /* Twee stemmen plus een lage kwint: klinkt als een blaasorkest. */
        [[f, 0.055, "triangle"], [f * 2, 0.018, "sine"], [f / 2, 0.03, "sawtooth"]].forEach(([ff, vol, type]) => {
          const o = ctx.createOscillator(), g = ctx.createGain();
          o.type = type; o.frequency.value = ff;
          g.gain.setValueAtTime(0.0001, t);
          g.gain.exponentialRampToValueAtTime(vol, t + 0.06);
          g.gain.setValueAtTime(vol, t + dur * 0.75);
          g.gain.exponentialRampToValueAtTime(0.0001, t + dur * 0.98);
          o.connect(g); g.connect(master);
          o.start(t); o.stop(t + dur);
          anthemNodes.push(o);
        });
      }
      t += dur; total += dur;
    });

    if (onDone) anthemTimer = setTimeout(onDone, (total + 0.9) * 1000);
    return total + 0.9;
  }

  function stopAnthem() {
    clearTimeout(anthemTimer);
    anthemNodes.forEach((o) => { try { o.stop(); } catch (e) {} });
    anthemNodes = [];
  }

  function setMuted(v) {
    muted = !!v;
    if (master) master.gain.value = muted ? 0 : 0.9;
  }

  return {
    init: init, resume: resume, ready: () => ready,
    startCrowd: startCrowd, stopCrowd: stopCrowd, crowdLevel: crowdLevel, roar: roar,
    whistle: whistle, kick: kick, post: post, save: save, blip: blip,
    anthem: playAnthem, stopAnthem: stopAnthem, setMuted: setMuted
  };
})();
