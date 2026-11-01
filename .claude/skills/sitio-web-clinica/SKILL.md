---
name: sitio-web-clinica
description: Crear o ampliar sitios web profesionales para clínicas y centros médicos (especialmente en Panamá/Latinoamérica) con panel administrativo sin programar, citas por WhatsApp, portal empresarial de salud ocupacional, SEO local y cumplimiento ético-médico. Usar cuando pidan una página web para una clínica, consultorio, laboratorio, centro odontológico o servicio de salud ocupacional, o cambios a este proyecto.
---

# Sitio web para clínica médica

## Arquitectura por defecto (probada en Centro Médico Los Andes)
- **Eleventy 3** (HTML estático: rápido, seguro, buen SEO) + **Decap CMS** en `/admin/` (versión fijada) + **Netlify** (HTTPS, Forms con honeypot, dominio propio).
- Contenido: `src/_data/*.json` (datos únicos: clínica, menú, inicio, nosotros) y `src/content/<colección>/*.md` (un archivo por elemento, con `orden` y `publicado`).
- Colecciones definidas en `eleventy.config.js` por glob, filtrando `publicado !== false` y ordenando por `orden`.
- Iconos SVG propios en `src/_config/icons.js` vía shortcode `{% icon "nombre" %}`; la misma lista va como `select` en `admin/config.yml`.
- Menú editable (`menu.json`) con subcategorías; páginas nuevas en `content/paginas` con permalink `/<slug>/`.

## Reglas de contenido (obligatorias)
- **Nunca** inventar testimonios, precios, años de experiencia, certificaciones, acreditaciones, médicos ni fotos de "nuestro equipo". Ejemplos van con `publicado: false`.
- Formularios públicos sin datos clínicos sensibles; advertirlo en el campo de comentarios.
- Citas: dejar claro que es **solicitud, no cita confirmada**. Aviso de emergencias.
- Procedimientos: "sujetos a valoración médica y disponibilidad".
- Blog: aviso de que no sustituye la consulta; recomendar revisión médica.
- Panamá: política de privacidad bajo Ley 81 de 2019; tel `tel:+507XXXXXXX`; WhatsApp `https://wa.me/507XXXXXXXX`.
- Ubicación: no inventar coordenadas; usar búsqueda de Maps y campo para URL de inserción verificada.

## Funcionalidad clave
- Cita → formulario validado → WhatsApp con mensaje organizado (`BookingProviders` para futuro calendario/API; opción "calendario externo" desde el panel).
- Cotización empresarial → Netlify Forms (o endpoint externo configurable) **y** botón WhatsApp; checkboxes de servicios obligatorios.
- Promociones con `vigencia_desde/hasta`: filtro al compilar + ocultamiento en navegador (hora de Panamá UTC-5) + build hook diario.
- SEO: JSON-LD `MedicalClinic` generado desde `clinica.json`, títulos/descripciones por página, `sitemap.xml`, `robots.txt` (excluye /admin), OG tags, `lang="es-PA"`.
- Seguridad: CSP por `<meta>` solo en páginas públicas (el panel necesita scripts externos), cabeceras HSTS/nosniff/frame en `netlify.toml`, sin scripts inline (configuración en `<script type="application/json">`).

## Diseño
- Paleta institucional sobria (p. ej. navy #102D54, blanco, azul claro #EAF2F9, azul #3276AC, gris #F4F6F8); Montserrat (títulos) + Inter (texto).
- Logo: espacio con `height` fijo y `width:auto; object-fit:contain` (no deformar); texto de respaldo si no hay logo.
- Sin fotos de stock disponibles: portada con panel informativo real (horario, servicios) y campos de imagen en el panel.
- Navegación: pasar a menú hamburguesa cuando no quepan los ítems (verificar sin desbordes en 1280/1366/1440 y 360/390 px).

## Verificación antes de entregar
1. `npx eleventy` sin errores.
2. Playwright: capturas escritorio y móvil de todas las páginas; `scrollWidth` sin desborde horizontal; consola sin errores.
3. Probar envío de cita y cotización interceptando `window.open` y revisar el texto de WhatsApp.
4. Probar promoción vencida vs vigente.
5. Panel: `npx decap-server` + `local_backend: true`, verificar que liste colecciones y cargue datos.

## Entregables
README.md (arquitectura), GUIA-ADMINISTRADOR.md (editar sin programar), INSTRUCCIONES-PUBLICACION.md (GitHub → Netlify → OAuth del panel → Forms y correo → build hook → dominio y DNS → Google Business Profile/Search Console).
