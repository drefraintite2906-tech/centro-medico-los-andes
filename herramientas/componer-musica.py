"""Compone una pieza instrumental ORIGINAL y relajante para la sala de espera (sin derechos de terceros).
Uso: python3 herramientas/componer-musica.py <duracion_segundos> <salida.wav>
Capas: colchón de acordes (pad), bajo suave, arpegio tipo piano y reverberación. Semilla fija = reproducible."""
import sys, numpy as np
from scipy.signal import fftconvolve, butter, sosfilt
from scipy.io import wavfile

DUR = float(sys.argv[1]) if len(sys.argv) > 1 else 111.0
OUT = sys.argv[2] if len(sys.argv) > 2 else "musica.wav"
SR = 44100
rng = np.random.default_rng(2906)
N = int(DUR * SR)
t_all = np.arange(N) / SR
L = np.zeros(N); R = np.zeros(N)

def hz(m): return 440.0 * 2 ** ((m - 69) / 12)
BPM = 66; BEAT = 60 / BPM; BAR = 4 * BEAT
# Cmaj7 – Am7 – Fmaj7 – G6/9 (I–vi–IV–V), notas MIDI
CHORDS = [([48], [60, 64, 67, 71]), ([45], [57, 60, 64, 67]), ([41], [57, 60, 64, 65]), ([43], [55, 59, 62, 64])]

def env_adsr(n, a, r):
    e = np.ones(n); na = int(a * SR); nr = int(r * SR)
    e[:na] = np.linspace(0, 1, na) ** 2
    e[-nr:] *= np.linspace(1, 0, nr) ** 1.5
    return e

def add(buf, start, sig):
    i = int(start * SR)
    if i >= N: return
    j = min(N, i + len(sig)); buf[i:j] += sig[: j - i]

nbars = int(np.ceil(DUR / BAR))
for b in range(nbars):
    bass, notes = CHORDS[b % 4]
    t0 = b * BAR; dur = BAR + 1.6            # se solapa con el siguiente acorde
    n = int(dur * SR); t = np.arange(n) / SR
    e = env_adsr(n, 1.4, 1.8)
    # Pad: senos levemente desafinados entre canales + armónicos suaves + trémolo lento
    for m in notes:
        f = hz(m)
        trem = 1 + 0.06 * np.sin(2 * np.pi * 0.23 * t + rng.uniform(0, 6))
        sl = np.sin(2*np.pi*f*0.9985*t) + 0.22*np.sin(2*np.pi*2*f*t) + 0.06*np.sin(2*np.pi*3*f*t)
        sr_ = np.sin(2*np.pi*f*1.0015*t) + 0.22*np.sin(2*np.pi*2*f*t+0.4) + 0.06*np.sin(2*np.pi*3*f*t)
        add(L, t0, 0.055 * e * trem * sl); add(R, t0, 0.055 * e * trem * sr_)
    # Bajo
    fb = hz(bass[0]); eb = env_adsr(n, 0.6, 1.5)
    sb = (np.sin(2*np.pi*fb*t) + 0.25*np.sin(2*np.pi*2*fb*t)) * 0.11 * eb
    add(L, t0, sb); add(R, t0, sb)

# Arpegio tipo piano (corcheas) desde el compás 2 hasta 1 compás antes del final
def piano(f, vel, dur=3.2):
    n = int(dur * SR); t = np.arange(n) / SR
    s = sum((0.6 ** (k - 1)) * np.sin(2*np.pi*f*k*t) * np.exp(-t * (1.1 + 0.9*k)) for k in range(1, 6))
    att = np.minimum(1, t / 0.012)
    return vel * att * s
pattern = [0, 1, 2, 3, 2, 1, 3, 2]   # índices dentro del acorde (+12 en algunas)
for b in range(1, nbars - 1):
    _, notes = CHORDS[b % 4]
    for k, idx in enumerate(pattern):
        m = notes[idx] + (12 if k in (3, 6) else 0)
        st = b * BAR + k * BEAT / 2 + rng.normal(0, 0.006)
        v = 0.085 * rng.uniform(0.75, 1.0) * (0.85 if k % 2 else 1.0)
        s = piano(hz(m), v)
        pan = 0.5 + 0.28 * np.sin(k * 0.9)
        add(L, st, s * (1 - pan) * 1.4); add(R, st, s * pan * 1.4)

# Melodía suave cada 8 compases (campanitas) – notas largas del acorde
for b in range(4, nbars - 2, 4):
    _, notes = CHORDS[b % 4]
    for k, m in enumerate([notes[3] + 12, notes[2] + 12, notes[1] + 12]):
        s = piano(hz(m), 0.05, 4.5)
        add(L, b * BAR + k * BEAT * 1.5, s * 0.8); add(R, b * BAR + k * BEAT * 1.5 + 0.012, s)

# Reverberación de sala (impulso sintético) y filtro paso bajo suave
nir = int(3.2 * SR); tir = np.arange(nir) / SR
irL = rng.standard_normal(nir) * np.exp(-tir / 0.9); irR = rng.standard_normal(nir) * np.exp(-tir / 0.9)
sos_ir = butter(2, 5000, "low", fs=SR, output="sos"); irL = sosfilt(sos_ir, irL); irR = sosfilt(sos_ir, irR)
irL /= np.abs(irL).sum() ** 0.5 * 18; irR /= np.abs(irR).sum() ** 0.5 * 18
wetL = fftconvolve(L, irL)[:N]; wetR = fftconvolve(R, irR)[:N]
mixL = 0.72 * L + 0.55 * wetL; mixR = 0.72 * R + 0.55 * wetR
sos = butter(2, 7000, "low", fs=SR, output="sos"); mixL = sosfilt(sos, mixL); mixR = sosfilt(sos, mixR)
hp = butter(2, 55, "high", fs=SR, output="sos"); mixL = sosfilt(hp, mixL); mixR = sosfilt(hp, mixR)

# Fundidos de entrada/salida
fi = int(2.0 * SR); fo = int(4.0 * SR)
for x in (mixL, mixR):
    x[:fi] *= np.linspace(0, 1, fi) ** 2
    x[-fo:] *= np.linspace(1, 0, fo) ** 2
st = np.stack([mixL, mixR], 1)
st = st / np.max(np.abs(st)) * 0.89
wavfile.write(OUT, SR, (st * 32767).astype(np.int16))
print(f"Música original creada: {OUT} ({DUR:.1f} s)")
