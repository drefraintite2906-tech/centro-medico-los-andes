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
