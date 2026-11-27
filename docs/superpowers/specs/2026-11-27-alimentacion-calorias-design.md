# Módulo «Alimentación» en «Mi control de salud» — Diseño

Fecha: 2026-11-27 · Estado: propuesta para revisión del Dr. (director médico, CMLA)

## 1. Intención

El paciente anota en su teléfono todo lo que come durante el día y la app suma las calorías contra **su meta diaria**, con una alerta cuando se acerca y cuando la alcanza. La meta no es fija: se calcula con los datos del paciente (sexo, edad, peso, talla, actividad, objetivo, enfermedades crónicas y laboratorios). El médico puede indicar una meta manual; por ejemplo, el director médico usará 2500 kcal.

Anotar tiene que ser rápido. Por eso la forma principal es **una foto del plato**: la inteligencia artificial propone los alimentos con sus calorías y el paciente los confirma. Cuando no hay internet, se usa una tabla de alimentos panameños que viene dentro de la app.

Cada paciente lleva su propio control. **Los datos se quedan en el teléfono**, como en el resto de «Mi control de salud». No hay cuenta, ni base de datos en la nube, ni panel web.

## 2. Objetivos

- Agregar una pestaña nueva, **«Comidas»**, a la app existente (`app-pacientes/`).
- Crear un **perfil nutricional** que calcule IMC, metabolismo basal (TMB), gasto diario y meta de kcal. La meta también puede ser indicada por el médico.
- Ofrecer tres formas de anotar:
  - **Foto con IA**, si hay internet.
  - **Tabla de alimentos**, que funciona sin internet.
  - **Manual**: nombre y kcal.
- Mostrar una barra de progreso del día y alertas: **80 %** «se está acercando», **100 %** «meta alcanzada», **>110 %** «excedido».
- Mostrar indicaciones según la enfermedad, sin dar diagnósticos:
  - Diabetes / prediabetes: carbohidratos del día.
  - Enfermedad renal: proteína.
  - Hipertensión: sodio estimado.
  - Dislipidemia: grasa.
- Agregar al resumen que ya se envía por WhatsApp, correo o PDF: kcal promedio de los últimos 7/30 días, días dentro de la meta y el reparto de macronutrientes.

## 3. Lo que no se hará (no-objetivos)

- No se suben datos a la web ni hay panel para el médico. El médico ve lo que el paciente le envía en el resumen.
- No reemplaza la consulta con nutrición ni prescribe dietas.
- No da metas automáticas para embarazo, lactancia ni menores de 18 años. En esos casos la app pide que el médico indique la meta.

## 4. Lo que no debe pasar

- Que la app sume calorías de la foto **sin que el paciente confirme**.
- Que la foto o los datos queden guardados en un servidor de la clínica.
- Que la app deje de funcionar sin internet. La tabla y el registro manual siempre deben funcionar.
- Que el botón de IA quede abierto para cualquiera y genere costos sin control.
- Que la app muestre mensajes alarmistas o en tono de diagnóstico. Se redactan en positivo, con el mismo tono que la app actual.

## 5. Contexto actual (lo que ya existe)

- `app-pacientes/` es una PWA estática publicada en **GitHub Pages**:
  - `index.html`: pestañas Presión · Glicemia · Exámenes · Enviar · Mis datos.
  - `assets/app.js`: un archivo JS en ES5, objeto `datos` en `localStorage` (clave `KEY`), archivos en IndexedDB.
  - `sw.js`: permite usar la app sin internet.
- `datos.perfil` ya tiene nombre, fecha de nacimiento, médico, WhatsApp, correo y un consentimiento versionado (`CONSENT_VERSION = "1.0"`).
- «Exámenes» guarda **archivos** (fotos o PDF), no valores numéricos. Por eso los laboratorios que se usan para el cálculo se piden aparte, en el perfil nutricional.
- El sitio institucional está en **Netlify** (`netlify.toml`) y redirige `/mi-salud` a la app. Netlify puede alojar la función de IA; GitHub Pages no.
- Después de cambiar JS o CSS hay que subir `?v=` en `index.html` y el nombre de caché en `sw.js`.

## 6. Enfoques considerados

| Enfoque | Ventajas | Desventajas |
|---|---|---|
| 1. Solo foto con IA | Lo más cómodo | No funciona sin internet; no se puede corregir; depende de un servicio externo |
| 2. Solo tabla de alimentos | Gratis, funciona sin internet, nada sale del teléfono | Más lento de anotar |
| **3. Mixto (elegido)** | La foto propone, el paciente confirma o corrige; la tabla y el registro manual funcionan siempre | Hay que mantener una función pequeña en Netlify y un costo por foto |

El director médico eligió el **enfoque 3**.

## 7. Diseño

### 7.1 Perfil nutricional (en «Mis datos» o al abrir «Comidas» por primera vez)

| Campo | Notas |
|---|---|
| Sexo biológico | Necesario para la fórmula |
| Fecha de nacimiento | Ya existe en `perfil.nacimiento` |
| Peso (kg) y talla (cm) | Se puede actualizar el peso con fecha; se guarda el historial |
| Circunferencia de cintura (opcional) | Riesgo cardiometabólico |
| Actividad | Sedentario 1,2 · Ligera 1,375 · Moderada 1,55 · Intensa 1,725 |
| Objetivo | Bajar (−500 kcal) · Mantener · Subir (+300 kcal) |
| Condiciones (marcar) | Diabetes 2, prediabetes, hipertensión, dislipidemia, enfermedad renal crónica, hígado graso, gota/hiperuricemia, embarazo/lactancia |
| Laboratorios recientes (opcional, con fecha) | Glucosa en ayunas, HbA1c, colesterol total, LDL, HDL, triglicéridos, creatinina, ácido úrico |
| **Meta indicada por el médico** (opcional) | Si se llena, tiene prioridad sobre el cálculo. Se muestra «Meta indicada por su médico: 2500 kcal» |

**Cálculos** (puros, en el teléfono):
- IMC = peso / talla², con la clasificación de la OMS.
- TMB con Mifflin-St Jeor:
  - Hombre: 10·kg + 6,25·cm − 5·edad + 5
  - Mujer: 10·kg + 6,25·cm − 5·edad − 161
- Gasto diario = TMB × factor de actividad.
- Meta = gasto diario + ajuste por objetivo, redondeada a 50 kcal. Mínimo de seguridad: 1200 kcal en mujeres y 1500 en hombres. Por debajo de eso se usa el mínimo y se muestra «consulte a su médico».
- Embarazo/lactancia o edad < 18: no hay meta automática; se muestra «Pida a su médico su meta».
- La pantalla muestra **cómo se obtuvo la meta**. Ejemplo: «TMB 1720 × 1,375 = 2365 − 0 = 2350 kcal».

**Objetivos de macronutrientes por condición** (valores iniciales, configurables en un objeto `REGLAS_NUTRI` de `app.js`):
- General: carbohidratos 45–60 %, proteína 15–20 %, grasa 25–35 %.
- Diabetes/prediabetes (o HbA1c ≥ 5,7 % / glucosa en ayunas ≥ 100): carbohidratos ≤ 45 % de las kcal, con aviso por comida si una sola comida pasa de ~60 g de carbohidratos.
- Enfermedad renal: proteína ≈ 0,8 g/kg/día, con aviso si se pasa.
- Hipertensión: sodio < 2000 mg/día (OMS).
- Dislipidemia (LDL ≥ 130 mg/dL, o ≥ 100 si tiene diabetes; o triglicéridos ≥ 150): grasa saturada < 10 % de las kcal.
- Hiperuricemia: aviso suave cuando se registran alimentos con etiqueta `carne_roja`, `visceras`, `mariscos` o `bebida_azucarada`.

Los laboratorios **solo activan avisos**; no cambian las kcal. Si un laboratorio tiene más de 6 meses, se muestra «actualice sus exámenes».

### 7.2 Pestaña «Comidas»

```
┌──────────────────────────────────────┐
│ Hoy · jueves 27 nov                  │
│ 1 980 / 2 500 kcal   ████████░░  79% │
│ Carbohidratos 230 g · Proteína 85 g  │
│ Grasa 60 g · Sodio ~1 600 mg         │
├──────────────────────────────────────┤
│ [📷 Foto del plato] [🔎 Buscar] [✏️]  │
├──────────────────────────────────────┤
│ Desayuno  520 kcal                   │
│   Tortilla asada 1 u · 210           │
│   Huevo frito 1 u · 90  …            │
│ Almuerzo  980 kcal  …                │
│ Merienda / Cena / Otro               │
├──────────────────────────────────────┤
│ Últimos 7 días (barras vs. meta)     │
└──────────────────────────────────────┘
```

- **Alertas**: un aviso dentro de la app con el mismo estilo que `mostrarAlerta`, más una vibración corta si el teléfono la tiene. Cada umbral avisa **una sola vez al día**.
  - 80 %: «Se está acercando a su meta. Le quedan X kcal».
  - 100 %: «Llegó a su meta de hoy».
  - 110 %: «Pasó su meta por X kcal».
- **Tiempo de comida**: se sugiere según la hora (desayuno, almuerzo, merienda, cena, otro) y el paciente lo puede cambiar.
- Cada alimento se puede editar o borrar. Cualquier cambio recalcula el día.
- Hay una vista de otros días: el día anterior y un calendario sencillo.

### 7.3 Foto del plato (flujo)

1. `<input type="file" accept="image/*" capture="environment">`.
2. En el teléfono se reduce la imagen a ≤ 1024 px por el lado mayor, en JPEG con calidad 0,7. Se eliminan los datos EXIF al volver a codificar en canvas.
3. Se envía por `POST` a la función de Netlify junto con el tiempo de comida y, si el paciente quiere, una nota («sin azúcar», «media porción»).
4. Vuelve una lista con los alimentos y estos datos para cada uno: nombre, porción casera, gramos estimados, kcal, carbohidratos, proteína, grasa, grasa saturada, sodio, etiquetas (las mismas de la tabla) y confianza (alta/media/baja).
5. **Pantalla de confirmación**: el paciente puede editar porciones, quitar o agregar alimentos y buscar uno en la tabla. Solo al pulsar «Agregar a mi día» se guarda el registro con `fuente: "foto"`.
6. **La foto no se guarda** en el teléfono, salvo que el paciente marque «guardar foto». Nunca se guarda en el servidor.
7. Si no hay internet, se pasó el límite o hay un error, se muestra «No se pudo analizar la foto; búsquela en la tabla» y se abre el buscador.

### 7.4 Función de IA (Netlify Function)

- Archivo: `netlify/functions/analizar-plato.mjs`. Usa Node 22 y el SDK oficial `@anthropic-ai/sdk`.
- Modelo: `claude-opus-5-5`, con visión y `output_config.format` (JSON schema estricto). Esfuerzo `low` para bajar costo y tiempo; se sube si la precisión no alcanza. Se activan los fallbacks del servidor (`server-side-fallback-2026-07-01`, `fallbacks: "default"`) y se maneja `stop_reason: "refusal"`.
- Instrucciones del sistema: estimar porciones y valores nutricionales de **comida panameña y latinoamericana**, sin opiniones médicas, en español y en porciones caseras. Si la foto no es comida, devolver una lista vacía con un motivo.
- La clave `ANTHROPIC_API_KEY` va en una variable de entorno de Netlify y nunca en el repositorio.
- Protecciones:
  - CORS y `Origin` permitidos solo para `https://drefraintite2906-tech.github.io`.
  - Imagen de máximo 1,5 MB.
  - Límite por dispositivo: 20 fotos al día. La app manda un identificador anónimo aleatorio.
  - **Tope mensual global** configurable (`LIMITE_MENSUAL_FOTOS`, por ejemplo 3000), con un contador en Netlify Blobs. Cuando se llega al tope, la función responde 429 y la app ofrece la tabla.
- No se guardan registros de la imagen ni del contenido. Solo se cuentan las fotos.
- Dirección: `https://<sitio>.netlify.app/.netlify/functions/analizar-plato`. Se guarda en una constante `URL_IA` de `app.js` y se cambia cuando se conecte el dominio propio.
- El plan gratuito de Netlify alcanza para miles de llamadas al mes. Cada foto usa una llamada a la función y una escritura en Blobs. Antes del lanzamiento se revisa el consumo en el panel de Netlify.
- `netlify.toml`: agregar `netlify/` a la condición `ignore` para que los cambios en la función se publiquen.
- Costo estimado: ~US$ 0,01–0,03 por foto con Opus 5.5 a esfuerzo bajo. Se debe medir con 20 fotos reales antes del lanzamiento.

### 7.5 Tabla de alimentos (sin internet)

- Archivo: `app-pacientes/assets/alimentos.json`, con unos **200 alimentos**: panameños (arroz, guandú, patacón, hojaldra, tortilla, carimañola, sancocho, ropa vieja, tamal, bollo, chicheme, raspao, saril, pan de molde, empanadas, mondongo, etc.), comunes (frutas, lácteos, bebidas, comida rápida) y bebidas con azúcar.
- Campos de cada alimento: `id`, `nombre`, `sinonimos[]`, `porcion` (casera), `g`, `kcal`, `carb`, `prot`, `grasa`, `grasaSat`, `sodio`, `etiquetas[]` (p. ej. `carne_roja`, `visceras`, `mariscos`, `bebida_azucarada`, `fritura`), `fuente`.
- Fuentes: Tabla de Composición de Alimentos de Centroamérica (INCAP/OPS) y USDA FoodData Central, en ese orden.
- Búsqueda sin acentos y por sinónimos. Multiplicador de porción: ½, 1, 1½, 2 o un valor libre.
- Los alimentos que el paciente usa más aparecen primero («Mis frecuentes»).
- Se agrega a la caché del service worker.

### 7.6 Datos (en `datos` / localStorage)

```js
datos.nutri = {
  perfil: { sexo, pesoKg, tallaCm, cinturaCm, actividad, objetivo, condiciones: [], labs: { glucosa:{v,fecha}, hba1c:{v,fecha}, ... }, metaMedico: null },
  pesos: [{ id, t, kg }],
  comidas: [{ id, t, dia: "AAAA-MM-DD", tiempo, fuente: "foto"|"tabla"|"manual", items: [{ nombre, porcion, g, kcal, carb, prot, grasa, grasaSat, sodio, etiquetas, alimentoId? }] }],
  alertasDia: { "AAAA-MM-DD": [80,100] }
}
```

- `normalizar()` debe aceptar respaldos antiguos sin `nutri`.
- El respaldo y la restauración existentes deben incluir `nutri`.

### 7.7 Consentimiento

`CONSENT_VERSION` se queda en `"1.0"`, para que nadie tenga que volver a la bienvenida. Se agrega un consentimiento aparte, `perfil.consentimientoFoto = { version: "1.0", fecha }`, que se pide la primera vez que el paciente pulsa «Foto del plato». Su texto: «Si usa la función *Foto del plato*, la imagen se envía de forma segura a un servicio de inteligencia artificial (Anthropic) solo para estimar las calorías. La clínica no la guarda. Las estimaciones son aproximadas y no sustituyen la orientación de su médico o nutricionista».

La tabla y el registro manual funcionan sin aceptarlo.

### 7.8 Resumen al médico

Se agrega una sección «Alimentación» al PNG/PDF y al texto de WhatsApp que ya existen:
- Meta y cómo se calculó.
- IMC actual y evolución del peso.
- kcal promedio y número de días por debajo, dentro o por encima de la meta.
- Reparto de macronutrientes.
- Avisos por condición que más se repitieron.

## 8. Decisiones ya tomadas

- Cada paciente registra lo suyo; los datos se quedan en el teléfono; no hay nada en la web (decisión del director médico).
- Enfoque mixto: foto con IA + tabla + manual (decisión del director médico).
- Meta personal del director médico: 2500 kcal, como «meta indicada por el médico».

## 9. Decisiones que tomé yo (revíselas)

- Fórmula Mifflin-St Jeor, factores de actividad, −500/+300 kcal y mínimos de 1200/1500 kcal.
- Umbrales de alerta 80/100/110 %.
- Objetivos de macronutrientes por condición, listados en 7.1.
- Modelo Claude Opus 5.5 a esfuerzo bajo; límite de 20 fotos por día y tope mensual global.
- Alrededor de 200 alimentos en la tabla, con INCAP como fuente principal.
- La foto no se guarda por defecto.

## 10. Lo que queda a criterio de quien lo construya

Textos exactos de las pantallas, estilos (reutilizar `sitio.css` y `app.css`), la forma de las gráficas (seguir el canvas de presión y glicemia), las pruebas, la estructura interna del JS y el orden de las tareas.

## 11. Antes de publicar

- Usted, o la nutricionista de CMLA, revisa los valores de la tabla de alimentos.
- La clínica crea la cuenta de Anthropic y carga la clave en Netlify.
- Se prueba con 20 fotos reales de platos panameños para comparar la estimación con el valor de referencia y medir el costo.
