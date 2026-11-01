# Centro Médico Los Andes – Sitio web institucional

Sitio web profesional, rápido y administrable para **Centro Médico Los Andes** (Panamá).

| Componente | Tecnología | Por qué |
|---|---|---|
| Sitio público | [Eleventy 3](https://www.11ty.dev/) genera HTML estático | Muy rápido, seguro (sin base de datos que hackear) y con buen SEO |
| Panel administrativo | [Decap CMS](https://decapcms.org/) en `/admin/` | Editar contenido sin programar, con inicio de sesión |
| Alojamiento | Netlify (plan gratuito) | HTTPS automático, formularios con filtro antispam, dominio propio |
| Citas | WhatsApp con mensaje prellenado | Funciona desde el primer día; preparado para un calendario real |

## Documentación

- **[GUIA-ADMINISTRADOR.md](GUIA-ADMINISTRADOR.md)**: cómo editar contenido, promociones, médicos, menú, fotos y solicitudes.
- **[INSTRUCCIONES-PUBLICACION.md](INSTRUCCIONES-PUBLICACION.md)**: cómo publicar la web, activar el panel y conectar el dominio.

## Páginas incluidas

Inicio · Nosotros · Especialidades médicas · Laboratorio y diagnóstico · Procedimientos médicos · Salud Ocupacional (portal empresarial con formulario de cotización) · Promociones · Blog de salud · Contacto (mapa) · Agendar cita · Política de privacidad · Gracias · 404 · `sitemap.xml` · `robots.txt`.

## Trabajar en su computadora

Requisito: [Node.js 20 o superior](https://nodejs.org/).

```bash
npm install
```

```bash
npm run dev
```

Abra http://localhost:8080. Para usar el panel sin internet, ejecute en otra terminal:

```bash
npm run cms
```

Luego abra http://localhost:8080/admin/ y pulse "Iniciar sesión".

Para generar el sitio final en la carpeta `_site/`:

```bash
npm run build
```

## Estructura

```
src/
  _data/            Configuración editable: clinica.json, menu.json, inicio.json, nosotros.json
  content/          Contenido editable (un archivo .md por elemento)
    especialidades/ laboratorio/ procedimientos/ ocupacional/
    promociones/ medicos/ blog/ paginas/
  _includes/        Plantillas (layouts y componentes)
  assets/           CSS, JS, imágenes (uploads/ = fotos subidas desde el panel)
  admin/            Panel administrativo (Decap CMS)
  *.njk             Páginas principales
eleventy.config.js  Colecciones, filtros y vigencia de promociones
netlify.toml        Publicación y cabeceras de seguridad
.claude/skills/     Skill reutilizable para crear sitios de clínicas
```

## Seguridad y cumplimiento

- HTTPS obligatorio (Netlify) + HSTS, `X-Frame-Options`, `nosniff`, `Referrer-Policy`, `Permissions-Policy` y Content-Security-Policy.
- Formularios con campo trampa (honeypot) antispam, validación de datos y límites de longitud.
- Los formularios públicos **no piden información clínica** y lo advierten al usuario.
- Política de privacidad según la Ley 81 de 2019 de Panamá (revísela con su asesor legal).
- No se incluyen testimonios, precios, certificaciones ni acreditaciones ficticias. Las promociones de ejemplo están en **borrador** (`publicado: false`).
- Panel `/admin/` protegido con inicio de sesión y excluido de buscadores.

## Arquitectura preparada para crecer

- **Reservas con calendario real:** en `assets/js/main.js` el objeto `BookingProviders` permite agregar un proveedor (API propia, SimplyBook, Calendly, etc.). Desde el panel ya se puede cambiar a "Calendario externo" con solo pegar la URL.
- **Correo institucional:** el campo "Correo administrativo" y el "Endpoint externo de formularios" (Formspree, Web3Forms…) se configuran desde el panel.
- **Nuevas pestañas/servicios:** todo se crea desde el panel, sin tocar código.
