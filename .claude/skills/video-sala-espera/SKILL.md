---
name: video-sala-espera
description: Crear, actualizar o regenerar el video y la presentación "Modo TV" para la televisión de la sala de espera de una clínica (diapositivas 16:9 animadas con servicios, especialidades, laboratorio, procedimientos, salud ocupacional, promociones, consejos, horario y códigos QR). Usar cuando pidan un video institucional, presentación para TV, pantalla de sala de espera, señalización digital o actualizar el video después de cambiar servicios o promociones.
---

# Video y Modo TV para sala de espera

## Qué existe en este proyecto
- `src/tv.njk` → página `/tv/` (presentación en bucle, 1920×1080 escalada a cualquier pantalla). Toma TODO el contenido del CMS: `clinica.json`, `inicio.json`, `ocupacional.json`, `faq.json` y las colecciones (especialidades, laboratorio, procedimientos, ocupacional, promociones vigentes).
- `src/assets/css/tv.css`, `src/assets/js/tv.js` → estilos y motor (avance automático, reloj de Panamá, oculta promociones vencidas, recarga cada 6 h). `?grabar=1` desactiva el avance y el reloj y expone `window.tv.{total,duraciones,mostrar(i)}`.
- `src/assets/img/qr/` → QR del sitio (corrección Q) y WhatsApp (corrección M, URL corta) optimizados para pantalla.
- `herramientas/grabar-video-tv.cjs` → `npm run video:tv` genera `material-impreso/video-sala-espera.mp4` (H.264, 1920×1080, 30 fps, yuv420p, faststart) y luego `video-sala-espera-con-musica.mp4`.
- `herramientas/componer-musica.py <segundos> <salida.wav>` → compone música instrumental ORIGINAL (sin derechos de terceros, semilla fija): pad Cmaj7–Am7–Fmaj7–G a 66 BPM, bajo suave, arpegio tipo piano, campanitas cada 4 compases, reverb de sala, HPF 55 Hz / LPF 7 kHz, fundidos 2 s/4 s. Requiere `pip install numpy scipy`. Se normaliza con `loudnorm=I=-18:TP=-2` y se codifica AAC 192k (`material-impreso/musica-sala-espera.m4a`).

## Cómo graba (no cambiar el método)
Captura determinista cuadro a cuadro: por cada diapositiva llama `tv.mostrar(k)`, toma `document.getAnimations()`, las pausa y fija `currentTime = f*1000/fps` antes de cada `page.screenshot` (JPEG q92) que se envía por tubería a ffmpeg (`image2pipe` → libx264 crf 18). Resultado fluido sin importar la velocidad del equipo. ~3–4 min para ~110 s de video.
No usar `recordVideo` de Playwright (baja calidad, saltos).

## Pasos para actualizar el video
1. `git pull` (el personal edita contenido desde el panel).
2. Si se agrega una diapositiva: sección `<section class="slide" data-dur="N">` en `tv.njk`; elementos animados con clase `a` y `style="--d:0.3s"` (retraso escalonado). Variantes: `slide--light`, `slide--navy`, `slide--hero`, `slide--promo`. El área útil termina en y=970 (barra inferior de 110 px).
3. `npm run video:tv`.
4. Verificar: `ffprobe` (1920x1080, 30/1, h264) y extraer cuadros con `ffmpeg -ss T -frames:v 1` en varias diapositivas; comprobar con OpenCV (`cv2.QRCodeDetector().detectAndDecodeMulti`) que los QR se leen desde el cuadro.
5. Enviar el MP4 al usuario y hacer commit.

## Reglas de contenido
- Nada inventado: sin precios, testimonios ni acreditaciones que no estén en el CMS. Promociones solo si están publicadas y vigentes; si no hay, diapositiva genérica "Pregunte por nuestras promociones".
- Textos legibles a distancia: títulos ≥ 64 px, cuerpo ≥ 23 px, contraste alto, máximo ~6 elementos por diapositiva.
- Incluir siempre barra inferior con teléfonos, WhatsApp e Instagram, y una diapositiva final con QR para agendar.
- Música: solo instrumental, original o con licencia libre comprobable (nunca descargar canciones comerciales). Volumen de fondo −18 LUFS, sin cambios bruscos. Verificar sin saturación (pico < 0.99) y con espectrograma (`showspectrumpic`). Entregar siempre ambas versiones: con y sin música.
- Duración 8–11 s por diapositiva.

## Cómo usarlo en la TV
- **Smart TV / TV box / Chromecast con navegador:** abrir `https://<sitio>/tv/` a pantalla completa (F11). Se actualiza sola con los cambios del panel.
- **TV sin internet:** copiar el MP4 a una USB y reproducir en bucle (modo "repetir"). Regenerar el video cuando cambie el contenido.
