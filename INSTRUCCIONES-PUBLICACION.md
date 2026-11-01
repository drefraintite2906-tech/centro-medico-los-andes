# Publicación del sitio y conexión del dominio

Tiempo estimado: 30–45 minutos. Costo: alojamiento gratuito (Netlify, plan gratuito con límites de uso); el dominio tiene costo anual.

---

## Paso 1. Subir el código a GitHub
1. Cree una cuenta gratuita en https://github.com.
2. Cree un repositorio **privado** llamado `centro-medico-los-andes`.
3. Suba esta carpeta. Con Git instalado:

```bash
git init
```

```bash
git add . && git commit -m "Sitio Centro Médico Los Andes"
```

```bash
git branch -M main && git remote add origin https://github.com/SU-USUARIO/centro-medico-los-andes.git && git push -u origin main
```

(También puede usar "Add file → Upload files" en la web de GitHub.)

## Paso 2. Publicar en Netlify (enlace gratuito)
1. Cree una cuenta en https://app.netlify.com e inicie sesión con GitHub.
2. **Add new site → Import an existing project → GitHub →** elija el repositorio.
3. Netlify detecta la configuración de `netlify.toml` (comando `npm run build`, carpeta `_site`). Pulse **Deploy**.
4. En 1–2 minutos tendrá un enlace gratuito como `https://centro-medico-los-andes.netlify.app`. Puede cambiar el nombre en **Site configuration → Change site name**.

HTTPS se activa automáticamente.

## Paso 3. Configurar el panel
Edite `src/admin/config.yml` y cambie:

```yaml
repo: SU-USUARIO/centro-medico-los-andes
```

También cambie `site_url` si usa otro dominio. Guarde y suba el cambio.

## Paso 4. Activar el inicio de sesión del panel (elija una opción)

### Opción A – GitHub (recomendada, ya configurada)
1. En GitHub: **Settings → Developer settings → OAuth Apps → New OAuth App**.
   - Homepage URL: la dirección de su sitio.
   - Authorization callback URL: `https://api.netlify.com/auth/done`
2. Copie el **Client ID** y genere un **Client Secret**.
3. En Netlify: **Site configuration → Access & security → OAuth → Install provider → GitHub**, pegue ambos datos.
4. Cada persona que vaya a editar necesita una cuenta de GitHub y ser añadida como **colaborador** del repositorio (Settings → Collaborators).
5. Entre a `https://SU-SITIO/admin/` → "Iniciar sesión con GitHub".

### Opción B – Correo y contraseña (Netlify Identity), si está disponible en su cuenta
1. En `src/admin/config.yml` comente el bloque `backend: name: github` y active el de `git-gateway`.
2. Añada en `src/admin/index.html`, antes del script de Decap:
   `<script src="https://identity.netlify.com/v1/netlify-identity-widget.js"></script>`
3. En Netlify active **Identity**, ponga el registro en **Invite only**, active **Git Gateway** e invite a los usuarios por correo.

> Si en el futuro Netlify retira alguna de estas funciones, consulte https://decapcms.org/docs/backends-overview/ para otras opciones de inicio de sesión.

## Paso 5. Formularios y correo administrativo
1. Netlify detecta solos los formularios "cotizacion-empresarial" y "contacto" (**Forms** en el menú del sitio). Si no aparecen, active **Forms → Enable form detection** y vuelva a publicar.
2. **Notificaciones por correo:** Forms → **Form notifications → Add notification → Email notification** → escriba el correo administrativo de la clínica para cada formulario.
3. Antispam: ya incluye campo trampa (honeypot) y Netlify filtra spam con Akismet. Para más protección puede activar reCAPTCHA en la configuración de Forms.
4. **Alternativa:** si prefiere otro servicio (Formspree, Web3Forms), pegue su URL en el panel en "Endpoint externo de formularios".

> El plan gratuito tiene un límite mensual de envíos; revise los límites vigentes en su panel de Netlify.

## Paso 6. Ocultar promociones vencidas aunque nadie edite el sitio (recomendado)
1. Netlify → **Site configuration → Build & deploy → Build hooks → Add build hook** y copie la URL.
2. Programe una llamada diaria a esa URL (por ejemplo, con un "cron" gratuito como cron-job.org, método POST, a las 00:05).

El sitio también oculta las promociones vencidas en el navegador del visitante, así que esto es una capa adicional.

## Paso 7. Conectar el dominio personalizado
1. **Verifique la disponibilidad** de `centromedicolosandes.com` (u otra opción) en un registrador como Cloudflare, Namecheap, GoDaddy o en Netlify mismo. Para `.com.pa`, use NIC Panamá (https://nic.pa).
2. Compre el dominio.
3. En Netlify: **Domain management → Add a domain** → escriba `www.centromedicolosandes.com`.
4. Configure el DNS en su registrador (elija una vía):
   - **Más fácil:** cambie los *nameservers* del dominio por los que le indique Netlify (Netlify DNS).
   - **Manteniendo su DNS actual:**
     - Registro `CNAME` para `www` → `SU-SITIO.netlify.app`
     - Registro `A` para el dominio raíz (`@`) → la IP que muestre Netlify en la pantalla de configuración del dominio.
5. Espere la propagación (de minutos a 48 horas). Netlify emitirá el **certificado HTTPS gratuito** (Let's Encrypt) automáticamente; verifique en **HTTPS → Verify DNS configuration**.
6. Active **Force HTTPS** si aparece la opción.
7. Si cambió el dominio, actualice "URL del sitio" en el panel (Datos de la clínica) y `site_url` en `src/admin/config.yml`.

## Paso 8. Posicionamiento en Google (SEO local)
1. **Google Business Profile** (https://business.google.com): cree o reclame la ficha de la clínica con la misma dirección, teléfonos y horario del sitio, y agregue el enlace web. Es lo que más influye en las búsquedas locales ("clínica cerca de mí").
2. **Google Search Console** (https://search.google.com/search-console): agregue el dominio y envíe `https://SU-DOMINIO/sitemap.xml`.
3. Copie las coordenadas exactas de la ficha de Google en el panel (Latitud/Longitud) para reforzar los datos estructurados.
4. Publique artículos en el blog con regularidad y enlace el sitio desde Instagram.

## Lista de verificación antes de anunciar el sitio
- [ ] Logotipo oficial subido.
- [ ] Fotos reales en Inicio y Nosotros.
- [ ] Ubicación del mapa verificada (local B15).
- [ ] Correo administrativo y notificaciones de formularios configurados.
- [ ] Prueba de "Agendar cita" desde un celular (debe abrir WhatsApp).
- [ ] Prueba de cotización empresarial (llega a Forms y al correo).
- [ ] Política de privacidad revisada por asesoría legal.
- [ ] Promociones de ejemplo editadas o eliminadas.
