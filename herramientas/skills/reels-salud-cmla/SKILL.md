---
name: reels-salud-cmla
description: Producir Reels y videos verticales educativos de salud para Centro Médico Los Andes (CMLA) — animados, con logo arriba, voz en off femenina en español, música original, texto de publicación y opción de 4K y estilo cartoon — y dejarlos listos o programados en Metricool. Úsalo siempre que el usuario pida un video, reel, TikTok o historia sobre una enfermedad, síntomas, signos de alarma, prevención, primeros auxilios, cuidados en casa o "cuándo acudir al médico" (dengue, malaria, heridas, diabetes, hipertensión, etc.), o diga "hazme otro igual", "otro como el del dengue", aunque no mencione este skill.
---

# Reels educativos de salud – CMLA

Pieza vertical 9:16 de 75–90 s hecha con HTML + animaciones, grabada cuadro a cuadro con Playwright (resultado fluido y determinista), con voz y música mezcladas con ffmpeg. Combínalo con `identidad-visual-cmla` (logo, colores, tono) y, para programar, con `campanas-interactivas-instagram`.

Quien pide estos videos es médico. Le importa que el contenido sea **correcto y prudente**, que se vea profesional, que el logo sea el original y que el material quede listo para publicar sin pasos extra.

## 1. Contenido (lo más importante)

Estructura que ha funcionado (adáptala al tema):
1. Gancho con pregunta ("¿Fiebre con escalofríos? Podría ser MALARIA").
2. Qué es / cómo se transmite (dato local de Panamá si aplica).
3. Síntomas (6 como máximo, frases cortas).
4. Diagnóstico o pasos de cuidado en casa, según el tema.
5. Por qué acudir al médico (3 razones).
6. Lo que NO hay que hacer (automedicación, remedios caseros), cuando aplique.
7. Signos de alarma o de gravedad en **fondo rojo**, cerrando con "Acude a URGENCIAS de inmediato" (o "llama al 911").
8. Prevención (3 puntos).
9. CMLA: qué ofrece la clínica para ese problema, con el horario.
10. Cierre: logo grande, "Tu salud es nuestra razón de ser", WhatsApp, teléfonos, local B15 y el aviso "Información educativa. No sustituye la valoración médica".

Reglas:
- Basa todo en OMS/OPS, MINSA Panamá, CDC o Cruz Roja. Usa lenguaje de paciente y el trato de tú.
- **No prometas servicios que no constan.** Revisa `src/_data/` y `src/content/` del sitio (laboratorio, procedimientos). Si no consta (por ejemplo, gota gruesa), escribe "te evaluamos y te orientamos" y pregúntale al usuario en el mensaje final.
- Datos de la clínica: `src/_data/clinica.json` (WhatsApp +507 6056-8129, teléfonos 237-9094 / 237-6615, C.C. Los Andes local B15, horario: lunes a sábado 8 a. m.–8 p. m., domingos y feriados 9 a. m.–5 p. m.). Instagram: @centromedico.losandes.
- Al entregar, pide que el médico revise el contenido clínico y señala cualquier dato que conviene confirmar (zonas endémicas, servicios).

## 2. Montaje

```
scripts/        grabar.cjs, grabar-paralelo.sh, voz.py, mezclar.py, componer-musica.py
assets/         plantilla-institucional.html (azul/blanco), plantilla-cartoon.html (contornos negros, mascota "Curi"), logo.jpg
```

1. Trabaja en el scratchpad. Copia la plantilla y `assets/logo.jpg` (o el logo que envíe el usuario; nunca lo redibujes). Instala las fuentes junto al HTML: `npm i @fontsource/montserrat @fontsource/poppins @fontsource/open-sans`.
2. **Escribe primero la narración**: una frase por escena, en un JSON. Corre `python3 scripts/voz.py textos.json voz/`. Cada escena debe durar al menos voz + 1,3 s; pon esas duraciones en los `data-d` de las `<section class="esc">`.
3. Edita las escenas reutilizando las clases de la plantilla (`.rv`, `.pop` con `--i` para el orden de entrada, `.lista/.item`, `.tarjeta`, `#escAlarma` = fondo rojo, `#escCierre` = fondo blanco y oculta el logo de arriba). El logo arriba (`#cab`) va en todas las escenas menos el cierre.
4. Revisa antes de grabar: `HTML=reel.html node scripts/grabar.cjs fotos 4 15 30 ...` y mira los cuadros (une varios con `ffmpeg ... hstack`). Busca textos que se encimen, huecos grandes y elementos tapados. Toma el cuadro al final de cada escena (inicio + duración − 0,7 s).
5. Graba:
   - HD 1080×1920: `HTML=reel.html node scripts/grabar.cjs video sin-audio.mp4 30` (unos 5 min).
   - **4K 2160×3840** (si piden "mayor resolución"): `scripts/grabar-paralelo.sh reel.html sin-audio.mp4 2` **en segundo plano con timeout largo**. Cada cuadro 4K tarda ~1 s; un solo proceso pasa de 1 hora y lo corta el límite. Por eso se divide en tantas partes como núcleos.
6. Audio: `python3 scripts/mezclar.py "<duraciones separadas por coma>" voz/ audio.m4a`. Luego une sin recodificar: `ffmpeg -i sin-audio.mp4 -i audio.m4a -map 0:v -map 1:a -c copy -movflags +faststart final.mp4`. Verifica con ffprobe que el video y el audio duren lo mismo.

Estilos:
- **Institucional** (por defecto): azul #0A4496, blanco, Montserrat/Poppins/Open Sans, tarjetas con transparencia.
- **Cartoon** (cuando piden "tipo caricatura", "cartoon", "animado para niños"): contornos negros gruesos, colores planos, fondos de rayos giratorios, sombras duras, efecto "hervido" de línea y mascota original Curi. Inspírate en el estilo, nunca copies personajes ni marcas de terceros (Cartoon Network, Disney, etc.). Si lo piden, aclara que es un estilo original.

## 3. Entrega

Guarda en el repositorio, en `material-impreso/reel-<tema>/`:
- `reel-<tema>-cmla.mp4` (o `-4k.mp4`).
- `portada-reel-<tema>.jpg` (el cuadro del gancho).
- `historias/1-...jpg` a `4-...jpg`: 4 cuadros clave, como síntomas, alarma y CMLA.
- `texto-publicacion.md`: texto listo para pegar, con emojis, llamado a escribir por mensaje directo, contactos, aviso educativo y 3 a 6 hashtags.
- `voz-narracion.py` (o los textos) y el HTML fuente.

Haz commit y push a la rama de trabajo. Envía el video con SendUserFile. En el mensaje resume las escenas, di qué no pudiste verificar (no puedes escuchar el audio, así que pide que lo escuchen) y ofrece programarlo.

## 4. Voz

Kokoro TTS es offline y de uso comercial, pero tiene **una sola voz femenina en español** (`ef_dora`), con acento latino neutro. El servicio de Microsoft (voz panameña es-PA-MargaritaNeural) suele estar bloqueado por la red. Si el usuario quiere otra voz, ofrece montar una grabación real hecha con celular.
Escribe la pronunciación difícil de forma fonética en el texto de la voz (no en pantalla): "Aedes egipti", "Anófeles", "nueve, uno, uno".

## 5. Programar en Metricool

Sigue `campanas-interactivas-instagram` (blogId 7963108, America/Panama). Lo que funcionó:
- Media pública: si el repositorio es público, usa la URL raw de GitHub fijada al commit (`https://raw.githubusercontent.com/<owner>/<repo>/<sha>/material-impreso/...`). Metricool copia el archivo a sus servidores.
- Plan por tema: **un solo Reel** (no repetir el mismo Reel, Instagram lo penaliza) a las 10:00 entre semana (la hora con más actividad según Metricool) y **4 historias** con los cuadros clave en días alternos a las 17:00. Revisa antes con getScheduledPosts para no chocar con reels ya programados.
- Crea todo como **borrador** (`autoPublish: false, draft: true`) y activa solo cuando el usuario confirme.
- Reel con voz sintética: `isAiGenerated: true`. Las historias no llevan texto. Los stickers no se pueden crear por API; ofrece ponerlos a mano.
