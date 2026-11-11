# Mi control de salud – aplicación de pacientes

Aplicación web independiente (sin servidor) de Centro Médico Los Andes. Se publica en GitHub Pages con `.github/workflows/app-pacientes.yml`:
https://drefraintite2906-tech.github.io/centro-medico-los-andes/

- `index.html`: pantallas (bienvenida, presión, glicemia, exámenes, enviar, mis datos).
- `assets/app.js`: lógica. Datos en el dispositivo (localStorage + IndexedDB), gráficas en canvas, resumen PNG y envío por WhatsApp.
- `assets/sitio.css`: copia de los estilos del sitio web · `assets/app.css`: estilos propios.
- `manifest.webmanifest` y `sw.js`: instalable y funciona sin internet.

Después de cambiar `app.js` o los CSS, suba el número `?v=` en `index.html` para que los teléfonos descarguen la versión nueva.
