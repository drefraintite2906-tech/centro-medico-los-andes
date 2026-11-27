# Guía del administrador – Panel de contenidos

**Acceso:** `https://SU-DOMINIO/admin/` (por ejemplo `https://www.centromedicolosandes.com/admin/`).

Cada vez que pulsa **Publicar**, el sitio se actualiza solo en uno o dos minutos.

---

## 1. Datos de la clínica, logo y horarios
**Configuración del sitio → Datos de la clínica**

- **Logotipo oficial:** suba el archivo original (PNG con fondo transparente o SVG). El sitio lo muestra a 56 px de alto con su ancho proporcional, **sin recortar ni cambiar colores**. Si está vacío, se muestra el nombre en texto.
- **Teléfonos, WhatsApp, Instagram, dirección y horarios:** se actualizan en todo el sitio (encabezado, pie, contacto, botones y datos para Google).
- **WhatsApp:** escriba solo números con el código de país (`50760568129`).
- **Correo administrativo:** aparece en el pie y en contacto.
- **Mapa:** para fijar la ubicación exacta, en Google Maps busque la clínica → **Compartir → Insertar un mapa** → copie solo la dirección que aparece dentro de `src="…"` y péguela en "URL del mapa incrustado". Pegue también el enlace de "Copiar vínculo" en "Enlace a Google Maps". **Verifique que el pin quede en el local B15.**

## 2. Menú (pestañas y subcategorías)
**Configuración del sitio → Menú de navegación**

- Arrastre para reordenar, edite textos o añada pestañas.
- Cada pestaña puede tener **subcategorías** (menú desplegable).
- El enlace puede ser una página (`/promociones/`), una sección (`/salud-ocupacional/#cotizacion`) o una página nueva creada en el punto 8.

## 3. Especialidades, laboratorio, procedimientos y salud ocupacional
Cada colección funciona igual:

1. Entre a la colección y pulse **Nuevo/a…** o abra un elemento para editarlo.
2. Complete nombre, **icono**, descripción y, si desea, una fotografía.
3. **Orden:** el número más bajo aparece primero.
4. **Publicado:** desactívelo para ocultarlo sin borrarlo.
5. Pulse **Publicar**.

Detalles por colección:
- **Laboratorio:** incluye "Preparación del paciente" y un "Catálogo de pruebas" opcional (una prueba por línea).
- **Salud Ocupacional:** elija el **Grupo** (evaluaciones, complementarias, prevención o servicios en empresas) para que aparezca en la sección correcta.
- Las especialidades, los servicios de laboratorio y los procedimientos se añaden **automáticamente** a la lista del formulario "Agendar cita".

**Iconos disponibles:** estetoscopio, diente, cerebro, conversacion (psicología), hueso, manzana, cruz, matraz, gota, tubo, ultrasonido, electro, microscopio, tijeras, jeringa, suero, vendaje, certificado, escolar, anillos, mano, mujer, maletin, portapapeles, escudo, casco, oido, ojo, pulmon, movimiento, usuarios, edificio, alerta, sirena, capacitacion, corazon, diana, medico, vehiculo, ingreso, retiro, periodico, pastilla, etiqueta, libro, mas.

## 4. Médicos y horarios
**Médicos y horarios → Nuevo profesional**: nombre, especialidad (se elige de la lista), foto, horario y una breve presentación. Al publicar al menos uno, aparece la sección "Nuestro equipo" en Nosotros y Especialidades, y un selector de profesional en "Agendar cita".
> Incluya solo títulos y formación verificables. Hay un ejemplo en borrador que puede editar o eliminar.

## 5. Promociones y paquetes
**Promociones y paquetes → Nueva promoción**

- Imagen, título, categoría, descripción, **precio opcional** (si lo deja vacío no se muestra).
- **Vigente desde / hasta:** la promoción **aparece y desaparece sola** según estas fechas.
- **Destacar en inicio:** la muestra en la portada (máximo 3).
- Hay dos promociones de ejemplo en borrador: edítelas o elimínelas.
- Si no hay promociones vigentes, el sitio muestra un mensaje invitando a consultar por WhatsApp.

> Recomendación técnica: el sitio también vuelve a ocultar promociones vencidas en el navegador del visitante, pero conviene programar una reconstrucción diaria en Netlify (ver INSTRUCCIONES-PUBLICACION.md, paso 6).

## 6. Blog de salud
**Blog de salud → Nuevo artículo**: título, fecha, resumen, imagen de portada y contenido (editor con negritas, listas, títulos y enlaces). Se recomienda revisión médica antes de publicar. Los artículos incluyen automáticamente un aviso de que no sustituyen la consulta.

## 7. Textos de Inicio y Nosotros
**Configuración del sitio → Página de inicio / Página Nosotros**: título principal, subtítulo, **fotografía principal**, tarjetas de áreas, bloque empresarial, misión, visión, valores y fotos.

**Fotografías:** use fotos reales de la clínica y del equipo (con autorización de las personas que aparecen). Formato horizontal o vertical de al menos 1200 px; el panel las guarda en `assets/img/uploads/`.

## 7b. Carrusel de imágenes (portada y Nosotros)
- **Portada:** Configuración del sitio → Página de inicio → **Carrusel de fotos de la portada** → "Añadir". Suba cada foto con **"Elige una imagen" → Subir** (no use "Insert from URL"), escriba una descripción y, si desea, un texto sobre la foto. Puede ordenarlas arrastrando y elegir los **segundos entre fotos**.
- Mientras el carrusel esté vacío, la portada muestra **ilustraciones genéricas** de la clínica. Al subir la primera foto, se reemplazan automáticamente.
- **Nosotros:** Configuración del sitio → Página Nosotros → **Galería de instalaciones**. La sección "Nuestras instalaciones" aparece al subir la primera foto.
- Recomendado: 3 a 6 fotos horizontales, de al menos 1200 px, livianas (menos de 500 KB cada una).

## 8. Crear una página o pestaña nueva
1. **Páginas nuevas → Nueva página**: título, descripción y contenido. Publicar.
2. La dirección será `/titulo-de-la-pagina/` (sin tildes ni espacios).
3. Agréguela al menú en **Configuración → Menú de navegación**.

## 9. Solicitudes recibidas
| Tipo | Dónde llegan |
|---|---|
| **Citas** | Directamente al WhatsApp **+507 6056-8129**, con un mensaje ordenado. Siempre confirme la disponibilidad al paciente: el sitio le advierte que su solicitud **no** es una cita confirmada. |
| **Cotizaciones empresariales** y **Contacto** | Si el usuario pulsa "Enviar solicitud": en **Netlify → su sitio → Forms** (con aviso por correo, ver publicación, paso 5). Si pulsa "Enviar por WhatsApp": al WhatsApp de la clínica. |

En Netlify → Forms puede ver, exportar a CSV, marcar como spam o borrar cada solicitud.

## 10. Usuarios del panel
Solo pueden entrar personas autorizadas (ver INSTRUCCIONES-PUBLICACION.md, paso 4). Para retirar el acceso de un empleado, quítelo como colaborador del repositorio (o de Identity, según la opción elegida).

## 11. Pantalla de la sala de espera (Modo TV)
- **TV con internet (Smart TV, TV box o Chromecast con navegador):** abra `https://centromedicolosandes.netlify.app/tv/` y póngalo en pantalla completa. La presentación avanza sola, se repite sin fin, muestra la hora y **se actualiza sola** con lo que cambie en el panel (servicios, promociones vigentes, horarios).
- **TV sin internet:** copie `material-impreso/video-sala-espera-con-musica.mp4` (o la versión sin música) a una memoria USB y reprodúzcalo en modo "repetir". Cuando cambie el contenido, pida regenerar el video (`npm run video:tv`).

---

## Mi control de salud (aplicación de pacientes, aparte del sitio web)
**Dirección:** https://drefraintite2906-tech.github.io/centro-medico-los-andes/ · QR listo en `material-impreso/qr-mi-salud.png`. **Solo para pacientes:** no aparece en el sitio web ni en buscadores; se entrega con el QR o el enlace.

**Dónde vive:** carpeta `app-pacientes/` de este repositorio. Se publica **gratis en GitHub Pages** y **no usa créditos de Netlify**: aunque el sitio web esté pausado, la app sigue funcionando. Cada cambio en esa carpeta se publica solo en 1–2 minutos (pestaña **Actions** del repositorio).

**Activación (una sola vez):** en GitHub, repositorio → **Settings → Pages → Build and deployment → Source: GitHub Actions**. Luego en **Actions → Publicar app de pacientes → Run workflow**.

**Qué hace:** el paciente anota su **presión arterial** (sistólica, diastólica, pulso, fecha, hora, brazo y posición), su **glicemia** (valor, momento, fecha y hora) y sus **exámenes** (resultado y foto o PDF). Desde la pestaña **Enviar** genera una **imagen con el logo, gráficas y tablas** y la envía a su médico como prefiera: **WhatsApp**, **correo electrónico** o **cualquier otra aplicación** del teléfono (Telegram, Outlook, etc.), con el texto del resumen y las fotos de los exámenes. También puede **imprimirla o guardarla en PDF** para llevarla a la consulta.

**Costo cero y privacidad:** no hay servidor ni base de datos. Los datos quedan **solo en el teléfono del paciente**. La clínica únicamente recibe lo que el paciente decide enviar.

**Cómo entregarla al paciente:**
1. Envíele el enlace por WhatsApp o muéstrele el QR en la consulta.
2. Pídale que la **agregue a la pantalla de inicio** (Android: menú ⋮ → *Instalar aplicación*; iPhone: Compartir → *Agregar a inicio*). En iPhone esto evita que Safari borre los datos tras varios días sin uso.
3. Si su médico tiene otra meta, el paciente la cambia en **Mis datos → Metas indicadas por mi médico** (por defecto: PA < 130/80; glicemia en ayunas 80–130; 2 h después de comer < 180 mg/dL).
4. Recomiéndele **crear un respaldo** una vez al mes (Mis datos → Crear respaldo) y guardarlo en Drive, iCloud o su propio chat.

**Consentimiento informado y confidencialidad:** al empezar, el paciente (o su representante legal, si es menor o no puede decidir) lee el consentimiento completo y marca dos casillas obligatorias: el **consentimiento** para registrar sus datos de salud en el dispositivo y la **autorización** para que la clínica y su médico reciban, usen para su atención e incorporen a su expediente lo que él envíe, bajo confidencialidad y secreto profesional (Ley 81 de 2019 y Ley 68 de 2003). La app guarda la fecha, la versión y quién aceptó. Cada resumen que llega por WhatsApp va marcado como **CONFIDENCIAL – uso exclusivo del médico tratante** e incluye esa constancia. El paciente puede **retirar su consentimiento** en «Mis datos», lo que borra sus datos del teléfono. El texto está en `app-pacientes/index.html` (bloque `texto-consentimiento`); si lo cambia, suba la versión en `CONSENT_VERSION` de `assets/app.js` para que todos lo acepten de nuevo. **Recomendación:** pida a su asesor legal que revise el texto.

**Avisos automáticos:** al guardar una presión de 180/120 o más, una presión baja, una glicemia menor de 70 o de 300 o más, la app muestra qué hacer y cuándo acudir a urgencias.

**Limitaciones:** si el paciente cambia de teléfono sin respaldo, pierde los datos; el médico no ve nada hasta que el paciente lo envía; no hay recordatorios automáticos. **No cambie la dirección de la app**: los datos de cada paciente quedan ligados a esa dirección.

### Foto del plato (Alimentación)
La pestaña **Comidas** permite al paciente anotar lo que come. Además de buscar en la tabla o escribir a mano, puede **tomar una foto del plato** y la inteligencia artificial de Anthropic estima las calorías (el paciente siempre revisa y corrige antes de guardar). Esta función **necesita una clave** que usted crea una sola vez. Sin la clave, el resto de la app funciona igual y la foto simplemente avisa que no está disponible.

**Paso a paso (sin programar):**
1. Entre a **console.anthropic.com** y cree una cuenta con el correo de la clínica. Agregue una tarjeta y un saldo inicial pequeño.
2. En la consola, abra **API Keys → Create Key**, póngale un nombre (por ejemplo «App pacientes») y **copie la clave** (empieza con `sk-ant-`). Solo se muestra una vez; no la envíe por WhatsApp ni la escriba en ningún archivo del repositorio.
3. **Ponga un límite de gasto mensual** (por ejemplo **US$ 50**) en la consola, en la sección de **Limits** o **Billing**. Así el costo nunca pasa de ese monto.
4. Entre a **Netlify → su sitio → Site configuration → Environment variables → Add a variable** y cree:
   - `ANTHROPIC_API_KEY` = la clave copiada en el paso 2 (obligatoria).
   - `LIMITE_MENSUAL_FOTOS` = número máximo de fotos al mes entre todos los pacientes (opcional; si no la crea, el límite es **3000**).
   - Además, cada teléfono puede enviar como máximo **20 fotos al día**. **Cada intento cuenta** para el límite diario y el mensual, **aunque el análisis falle** (sin conexión con la IA, foto que no es comida, etc.).
5. Haga un **nuevo despliegue**: **Deploys → Trigger deploy → Deploy site**. Las variables solo se aplican al desplegar de nuevo.

**Cómo probar:** con un teléfono, abra la app, **Comidas → Foto del plato** y pruebe con **20 fotos reales** de platos típicos (arroz con pollo, sancocho, hojaldras, ensaladas, bebidas, etc.). Revise que el nombre, la porción y las calorías sean razonables. Las estimaciones por foto son **aproximadas**; por eso el paciente debe confirmarlas. Si la app muestra «No se pudo analizar la foto; búsquela en la tabla.» en todas las fotos, revise la clave y el saldo en la consola de Anthropic; ese mismo mensaje aparece si falla el almacenamiento de Netlify donde se llevan los contadores de fotos (Netlify Blobs), y en ese caso la foto no se analiza.

**Revisión de la tabla de alimentos (obligatoria antes de usarla con pacientes):** los valores de `app-pacientes/assets/alimentos.json` son **estimaciones preparadas, no verificadas**. Un **médico o nutricionista** de la clínica debe revisarlos y corregir lo que haga falta (cada alimento tiene calorías, carbohidratos, proteína, grasa, grasa saturada y sodio por porción). Cuando termine, al inicio del archivo cambie:
- `"revisado": true`
- `"revisadoPor": "Nombre y apellido del profesional"`
- `"fechaRevision": "2026-12-15"` (la fecha real, año-mes-día)

y publique el cambio. Mientras diga `false`, la app muestra el aviso de que la tabla no ha sido revisada.

**Cuando se conecte el dominio propio de la clínica:** hay que actualizar **dos cosas** en `app-pacientes/index.html`, o la foto dejará de funcionar: (1) `"urlIA"` dentro del bloque `clinica-config`, con la nueva dirección (termina en `/api/analizar-plato`); y (2) en la política de seguridad (`Content-Security-Policy`, parte `connect-src`), el nuevo dominio en lugar de `https://centromedicolosandes.netlify.app`. Luego suba el número `?v=` de `app.js` y ponga el mismo número en la lista `PRECACHE` de `app-pacientes/sw.js`.

**Privacidad:** la foto se envía solo para estimar calorías, no se guarda en la clínica, y la app pide permiso aparte al paciente la primera vez. El texto general del consentimiento ya lo menciona.
