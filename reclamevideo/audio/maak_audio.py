"""Maakt de geluidsband voor de Weblity-reclamevideo: voice-over en muziek.

- Voice-over: Nederlandse neurale stem (Piper, stem "nl-rdh-medium").
- Muziek: zelf gesynthetiseerd (dus rechtenvrij), 125 BPM. Op dat tempo vallen
  de overgangen in de muziek samen met de scènewissels in de video
  (3,84 s, 9,6 s en 15,36 s).

Gebruik:
    pip install piper-tts numpy scipy
    python maak_audio.py            # schrijft weblity-audio.wav naast dit script

De stem wordt de eerste keer gedownload van de Piper-releases op GitHub.
"""

import tarfile
import urllib.request
import wave
from pathlib import Path

import numpy as np
from scipy.signal import butter, resample_poly, sosfilt

HIER = Path(__file__).resolve().parent
SR = 44100
DUUR = 22.0
N = int(SR * DUUR)
rng = np.random.default_rng(7)

# ---------------------------------------------------------------- voice-over

STEM = "nl-rdh-medium"
STEM_URL = f"https://github.com/rhasspy/piper/releases/download/v0.0.2/voice-{STEM}.tar.gz"

# (starttijd in seconden, tekst). Leenwoorden staan fonetisch gespeld zodat de
# Nederlandse stem ze goed uitspreekt: "diezajn" = design, "Wotsep" = WhatsApp.
TEKST = [
    (0.35, "Wil jij je bedrijf onlajn laten zien?"),
    (3.95, "Bij Weblity ontwerpen en bouwen we jouw website."),
    (7.20, "Mooi op je leptop, én op je telefoon."),
    (10.30, "Uniek diezajn op maat. Supersnel. Professioneel. En altijd persoonlijk contact."),
    (15.60, "Weblity. Websites die voor jou werken."),
    (18.20, "Bel of Wotsep ons vandaag nog!"),
]


def laad_stem():
    from piper import PiperVoice

    cache = HIER / ".stem"
    model = cache / f"{STEM}.onnx"
    if not model.exists():
        cache.mkdir(exist_ok=True)
        archief = cache / "stem.tar.gz"
        urllib.request.urlretrieve(STEM_URL, archief)
        with tarfile.open(archief) as tar:
            tar.extractall(cache)
        archief.unlink()
    return PiperVoice.load(str(model))


def voice_over():
    from piper import SynthesisConfig

    stem = laad_stem()
    cfg = SynthesisConfig(length_scale=0.92, noise_scale=0.6, noise_w_scale=0.8)
    spoor = np.zeros(N)
    momenten = []
    for start, tekst in TEKST:
        delen = [np.frombuffer(c.audio_int16_bytes, dtype=np.int16) for c in stem.synthesize(tekst, syn_config=cfg)]
        x = np.concatenate(delen).astype(np.float64) / 32768
        x = resample_poly(x, SR, stem.config.sample_rate)
        x = trim_stilte(x)
        i = int(start * SR)
        spoor[i : i + len(x)] += x[: N - i]
        momenten.append((start, start + len(x) / SR))
    # Klankkleur: rommel eronder weg, beetje helderheid erbij.
    spoor = sosfilt(butter(2, 90, "highpass", fs=SR, output="sos"), spoor)
    helder = sosfilt(butter(2, 3000, "highpass", fs=SR, output="sos"), spoor)
    spoor = spoor + 0.35 * helder
    return comprimeer(spoor), momenten


def trim_stilte(x, drempel=0.01):
    idx = np.flatnonzero(np.abs(x) > drempel)
    if len(idx) == 0:
        return x
    return x[max(0, idx[0] - int(0.02 * SR)) : idx[-1] + int(0.08 * SR)]


def comprimeer(x, drempel=0.12, ratio=3.0):
    """Eenvoudige compressor: maakt zachte en harde woorden gelijkmatiger."""
    env = np.sqrt(volg(x**2, 0.005, 0.12))
    winst = np.ones_like(x)
    boven = env > drempel
    winst[boven] = (drempel + (env[boven] - drempel) / ratio) / env[boven]
    y = x * winst
    return y / (np.max(np.abs(y)) + 1e-9)


def volg(x, attack, release):
    """Envelopvolger met aparte attack- en releasetijd (in seconden)."""
    a = np.exp(-1 / (attack * SR))
    r = np.exp(-1 / (release * SR))
    y = np.empty_like(x)
    v = 0.0
    for i, s in enumerate(x):
        c = a if s > v else r
        v = c * v + (1 - c) * s
        y[i] = v
    return y


# ------------------------------------------------------------------- muziek

BPM = 125
TEL = 60 / BPM          # 0,48 s
MAAT = 4 * TEL          # 1,92 s
ZESTIENDE = TEL / 4

# Am - F - C - G: de klassieke "vrolijke" akkoordenreeks.
AKKOORDEN = [
    {"bas": 45, "pad": [57, 60, 64, 69], "arp": [69, 72, 76, 81]},
    {"bas": 41, "pad": [57, 60, 65, 69], "arp": [65, 69, 72, 77]},
    {"bas": 48, "pad": [55, 60, 64, 67], "arp": [67, 72, 76, 79]},
    {"bas": 43, "pad": [55, 59, 62, 67], "arp": [67, 71, 74, 79]},
]
SLOTAKKOORD = {"bas": 36, "pad": [55, 60, 64, 67, 74]}  # C(add9)
DROP = 2 * MAAT          # 3,84 s: beat valt in
SLOT = 11 * MAAT         # 21,12 s: slotklap


def hz(midi):
    return 440.0 * 2 ** ((midi - 69) / 12)


def t_as(duur):
    return np.arange(int(duur * SR)) / SR


def zaag(f, t, fase=0.0):
    p = (f * t + fase) % 1.0
    return 2 * p - 1


def plaats(spoor, x, start, gain=1.0):
    i = int(start * SR)
    if i >= len(spoor) or i < 0:
        return
    n = min(len(x), len(spoor) - i)
    spoor[i : i + n] += gain * x[:n]


def lp(x, f):
    return sosfilt(butter(2, f, "lowpass", fs=SR, output="sos"), x)


def hp(x, f):
    return sosfilt(butter(2, f, "highpass", fs=SR, output="sos"), x)


def bp(x, lo, hi):
    return sosfilt(butter(2, [lo, hi], "bandpass", fs=SR, output="sos"), x)


def kick():
    t = t_as(0.4)
    f = 48 + 110 * np.exp(-t * 30)
    fase = 2 * np.pi * np.cumsum(f) / SR
    x = np.sin(fase) * np.exp(-t * 9)
    x[: int(0.003 * SR)] += rng.uniform(-0.6, 0.6, int(0.003 * SR))
    return np.tanh(1.6 * x)


def clap():
    t = t_as(0.25)
    ruis = rng.uniform(-1, 1, len(t))
    env = np.zeros_like(t)
    for d in (0.0, 0.011, 0.022):
        env += (t >= d) * np.exp(-np.clip(t - d, 0, None) * 60) * 0.5
    env += (t >= 0.03) * np.exp(-np.clip(t - 0.03, 0, None) * 18)
    return bp(ruis, 900, 2600) * env * 1.6


def hat(open_=False):
    t = t_as(0.35 if open_ else 0.06)
    x = hp(rng.uniform(-1, 1, len(t)), 7500) * np.exp(-t * (9 if open_ else 70))
    return x


def crash(duur=2.5):
    t = t_as(duur)
    return hp(rng.uniform(-1, 1, len(t)), 4500) * np.exp(-t * 2.2)


def riser(duur):
    t = t_as(duur)
    ruis = rng.uniform(-1, 1, len(t))
    # In stukjes filteren zodat het filter meeloopt omhoog.
    uit = np.zeros_like(ruis)
    stuk = int(0.05 * SR)
    for i in range(0, len(t), stuk):
        f = 400 + 7000 * (i / len(t)) ** 2
        uit[i : i + stuk] = bp(ruis[i : i + stuk + 0], f * 0.7, min(f * 1.6, SR / 2 - 100))
    return uit * (t / duur) ** 2


def pluk(midi, duur=0.22, helder=3500):
    t = t_as(duur)
    f = hz(midi)
    x = 0.6 * zaag(f, t) + 0.4 * np.sign(np.sin(2 * np.pi * f * t))
    return lp(x, helder) * np.exp(-t * 16)


def pad_akkoord(noten, duur, helder=2200):
    t = t_as(duur)
    l = np.zeros_like(t)
    r = np.zeros_like(t)
    for n in noten:
        f = hz(n)
        for d, pan in ((-0.12, 0.8), (0.0, 0.5), (0.12, 0.2)):
            g = f * 2 ** (d / 12)
            s = zaag(g, t, fase=rng.random())
            l += s * (1 - pan)
            r += s * pan
    att = np.clip(t / 0.25, 0, 1)
    rel = np.clip((duur - t) / 0.3, 0, 1)
    env = att * rel
    return lp(l, helder) * env / len(noten), lp(r, helder) * env / len(noten)


def bas(midi, duur):
    t = t_as(duur)
    f = hz(midi)
    x = lp(zaag(f, t), 700) * 0.7 + np.sin(2 * np.pi * f / 2 * t) * 0.6
    env = np.clip(t / 0.005, 0, 1) * np.exp(-t * 5)
    return x * env


def muziek():
    L = np.zeros(N)
    R = np.zeros(N)
    drums = np.zeros(N)
    pomp = np.ones(N)   # "sidechain": de rest duikt even weg op elke kick

    k = kick()
    pomp_vorm = 1 - 0.55 * np.exp(-t_as(TEL) * 14)

    # --- akkoorden, bas en arpeggio per maat
    for maat in range(11):
        start = maat * MAAT
        ak = AKKOORDEN[maat % 4]
        intro = start < DROP
        laatste = maat >= 8

        pl, pr = pad_akkoord(ak["pad"], MAAT + 0.3, helder=900 if intro else (3200 if laatste else 2200))
        plaats(L, pl, start, 0.7 if intro else 0.32)
        plaats(R, pr, start, 0.7 if intro else 0.32)

        if not intro:
            for tel in range(4):
                plaats(L, bas(ak["bas"], TEL / 2), start + tel * TEL + TEL / 2, 0.42)
                plaats(R, bas(ak["bas"], TEL / 2), start + tel * TEL + TEL / 2, 0.42)

        patroon = [0, 1, 2, 3, 2, 1, 2, 3, 0, 1, 2, 3, 2, 3, 1, 2]
        for i, p in enumerate(patroon):
            noot = ak["arp"][p] + (12 if laatste and i % 4 == 3 else 0)
            x = pluk(noot, helder=1400 if intro else (5200 if laatste else 3800))
            g = 0.22 if intro else 0.13
            tt = start + i * ZESTIENDE
            # pingpong-echo: links, dan rechts (3/16 later)
            plaats(L, x, tt, g)
            plaats(R, x, tt + 3 * ZESTIENDE, g * 0.45)
            plaats(L, x, tt + 6 * ZESTIENDE, g * 0.2)

    # --- slotakkoord
    pl, pr = pad_akkoord(SLOTAKKOORD["pad"], DUUR - SLOT, helder=3000)
    plaats(L, pl, SLOT, 0.4)
    plaats(R, pr, SLOT, 0.4)
    for ch in (L, R):
        plaats(ch, bas(SLOTAKKOORD["bas"], 1.2) * 1.2, SLOT, 0.5)
    for n in (72, 76, 79, 84):
        x = pluk(n, duur=0.9, helder=5000)
        plaats(L, x, SLOT, 0.08)
        plaats(R, x, SLOT + 0.01, 0.08)

    # --- drums
    for maat in range(11):
        start = maat * MAAT
        for tel in range(4):
            tt = start + tel * TEL
            # Even ademruimte voor de scènewissels: geen kick op de laatste tel
            # voor 9,6 s en voor 15,36 s.
            gat = maat in (4, 7) and tel == 3
            if start >= DROP and not gat:
                plaats(drums, k, tt, 0.9)
                plaats(pomp, pomp_vorm - 1, tt)
            if start >= DROP and tel in (1, 3) and not gat:
                plaats(drums, clap(), tt, 0.38)
            if start >= DROP:
                plaats(drums, hat(open_=(tel == 3 and maat % 2 == 1)), tt + TEL / 2, 0.16)
                plaats(drums, hat(), tt + TEL / 4, 0.05)
                plaats(drums, hat(), tt + 3 * TEL / 4, 0.05)
            elif maat == 1:
                plaats(drums, hat(), tt + TEL / 2, 0.14)
        if maat in (4, 7):
            # roffel op de laatste tel naar de nieuwe scène
            for i in range(4):
                plaats(drums, clap(), start + 3 * TEL + i * ZESTIENDE, 0.12 + 0.07 * i)

    # roffel + riser naar de drop
    for i in range(8):
        plaats(drums, clap(), MAAT + 2 * TEL + i * ZESTIENDE, 0.05 + 0.03 * i)
    for t0, duur in ((MAAT, MAAT), (5 * MAAT - TEL, TEL), (8 * MAAT - 2 * TEL, 2 * TEL)):
        x = riser(duur)
        plaats(L, x, t0, 0.22)
        plaats(R, x, t0, 0.22)
    for t0 in (DROP, 5 * MAAT, 8 * MAAT):
        c = crash()
        plaats(L, c, t0, 0.16)
        plaats(R, c, t0 + 0.004, 0.16)
    plaats(drums, k, SLOT, 1.0)
    plaats(L, crash(DUUR - SLOT), SLOT, 0.2)
    plaats(R, crash(DUUR - SLOT), SLOT + 0.004, 0.2)

    pomp = np.clip(pomp, 0.4, 1.0)
    L = L * pomp + drums
    R = R * pomp + drums
    m = np.stack([L, R])
    return m / (np.max(np.abs(m)) + 1e-9)


# ----------------------------------------------------------------- mixen

def mix(stem, momenten, muz):
    # Muziek zachter zetten (ducking) terwijl er gesproken wordt.
    duck = np.ones(N)
    for a, b in momenten:
        i, j = int((a - 0.15) * SR), int((b + 0.25) * SR)
        duck[max(i, 0) : j] = 0.42
    duck = volg(duck, 0.06, 0.06)
    muz = muz * duck * 0.55
    # Laatste halve seconde rustig uitfaden.
    fade = np.clip((DUUR - np.arange(N) / SR) / 0.6, 0, 1)
    out = (muz + stem * 0.95) * fade
    return out / (np.max(np.abs(out)) + 1e-9) * 0.89


def schrijf(pad, stereo):
    data = (np.clip(stereo.T, -1, 1) * 32767).astype("<i2")
    with wave.open(str(pad), "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(data.tobytes())


if __name__ == "__main__":
    stem, momenten = voice_over()
    muz = muziek()
    schrijf(HIER / "muziek.wav", muz * 0.89)
    schrijf(HIER / "weblity-audio.wav", mix(stem, momenten, muz))
    print("Klaar:", HIER / "weblity-audio.wav")
    for (a, b), (_, t) in zip(momenten, TEKST):
        print(f"  {a:5.2f}-{b:5.2f}s  {t}")
