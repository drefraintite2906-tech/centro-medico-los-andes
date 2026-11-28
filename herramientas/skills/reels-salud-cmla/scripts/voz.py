"""Genera la voz en off femenina (Kokoro TTS, voz ef_dora, licencia Apache 2.0, uso comercial permitido).
Uso: python3 voz.py textos.json carpeta_salida [velocidad=1.05]
  textos.json: lista de frases, una por escena, en orden.
Salida: v1.wav..vN.wav y duraciones.json (segundos de cada frase).
Descarga los modelos desde GitHub la primera vez (~350 MB) en ~/.cache/kokoro.
Requisitos: pip install kokoro-onnx soundfile"""
import sys, json, os, urllib.request
import soundfile as sf
from kokoro_onnx import Kokoro
CACHE = os.path.expanduser("~/.cache/kokoro"); os.makedirs(CACHE, exist_ok=True)
BASE = "https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0/"
for f in ("kokoro-v1.0.onnx", "voices-v1.0.bin"):
    p = os.path.join(CACHE, f)
    if not os.path.exists(p) or os.path.getsize(p) < 1_000_000:
        print("Descargando", f); urllib.request.urlretrieve(BASE + f, p)
textos = json.load(open(sys.argv[1], encoding="utf-8")); out = sys.argv[2]
vel = float(sys.argv[3]) if len(sys.argv) > 3 else 1.05
os.makedirs(out, exist_ok=True)
k = Kokoro(os.path.join(CACHE, "kokoro-v1.0.onnx"), os.path.join(CACHE, "voices-v1.0.bin"))
dur = []
for i, t in enumerate(textos):
    s, sr = k.create(t, voice="ef_dora", speed=vel, lang="es")
    sf.write(os.path.join(out, f"v{i+1}.wav"), s, sr); dur.append(round(len(s) / sr, 2))
json.dump(dur, open(os.path.join(out, "duraciones.json"), "w"))
print("Duraciones de voz (s):", dur)
print("Duración mínima de cada escena (voz + 1.3 s):", [round(d + 1.3, 1) for d in dur])
