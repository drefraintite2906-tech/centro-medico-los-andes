# Mi control de salud – aplicación de pacientes

Aplicación web independiente (sin servidor) de Centro Médico Los Andes. Se publica en GitHub Pages con `.github/workflows/app-pacientes.yml`:
https://drefraintite2906-tech.github.io/centro-medico-los-andes/

- `index.html`: pantallas (bienvenida, presión, glicemia, exámenes, enviar, mis datos).
- `assets/app.js`: lógica. Datos en el dispositivo (localStorage + IndexedDB), gráficas en canvas, resumen PNG y envío por WhatsApp.
- `assets/nutri.js`: cálculos de alimentación (meta de calorías, totales del día, avisos, búsqueda en la tabla).
- `assets/alimentos.json`: tabla de alimentos (valores por porción; `revisado: false` hasta que un médico o nutricionista la verifique). `sw.js` la guarda para uso sin internet.
- Pestaña **Comidas**: el paciente registra lo que come buscando en la tabla, a mano o con **Foto del plato** (la imagen se envía a la función `netlify/functions/analizar-plato.mjs`, que consulta a Anthropic; pide permiso aparte). El resumen para el médico incluye la sección «Alimentación». Configuración de la foto: ver «Foto del plato» en `GUIA-ADMINISTRADOR.md`.
- `assets/sitio.css`: copia de los estilos del sitio web · `assets/app.css`: estilos propios.
- `manifest.webmanifest` y `sw.js`: instalable y funciona sin internet.

Después de cambiar `app.js`, `nutri.js` o los CSS, suba el número `?v=` en `index.html` para que los teléfonos descarguen la versión nueva.

Si cambia `assets/alimentos.json` u otros archivos que deban llegar sin internet, suba también `CACHE` en `sw.js` (hoy `cmla-mi-salud-v2`).
