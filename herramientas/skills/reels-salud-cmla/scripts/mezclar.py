"""Mezcla la voz (una frase por escena) con música instrumental original y atenúa la música bajo la voz.
Uso: python3 mezclar.py "5.5,7,10.5,..." carpeta_voz audio_salida.m4a
  1er argumento: duraciones de las escenas (iguales a los data-d del HTML, en orden).
Cada frase vN.wav empieza 0.5 s después del inicio de su escena. Volumen final ≈ -15 LUFS (Instagram)."""
import sys, os, subprocess
D = [float(x) for x in sys.argv[1].split(",")]; voz = sys.argv[2]; out = sys.argv[3]
total = sum(D); inicios = [sum(D[:i]) for i in range(len(D))]
aqui = os.path.dirname(os.path.abspath(__file__)); tmp = out + ".tmp"
os.makedirs(tmp, exist_ok=True)
def run(c): subprocess.run(c, check=True)
ins, fil = [], ""
n = len([f for f in os.listdir(voz) if f.startswith("v") and f.endswith(".wav")])
for i in range(n):
    ins += ["-i", os.path.join(voz, f"v{i+1}.wav")]; ms = int((inicios[i] + 0.5) * 1000)
    fil += f"[{i}:a]aresample=44100,adelay={ms}|{ms}[a{i}];"
fil += "".join(f"[a{i}]" for i in range(n)) + f"amix=inputs={n}:normalize=0,highpass=f=80,acompressor=threshold=-20dB:ratio=3:attack=5:release=80,apad=whole_dur={total}[v]"
run(["ffmpeg", "-y", "-v", "error", *ins, "-filter_complex", fil, "-map", "[v]", "-ac", "2", f"{tmp}/voz.wav"])
# loudnorm en un paso aparte: dentro de un grafo con asplit recorta los últimos ~3 s
run(["ffmpeg", "-y", "-v", "error", "-i", f"{tmp}/voz.wav", "-af", f"loudnorm=I=-16:TP=-1.5,apad=whole_dur={total}", "-t", str(total), "-ar", "44100", f"{tmp}/voz-n.wav"])
run(["python3", os.path.join(aqui, "componer-musica.py"), str(total), f"{tmp}/musica.wav"])
run(["ffmpeg", "-y", "-v", "error", "-i", f"{tmp}/voz-n.wav", "-i", f"{tmp}/musica.wav", "-filter_complex",
     f"[0:a]asplit[vz][sc];[1:a]afade=t=in:d=1.5,afade=t=out:st={total-3}:d=3,volume=-17dB[m];[m][sc]sidechaincompress=threshold=0.03:ratio=6:attack=30:release=400[md];[vz][md]amix=inputs=2:normalize=0:duration=longest,alimiter=limit=0.9[out]",
     "-map", "[out]", "-t", str(total), "-ar", "48000", "-c:a", "aac", "-b:a", "256k", out])
print("Audio listo:", out, f"({total} s)")
