#!/usr/bin/env bash
# Graba el reel en N partes simultáneas (una por núcleo) y las une. Necesario para 4K (~1 s por cuadro).
# Uso: grabar-paralelo.sh reel.html salida.mp4 [DSF=2] [FPS=30]
# Correr en segundo plano con timeout largo: 82 s en 4K con 4 núcleos tarda ~40-60 min.
set -euo pipefail
HTML="$1"; OUT="$2"; DSF="${3:-2}"; FPS="${4:-30}"
AQUI="$(cd "$(dirname "$0")" && pwd)"; N=$(nproc)
TOTAL=$(HTML="$HTML" node "$AQUI/grabar.cjs" fotos | awk '/TOTAL/{print $2}')
CUADROS=$(python3 -c "print(round($TOTAL*$FPS))"); TRAMO=$(( (CUADROS + N - 1) / N ))
echo "$TOTAL s · $CUADROS cuadros · $N partes"
LISTA="$OUT.partes.txt"; : > "$LISTA"
for k in $(seq 0 $((N-1))); do
  HTML="$HTML" DSF="$DSF" FROM=$((k*TRAMO)) TO=$(((k+1)*TRAMO)) node "$AQUI/grabar.cjs" video "$OUT.parte$k.mp4" "$FPS" > "$OUT.parte$k.log" 2>&1 &
  echo "file '$(realpath -m "$OUT.parte$k.mp4")'" >> "$LISTA"
done
wait
ffmpeg -y -v error -f concat -safe 0 -i "$LISTA" -c copy "$OUT"
echo "Video sin audio: $OUT"
