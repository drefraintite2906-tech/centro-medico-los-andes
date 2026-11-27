# Módulo «Alimentación» — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agregar a «Mi control de salud» una pestaña «Comidas». La pestaña suma las kcal del día contra una meta personalizada (calculada o indicada por el médico), muestra alertas al 80/100/110 % y da avisos por enfermedad crónica. Se puede anotar con foto analizada por IA, con una tabla de alimentos sin internet o a mano.

**Architecture:**
- La lógica pura va en un módulo nuevo `app-pacientes/assets/nutri.js`, escrito en ES5 con UMD para que funcione en el navegador (`window.Nutri`) y en Node (`module.exports`). Se prueba con `node --test`.
- La interfaz se agrega a la IIFE que ya existe en `app.js`, siguiendo sus patrones (`datos`, `guardar()`, `mostrarAlerta()`, `irA()`).
- La IA vive en una Netlify Function (`netlify/functions/analizar-plato.mjs`) que llama a Claude con visión y salida estructurada. Su lógica pura está en `netlify/functions/lib/plato.mjs`, que recibe el cliente y el contador por parámetro para poder probarla sin red.

**Tech Stack:** HTML, CSS y JS ES5 (sin compilación); PWA en GitHub Pages; Netlify Functions v2 (Node 22, ESM); `@anthropic-ai/sdk`; `@netlify/blobs`; `node:test`; Playwright (ya instalado) para la prueba de humo.

**Spec:** `docs/superpowers/specs/2026-11-27-alimentacion-calorias-design.md`

## Global Constraints

- Los datos del paciente se quedan **solo en el teléfono** (`localStorage` clave `cmla-mi-salud-v1`, objeto `datos.nutri`). El servidor no guarda ni la imagen ni el contenido; solo lleva los contadores.
- Nada se suma desde la foto **sin que el paciente lo confirme**.
- La tabla y el registro manual funcionan **sin internet** y **sin el consentimiento de foto**.
- `CONSENT_VERSION` se queda en `"1.0"`. Aparte se guarda `perfil.consentimientoFoto = { version: "1.0", fecha }`.
- Mifflin-St Jeor:
  - Hombre: `10·kg + 6.25·cm − 5·edad + 5`
  - Mujer: `10·kg + 6.25·cm − 5·edad − 161`
- Factores de actividad: sedentario 1.2 · ligera 1.375 · moderada 1.55 · intensa 1.725.
- Ajuste por objetivo: bajar −500 · mantener 0 · subir +300.
- La meta se redondea a 50 kcal. Mínimos: mujer 1200, hombre 1500 (con aviso «consulte a su médico»).
- No hay meta automática si edad < 18 o embarazo/lactancia. `metaMedico` tiene prioridad sobre todo.
- Alertas al 80 / 100 / 110 %, cada una **una sola vez por día**.
- Reglas por condición:
  - Diabetes o prediabetes (o HbA1c ≥ 5.7, o glucosa en ayunas ≥ 100): carbohidratos ≤ 45 % de las kcal; aviso si una comida pasa de 60 g de carbohidratos.
  - Enfermedad renal: proteína ≤ 0.8 g/kg/día.
  - Hipertensión: sodio < 2000 mg/día.
  - Dislipidemia (LDL ≥ 130, o ≥ 100 con diabetes; o triglicéridos ≥ 150): grasa saturada < 10 % de las kcal.
  - Gota/hiperuricemia: aviso con etiquetas `carne_roja`, `visceras`, `mariscos`, `bebida_azucarada`.
  - Laboratorio con más de 6 meses (182 días): «actualice sus exámenes».
- Rangos generales: carbohidratos 45–60 %, proteína 15–20 %, grasa 25–35 %.
- Foto:
  - En el teléfono: ≤ 1024 px por el lado mayor, JPEG 0.7, sin EXIF (se vuelve a codificar en canvas).
  - En el servidor: rechazar más de 1.5 MB decodificados.
- Función:
  - CORS solo para `https://drefraintite2906-tech.github.io`.
  - 20 fotos por dispositivo al día.
  - Tope mensual `LIMITE_MENSUAL_FOTOS` (por defecto 3000), con 429 al llegar.
  - Clave en la variable de entorno `ANTHROPIC_API_KEY`.
- Modelo `claude-opus-5-5`, `output_config.effort: "low"`, `output_config.format` json_schema, beta `server-side-fallback-2026-07-01` con `fallbacks: "default"`. Si `stop_reason: "refusal"`, se trata como error.
- Texto del consentimiento de foto, exacto: «Si usa la función *Foto del plato*, la imagen se envía de forma segura a un servicio de inteligencia artificial (Anthropic) solo para estimar las calorías. La clínica no la guarda. El proveedor puede conservarla temporalmente por motivos de seguridad y no la usa para entrenar sus modelos. Las estimaciones son aproximadas y no sustituyen la orientación de su médico o nutricionista.»
- Mensajes en español, en positivo y sin tono de diagnóstico. Hay que escapar el HTML con `esc()` en todo texto que venga del paciente o de la IA.
- Después de cambiar JS o CSS: subir `?v=` en `index.html` y `CACHE` en `sw.js`.

## Review Focus

1. **Perfil incompleto** (sin sexo, peso o talla): `metaDiaria` devuelve `{ kcal: null, fuente: "incompleto" }`. La pestaña muestra «Complete su perfil para calcular su meta» y deja anotar comidas. Nunca debe aparecer `NaN`. *(Tarea 1 y Tarea 6)*
2. **Respuesta de la IA basura** (números negativos o en texto, más de 30 alimentos, nombres enormes o con HTML, lista vacía por «no es comida»): `interpretarRespuesta` la limpia. Se limitan los números a ≥ 0, máximo 30 alimentos y 80 caracteres por nombre; si la lista viene vacía, se muestra el `motivo`. *(Tarea 4)*
3. **Respaldo antiguo o `nutri` corrupto** al restaurar: `normalizarNutri` devuelve una estructura válida sin lanzar error. *(Tarea 2)*
4. **Cambio de meta a mitad del día** (el médico pone 2500 después de una alerta al 80 %): el nivel se recalcula y las alertas ya mostradas no se repiten. Una alerta nueva sí aparece si se alcanza un umbral mayor. *(Tarea 2)*
5. **Comidas de otros días** (editar o borrar ayer): no disparan las alertas de hoy y los totales usan `dia` (fecha local), no `t`. *(Tarea 2 y Tarea 6)*

---

### Task 1: Cálculos de meta (nutri.js)

**Files:**
- Create: `app-pacientes/assets/nutri.js`
- Create: `tests/nutri-meta.test.cjs`
- Modify: `package.json` (script `"test": "node --test tests/"`)

**Interfaces:**
- Produces (en `Nutri`):
  - `imc(kg: number, cm: number) -> { valor: number /*1 decimal*/, clase: "bajo"|"normal"|"sobrepeso"|"obesidad1"|"obesidad2"|"obesidad3" } | null`. Cortes OMS: <18.5, <25, <30, <35, <40, ≥40.
  - `tmb(sexo: "M"|"F", kg, cm, edad) -> number | null`
  - `metaDiaria(perfilNutri, edad) -> { kcal: number|null, fuente: "medico"|"calculo"|"requiereMedico"|"incompleto", tmb?, factor?, ajuste?, minimoAplicado?: boolean, detalle: string }`
  - `ACTIVIDAD = { sedentario:1.2, ligera:1.375, moderada:1.55, intensa:1.725 }`, `OBJETIVO = { bajar:-500, mantener:0, subir:300 }`
- Forma de `perfilNutri`: `{ sexo, pesoKg, tallaCm, cinturaCm, actividad, objetivo, condiciones: string[], labs: { glucosa, hba1c, colesterol, ldl, hdl, trigliceridos, creatinina, acidoUrico : {v:number, fecha:"AAAA-MM-DD"}|null }, metaMedico: number|null }`. Las condiciones válidas son `dm2`, `prediabetes`, `hta`, `dislipidemia`, `erc`, `higado_graso`, `gota`, `embarazo`.

- [ ] **Step 1: Write the failing tests**

```js
const N = require("../app-pacientes/assets/nutri.js");
test("imc", () => { assert.deepEqual(N.imc(80, 175), { valor: 26.1, clase: "sobrepeso" }); assert.equal(N.imc(0, 170), null); });
test("tmb Mifflin", () => { assert.equal(N.tmb("M", 80, 175, 40), 1698.75); assert.equal(N.tmb("F", 65, 160, 35), 1314); });
test("meta cálculo", () => { const m = N.metaDiaria({ sexo:"M", pesoKg:80, tallaCm:175, actividad:"ligera", objetivo:"mantener", condiciones:[] }, 40);
  assert.equal(m.kcal, 2350); assert.equal(m.fuente, "calculo"); assert.match(m.detalle, /1699 × 1,375/); }); // 1698.75*1.375=2335.8 → 2350
test("meta médico prioriza", () => assert.equal(N.metaDiaria({ metaMedico: 2500 }, 40).kcal, 2500));
test("mínimo mujer", () => { const m = N.metaDiaria({ sexo:"F", pesoKg:45, tallaCm:150, actividad:"sedentario", objetivo:"bajar", condiciones:[] }, 60); assert.equal(m.kcal, 1200); assert.equal(m.minimoAplicado, true); });
test("embarazo y menor requieren médico", () => {
  assert.equal(N.metaDiaria({ sexo:"F", pesoKg:60, tallaCm:160, actividad:"ligera", objetivo:"mantener", condiciones:["embarazo"] }, 30).fuente, "requiereMedico");
  assert.equal(N.metaDiaria({ sexo:"M", pesoKg:60, tallaCm:170, actividad:"ligera", objetivo:"mantener", condiciones:[] }, 16).fuente, "requiereMedico"); });
test("incompleto sin NaN", () => { const m = N.metaDiaria({ sexo:"", pesoKg:null }, 40); assert.equal(m.kcal, null); assert.equal(m.fuente, "incompleto"); });
```

- [ ] **Step 2: Run** `node --test tests/` → FAIL (módulo inexistente).
- [ ] **Step 3: Implement** `nutri.js` con el envoltorio UMD `(function (root, f) { if (typeof module === "object" && module.exports) module.exports = f(); else root.Nutri = f(); })(this, function () { … })`. Redondeo: `Math.round(x/50)*50`. Formato de `detalle`: `"TMB " + Math.round(tmb) + " × " + factor con coma decimal + " " + (ajuste<0?"− ":"+ ") + |ajuste| + " = " + kcal + " kcal"`.
- [ ] **Step 4: Run** `node --test tests/` → PASS.
- [ ] **Step 5: Commit** `git add app-pacientes/assets/nutri.js tests/nutri-meta.test.cjs package.json && git commit -m "Alimentación: cálculo de IMC, TMB y meta calórica"`

### Task 2: Registro del día, alertas, avisos y normalización (nutri.js)

**Files:**
- Modify: `app-pacientes/assets/nutri.js`
- Create: `tests/nutri-registro.test.cjs`

**Interfaces:**
- Consumes: `metaDiaria` (Task 1).
- Produces:
  - Item: `{ nombre, porcion, g, kcal, carb, prot, grasa, grasaSat, sodio, etiquetas: string[], alimentoId?: string }`
  - Comida: `{ id, t, dia: "AAAA-MM-DD", tiempo: "desayuno"|"almuerzo"|"merienda"|"cena"|"otro", fuente: "foto"|"tabla"|"manual", items: Item[] }`
  - `nuevoNutri() -> { perfil, pesos: [], comidas: [], alertasDia: {}, frecuentes: {} }`
  - `normalizarNutri(obj) -> nutri` (nunca lanza error; filtra las comidas sin `id` o sin `dia` válido y convierte los números inválidos en 0)
  - `totalesDia(comidas, dia) -> { kcal, carb, prot, grasa, grasaSat, sodio }`
  - `nivelAlerta(kcal, meta) -> 0|80|100|110` (si `meta` es null, devuelve 0)
  - `alertasPorMostrar(nivel, yaMostradas: number[]) -> number[]`: solo el umbral más alto alcanzado que no se haya mostrado; marca como mostrados también los inferiores.
  - `textoAlerta(nivel, kcal, meta) -> string`. Textos: 80 «Se está acercando a su meta. Le quedan X kcal.»; 100 «Llegó a su meta de hoy.»; 110 «Pasó su meta por X kcal.»
  - `avisosCondicion(perfil, totales, comidasDelDia, hoyISO) -> [{ clave, texto }]`
  - `tiempoPorHora(date) -> tiempo`: <10:30 desayuno; <15:00 almuerzo; <18:00 merienda; <22:00 cena; resto otro.
  - `statsPeriodo(comidas, meta, diasISO: string[]) -> { prom, n, debajo, dentro, encima, pct: {carb, prot, grasa} }`. «Dentro» es 90–110 % de la meta; solo se cuentan los días con registros.

- [ ] **Step 1: Write the failing tests**, con estas aserciones:
  - `totalesDia` suma solo `dia === "2026-11-27"` aunque haya una comida con `t` de ese día y `dia: "2026-11-26"`.
  - `nivelAlerta(1999, 2500) === 79→0`, `nivelAlerta(2000,2500)===80`, `(2500,2500)===100`, `(2751,2500)===110`, `(500,null)===0`.
  - `alertasPorMostrar(110, []) → [110]`, `alertasPorMostrar(100, [80]) → [100]`, `alertasPorMostrar(80, [80]) → []`.
  - Cambio de meta: el nivel pasa de 80 con meta 2000 (1700 kcal) a 0 con meta 2500. `alertasPorMostrar(0,[80]) → []`.
  - `avisosCondicion` con `condiciones:["dm2"]`, totales `{kcal:2000, carb:260}` (52 %) incluye la clave `"carb_dia"`. Una comida con 70 g de carbohidratos incluye `"carb_comida"`.
  - Con `labs.hba1c {v:6.0}` y sin condiciones, también incluye `"carb_dia"`.
  - `erc` con `pesoKg:70` y `prot:70` incluye `"proteina"` (límite 56).
  - `hta` con `sodio:2100` incluye `"sodio"`.
  - LDL 110 y `dm2` incluye `"grasa_sat"` cuando grasaSat·9/kcal ≥ 0.10. LDL 110 sin dm2 no lo incluye.
  - `gota` con una comida que tiene la etiqueta `visceras` incluye `"gota"`.
  - Un laboratorio con fecha 200 días antes de `hoyISO` incluye `"labs_viejos"`.
  - `normalizarNutri(null)`, `normalizarNutri({comidas:"x"})` y `normalizarNutri({comidas:[{id:"a",dia:"2026-11-27",items:[{kcal:"abc"}]}]})` no lanzan error; el último queda con `kcal === 0`.
  - `tiempoPorHora(new Date(2026,10,27,13,0)) === "almuerzo"`.
  - `statsPeriodo` con 3 días (2000/2500/3000) y meta 2500: `debajo 1, dentro 1, encima 1`, `prom 2500`.
- [ ] **Step 2: Run** `node --test tests/` → FAIL.
- [ ] **Step 3: Implement** las funciones de arriba en `nutri.js`. Pon los umbrales en `REGLAS_NUTRI = { carbPctMax:0.45, carbComidaMax:60, protGkgErc:0.8, sodioMax:2000, grasaSatPctMax:0.10, ldl:130, ldlDm:100, tg:150, hba1c:5.7, glucosa:100, labsDiasMax:182 }`. Texto de cada aviso, en positivo; por ejemplo, `carb_dia`: «Hoy los carbohidratos son el X % de sus calorías; para su control, procure que no pasen del 45 %.»
- [ ] **Step 4: Run** `node --test tests/` → PASS.
- [ ] **Step 5: Commit** `"Alimentación: totales del día, alertas 80/100/110 y avisos por condición"`

### Task 3: Tabla de alimentos y búsqueda

**Files:**
- Create: `app-pacientes/assets/alimentos.json`
- Modify: `app-pacientes/assets/nutri.js`
- Create: `tests/alimentos.test.cjs`

**Interfaces:**
- Produces:
  - `alimentos.json`: `{ version: 1, fuentes: [...], alimentos: [{ id, nombre, sinonimos: [], porcion, g, kcal, carb, prot, grasa, grasaSat, sodio, etiquetas: [], fuente: "INCAP"|"USDA" }] }`
  - `Nutri.sinAcentos(s) -> string`
  - `Nutri.buscar(alimentos, q, frecuentes?: {id: n}) -> Alimento[]` (máximo 20; se ordenan primero los frecuentes, luego los que coinciden al inicio del nombre)
  - `Nutri.escalar(alimento, mult) -> Item` (redondea kcal y sodio a entero y los gramos de macronutrientes a 1 decimal; porción «1½ taza» y similares)

- [ ] **Step 1: Write the failing tests**:
  - El JSON tiene ≥ 180 alimentos e `id` únicos.
  - Todos los números son ≥ 0 y finitos.
  - Para cada alimento, `|kcal − (4·carb + 4·prot + 9·grasa)| ≤ 0.25·kcal + 15`, salvo los que tengan la etiqueta `alcohol`.
  - `buscar(lista,"platano")` encuentra «Patacón» (sinónimo «plátano verde frito») y «Plátano maduro».
  - `buscar(lista,"GUANDU")` encuentra el arroz con guandú.
  - `escalar(arroz, 1.5).kcal === Math.round(arroz.kcal*1.5)`.
- [ ] **Step 2: Run** → FAIL.
- [ ] **Step 3: Escribe `alimentos.json`.**
  - Incluye la lista panameña de la sección 7.5 del spec, más frutas, lácteos, panes, bebidas (sodas, jugos, café con azúcar, cerveza con la etiqueta `alcohol`), comida rápida (pollo frito, hamburguesa, pizza, papas fritas) y básicos (huevo, pollo, res, pescado, frijoles, lentejas, ensaladas, aceite).
  - Usa porciones caseras panameñas y valores de INCAP (Tabla de Composición de Alimentos de Centroamérica). Si INCAP no tiene el alimento, usa USDA FoodData Central.
  - Agrega las etiquetas `carne_roja`, `visceras`, `mariscos`, `bebida_azucarada` y `fritura` cuando correspondan.
  - Implementa `buscar` y `escalar`.
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** `"Alimentación: tabla de alimentos panameños y búsqueda sin acentos"`

### Task 4: Función de IA «analizar-plato»

**Files:**
- Create: `netlify/functions/lib/plato.mjs`
- Create: `netlify/functions/analizar-plato.mjs`
- Create: `tests/analizar-plato.test.mjs`
- Modify: `package.json` (dependencias `@anthropic-ai/sdk` y `@netlify/blobs`, versiones actuales fijadas por `npm install`)
- Modify: `netlify.toml` (agrega `netlify/` a la lista del `ignore`; agrega `[functions] directory = "netlify/functions"`)

**Interfaces:**
- Solicitud: `POST` con JSON `{ imagen: string /*base64 JPEG sin prefijo*/, tiempo: string, nota?: string /*≤120*/, dispositivo: string /*[a-z0-9]{8,40}*/ }`
- Respuestas:
  - 200 `{ items: Item[] /*con confianza: "alta"|"media"|"baja"*/, motivo: string|null }`
  - 400 `{ error: "solicitud" }`
  - 403 `{ error: "origen" }`
  - 405
  - 429 `{ error: "limite_dia"|"limite_mes" }`
  - 502 `{ error: "ia" }`
  - `OPTIONS` → 204 con las cabeceras CORS.
- Produces (`lib/plato.mjs`):
  - `ORIGEN_PERMITIDO`, `ESQUEMA_PLATO` (json schema con `additionalProperties:false`; `items[]` con todos los campos de Item más `confianza`; `motivo` string|null)
  - `validarSolicitud(body) -> { ok: true, datos } | { ok: false }`
  - `construirPeticion(datos) -> params de messages.create`
  - `interpretarRespuesta(message) -> { items, motivo }` (lanza `Error("ia")` si hay refusal, si no hay bloque de texto o si el JSON es inválido)
  - `crearHandler({ crearMensaje: (params)=>Promise<Message>, contador: { incrementar(clave): Promise<number>, leer(clave): Promise<number> }, limiteMes: number, ahora: ()=>Date }) -> (req: Request) => Promise<Response>`
- `analizar-plato.mjs`:
  - `export default` crea `new Anthropic()` y pasa `crearMensaje: p => client.beta.messages.create(p)`.
  - El contador usa `getStore("ia-fotos")` con las claves `mes-AAAA-MM` y `dia-AAAA-MM-DD-<dispositivo>`.
  - `limiteMes = Number(process.env.LIMITE_MENSUAL_FOTOS) || 3000`.
  - `export const config = { path: "/api/analizar-plato" }`.

- [ ] **Step 1: Write the failing tests**, con un `crearMensaje` falso y un contador en memoria:
  - Un `Origin` distinto da 403; `OPTIONS` da 204 con `Access-Control-Allow-Origin` igual a `ORIGEN_PERMITIDO`.
  - Sin `imagen`, o con una imagen de más de 1.5 MB decodificada, da 400.
  - El dispositivo número 21 en el mismo día da 429 `limite_dia`, y no se llama a `crearMensaje`.
  - Con el contador del mes en `limiteMes`, da 429 `limite_mes`.
  - `construirPeticion` cumple: `model === "claude-opus-5-5"`, `output_config.effort === "low"`, `output_config.format.type === "json_schema"`, `betas` incluye `"server-side-fallback-2026-07-01"`, `fallbacks === "default"` y el primer bloque de contenido es `{type:"image", source:{type:"base64", media_type:"image/jpeg"}}`.
  - Si se devuelve un mensaje con `stop_reason:"refusal"`, la respuesta es 502 `ia`.
  - Una respuesta con `kcal:-5`, `kcal:"300"`, 40 alimentos y un nombre `"<b>x</b>"` queda en `kcal` 0 y 300, máximo 30 alimentos y un nombre sin `<>` de ≤ 80 caracteres.
  - Una respuesta `{items:[], motivo:"No es comida"}` da 200 con ese `motivo`.
  - Ninguna respuesta incluye la imagen y no se llama a `console.log` con el cuerpo.
- [ ] **Step 2: Run** `node --test tests/` → FAIL.
- [ ] **Step 3: Implement.**
  - Sistema (texto fijo, en español): estimar los alimentos visibles con porciones caseras y valores nutricionales de comida panameña y latinoamericana; usar las etiquetas permitidas; no dar consejos médicos; si no es comida, devolver `items: []` y un `motivo` breve.
  - Mensaje de usuario: la imagen, más «Tiempo de comida: X. Nota del paciente: Y».
  - `max_tokens: 4000`.
  - Errores del SDK: `Anthropic.RateLimitError` y `APIError` devuelven 502 sin detalles.
  - CORS en todas las respuestas.
  - El contador incrementa **antes** de llamar a la IA.
- [ ] **Step 4: Run** → PASS. Luego `npm run build`: el build de Eleventy sigue pasando.
- [ ] **Step 5: Commit** `"Alimentación: función de Netlify para analizar la foto del plato con Claude"`

### Task 5: Perfil nutricional en «Mis datos» y persistencia

**Files:**
- Modify: `app-pacientes/index.html` (sección `<fieldset>` «Perfil nutricional» dentro de `data-form="perfil"`; `<script src="assets/nutri.js?v=1" defer>` antes de `app.js`)
- Modify: `app-pacientes/assets/app.js` (`nuevo()`, `normalizar()`, `llenarPerfil()`, submit del perfil, respaldo y restauración)

**Interfaces:**
- Consumes: `Nutri.nuevoNutri`, `Nutri.normalizarNutri`, `Nutri.metaDiaria`, `Nutri.imc`.
- Produces: `datos.nutri` guardado; `metaActual() -> resultado de metaDiaria` (función interna de app.js que usan las tareas 6 a 8).

- [ ] **Step 1: Campos del formulario.**
  - Sexo (radio M/F), peso, talla, cintura, actividad (select con los 4 valores) y objetivo (select con los 3 valores).
  - Condiciones: checkboxes con los 8 valores de la Task 1.
  - Laboratorios: para cada uno de los 8, valor y fecha, con unidades mg/dL o %.
  - `metaMedico`: número de 1000 a 5000, con la ayuda «Si su médico le indicó una meta, escríbala aquí».
  - Debajo del formulario, una caja `data-meta-explicacion` con el IMC, su clase y el `detalle`.
  - Si cambia el peso, se agrega `{id, t, kg}` a `pesos`.
- [ ] **Step 2: Persistencia y respaldo.** `normalizar()` llama a `datos.nutri = Nutri.normalizarNutri(d.nutri)`. El respaldo incluye `nutri`.
- [ ] **Step 3: Verify.** Con `npx http-server app-pacientes -p 8090` y Playwright: llena el perfil M/80/175/40 años/ligera/mantener, guarda y recarga. La caja dice «2350 kcal». Si pones metaMedico 2500, dice «Meta indicada por su médico: 2500 kcal». Restaura un respaldo sin `nutri` y no aparecen errores en la consola.
- [ ] **Step 4: Commit** `"Alimentación: perfil nutricional, meta explicada y respaldo"`

### Task 6: Pestaña «Comidas» (tabla, manual, barra, alertas, 7 días)

**Files:**
- Modify: `app-pacientes/index.html` (botón `data-tab="comidas"` después de Glicemia, panel `data-panel="comidas"`, `<dialog data-dialogo-alimento>`)
- Modify: `app-pacientes/assets/app.js`
- Modify: `app-pacientes/assets/app.css`

**Interfaces:**
- Consumes: `metaActual()`, `Nutri.totalesDia`, `nivelAlerta`, `alertasPorMostrar`, `textoAlerta`, `avisosCondicion`, `tiempoPorHora`, `buscar`, `escalar`, `statsPeriodo`; `alimentos.json` (cargado con `fetch` una vez y guardado en memoria).
- Produces:
  - `agregarComida(comida) -> boolean`: guarda, suma en `frecuentes`, revisa las alertas **solo si `comida.dia === hoy`** y repinta.
  - `pintarComidas(diaISO)`
  - `abrirConfirmacion(items, fuente)`: diálogo editable que reutiliza la Task 7.

- [ ] **Step 1: Pantalla según el esquema 7.2 del spec.**
  - Encabezado con el día y botones ◀ ▶ para cambiar de día.
  - Barra `<progress>`, ámbar desde el 80 %, verde al 90–110 % y roja después del 110 %.
  - Kcal / meta, macronutrientes y sodio.
  - Botones «Foto del plato», «Buscar alimento» y «Anotar a mano».
  - Lista por tiempo de comida con editar porción y borrar.
  - Avisos por condición.
  - Barras de los últimos 7 días contra la meta, dibujadas en canvas con el estilo de `grafica()`.
  - Si `fuente` es `incompleto` o `requiereMedico`, un aviso con un botón a «Mis datos».
- [ ] **Step 2: Alertas.** Usa `mostrarAlerta(tipo, [texto])`: 80 → `"aviso"`, 100 → `"ok"`, 110 → `"critico"` (usa los tipos que ya existen en app.js). Agrega `navigator.vibrate && navigator.vibrate(200)` y guarda los niveles mostrados en `alertasDia[hoy]`.
- [ ] **Step 3: Verify** con Playwright y meta del médico 2500:
  - Agregar 2000 kcal a mano muestra la alerta de 80 % una sola vez, también al agregar 10 kcal más.
  - Llegar a 2500 muestra la de 100 %; llegar a 2760 muestra la de 110 %.
  - Agregar una comida de ayer no dispara ninguna alerta.
  - Sin perfil, aparece «Complete su perfil» y en la página no hay ningún `NaN`.
  - Con el modo sin conexión de Playwright, la búsqueda funciona después de una primera carga.
- [ ] **Step 4: Commit** `"Alimentación: pestaña Comidas con tabla, registro manual, alertas y gráfica semanal"`

### Task 7: Foto del plato

**Files:**
- Modify: `app-pacientes/index.html` (`<input type="file" accept="image/*" capture="environment" hidden data-foto-plato>`, `<dialog data-consent-foto>` con el texto exacto, campo nota)
- Modify: `app-pacientes/assets/app.js`

**Interfaces:**
- Consumes: `abrirConfirmacion` (Task 6) y el contrato HTTP de la Task 4.
- Produces:
  - `URL_IA = "https://<sitio>.netlify.app/api/analizar-plato"`, en una constante con un comentario de cambio para cuando se conecte el dominio. Si el sitio de Netlify no se conoce al implementar, lee `CFG.urlIA` del JSON `clinica-config` y agrégalo ahí.
  - `dispositivoId()`: aleatorio, guardado en `datos.nutri.dispositivo`.

- [ ] **Step 1: Flujo.**
  1. Sin `consentimientoFoto`, se abre el diálogo de consentimiento. «Acepto» guarda el consentimiento; «Ahora no» abre la búsqueda.
  2. Si `!navigator.onLine`, se muestra el mensaje de error y se abre la búsqueda.
  3. Se reduce la imagen con `comprimirImagen(file, maxLado = 1800, calidad = 0.85)`. Hoy la función tiene fijos 1800 y 0.85; agrégale los dos parámetros opcionales para que Exámenes siga igual y aquí se llame con `(file, 1024, 0.7)`. Se envía `dataURL.split(",")[1]`.
  4. `fetch` POST con un tiempo límite de 45 s (`AbortController`).
  5. Si vuelve 200 con alimentos, se abre `abrirConfirmacion(items, "foto")`, mostrando la confianza baja en ámbar. Si vuelve 200 sin alimentos, se muestra el `motivo` y se abre la búsqueda.
  6. Si vuelve 429, 5xx o hay un error de red: «No se pudo analizar la foto; búsquela en la tabla.» y se abre la búsqueda.
  7. La imagen no se guarda.
- [ ] **Step 2: Verify** con Playwright, interceptando la URL de la IA con `page.route`:
  - Una respuesta con 3 alimentos abre la confirmación y no suma nada hasta pulsar «Agregar a mi día».
  - Un alimento con nombre `<img src=x onerror=alert(1)>` se muestra como texto.
  - Un 429 abre la búsqueda.
  - Sin consentimiento aparece el diálogo con el texto exacto.
- [ ] **Step 3: Commit** `"Alimentación: foto del plato con consentimiento, confirmación y respaldo a la tabla"`

### Task 8: Resumen al médico, publicación y documentación

**Files:**
- Modify: `app-pacientes/assets/app.js` (`resumenTexto`, `dibujarReporte`, `textoPeriodo` incluye `datos.nutri.comidas`)
- Modify: `app-pacientes/index.html` (subir `?v=` de app.js, app.css y nutri.js)
- Modify: `app-pacientes/sw.js` (`CACHE = "cmla-mi-salud-v2"`; precarga de `assets/alimentos.json`)
- Modify: `app-pacientes/README.md`, `GUIA-ADMINISTRADOR.md` (sección «Foto del plato: cuenta de Anthropic, clave en Netlify, límite de gasto, LIMITE_MENSUAL_FOTOS»)

- [ ] **Step 1: Resumen.** Sección «*Alimentación*» con:
  - Meta y `detalle`.
  - IMC actual y peso inicial → actual del período.
  - Promedio de kcal y días debajo, dentro o encima de la meta (`statsPeriodo`).
  - % de carbohidratos, proteína y grasa.
  - Los 3 avisos más frecuentes.
  - Si no hay registros: «• Sin registros en el período.»
  - El PNG lleva la misma sección con `titulo()`, `tarjetas()` y `linea()`.
- [ ] **Step 2: Verify.**
  - `node --test tests/` pasa.
  - `npm run build` pasa.
  - Playwright: con 3 días cargados, el texto del resumen contiene «Alimentación» y «Promedio».
  - El PNG se genera sin errores en la consola.
  - Captura del celular a 390 px de las pestañas Comidas y Mis datos, sin desplazamiento horizontal.
- [ ] **Step 3: Commit** `"Alimentación: sección en el resumen al médico, caché sin conexión y guía de configuración"`, luego `git push -u origin ccr-9d281452-6rzy8m`.
