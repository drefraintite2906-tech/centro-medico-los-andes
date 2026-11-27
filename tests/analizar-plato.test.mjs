import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ORIGEN_PERMITIDO, ESQUEMA_PLATO, validarSolicitud, construirPeticion,
  interpretarRespuesta, crearHandler,
} from "../netlify/functions/lib/plato.mjs";

const IMG = Buffer.from("fakejpeg").toString("base64");
const DISP = "abcd1234efgh";
const AHORA = () => new Date("2026-11-27T15:00:00Z");

function contadorMem() {
  const m = new Map();
  return {
    m,
    async incrementar(k) { const v = (m.get(k) || 0) + 1; m.set(k, v); return v; },
    async leer(k) { return m.get(k) || 0; },
  };
}
function mensaje(obj, extra = {}) {
  return { stop_reason: "end_turn", content: [{ type: "text", text: JSON.stringify(obj) }], ...extra };
}
const itemOk = { nombre: "Arroz", porcion: "1 taza", g: 150, kcal: 200, carb: 40, prot: 4, grasa: 1, grasaSat: 0, sodio: 5, etiquetas: [], confianza: "alta" };

function montar(opts = {}) {
  const contador = opts.contador || contadorMem();
  const llamadas = [];
  const crearMensaje = opts.crearMensaje || (async (p) => { llamadas.push(p); return mensaje({ items: [itemOk], motivo: null }); });
  const handler = crearHandler({ crearMensaje, contador, limiteMes: opts.limiteMes ?? 3000, ahora: AHORA });
  return { handler, contador, llamadas, crearMensaje };
}
function post(body, headers = {}) {
  return new Request("https://x.netlify.app/api/analizar-plato", {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: ORIGEN_PERMITIDO, ...headers },
    body: JSON.stringify(body),
  });
}
const base = { imagen: IMG, tiempo: "almuerzo", dispositivo: DISP };

test("origen distinto da 403", async () => {
  const { handler } = montar();
  const r = await handler(post(base, { Origin: "https://malo.example" }));
  assert.equal(r.status, 403);
  assert.deepEqual(await r.json(), { error: "origen" });
});

test("OPTIONS da 204 con CORS", async () => {
  const { handler } = montar();
  const r = await handler(new Request("https://x/api/analizar-plato", { method: "OPTIONS", headers: { Origin: ORIGEN_PERMITIDO } }));
  assert.equal(r.status, 204);
  assert.equal(r.headers.get("Access-Control-Allow-Origin"), ORIGEN_PERMITIDO);
});

test("otro método da 405", async () => {
  const { handler } = montar();
  const r = await handler(new Request("https://x/api/analizar-plato", { method: "GET", headers: { Origin: ORIGEN_PERMITIDO } }));
  assert.equal(r.status, 405);
});

test("sin imagen o imagen > 1.5 MB da 400", async () => {
  const { handler, llamadas } = montar();
  let r = await handler(post({ ...base, imagen: undefined }));
  assert.equal(r.status, 400);
  const grande = Buffer.alloc(1.5 * 1024 * 1024 + 100).toString("base64");
  r = await handler(post({ ...base, imagen: grande }));
  assert.equal(r.status, 400);
  assert.deepEqual(await r.json(), { error: "solicitud" });
  assert.equal(llamadas.length, 0);
});

test("dispositivo 21 en el día da 429 limite_dia sin llamar a la IA", async () => {
  const { handler, llamadas } = montar();
  for (let i = 0; i < 20; i++) assert.equal((await handler(post(base))).status, 200);
  const r = await handler(post(base));
  assert.equal(r.status, 429);
  assert.deepEqual(await r.json(), { error: "limite_dia" });
  assert.equal(llamadas.length, 20);
});

test("contador del mes en el límite da 429 limite_mes", async () => {
  const contador = contadorMem();
  contador.m.set("mes-2026-11", 5);
  const { handler, llamadas } = montar({ contador, limiteMes: 5 });
  const r = await handler(post(base));
  assert.equal(r.status, 429);
  assert.deepEqual(await r.json(), { error: "limite_mes" });
  assert.equal(llamadas.length, 0);
});

test("claves de contador en hora de Panamá", async () => {
  const contador = contadorMem();
  const { handler } = montar({ contador });
  await handler(post(base));
  assert.ok(contador.m.has("mes-2026-11"));
  assert.ok(contador.m.has(`dia-2026-11-27-${DISP}`));
});

test("construirPeticion", () => {
  const p = construirPeticion({ imagen: IMG, tiempo: "cena", nota: "sin sal", dispositivo: DISP });
  assert.equal(p.model, "claude-opus-5-5");
  assert.equal(p.max_tokens, 4000);
  assert.equal(p.output_config.effort, "low");
  assert.equal(p.output_config.format.type, "json_schema");
  assert.equal(p.output_config.format.schema, ESQUEMA_PLATO);
  assert.ok(p.betas.includes("server-side-fallback-2026-07-01"));
  assert.equal(p.fallbacks, "default");
  assert.equal(p.thinking, undefined);
  const [img, txt] = p.messages[0].content;
  assert.equal(img.type, "image");
  assert.equal(img.source.type, "base64");
  assert.equal(img.source.media_type, "image/jpeg");
  assert.match(txt.text, /Tiempo de comida: cena\. Nota del paciente: sin sal/);
});

test("esquema estricto", () => {
  const revisar = (o) => {
    if (o && typeof o === "object") {
      if (o.type === "object") {
        assert.equal(o.additionalProperties, false);
        assert.deepEqual([...o.required].sort(), Object.keys(o.properties).sort());
      }
      Object.values(o).forEach(revisar);
    }
  };
  revisar(ESQUEMA_PLATO);
});

test("refusal da 502 ia", async () => {
  const { handler } = montar({ crearMensaje: async () => ({ stop_reason: "refusal", content: [] }) });
  const r = await handler(post(base));
  assert.equal(r.status, 502);
  assert.deepEqual(await r.json(), { error: "ia" });
});

test("error de la IA da 502 sin detalles", async () => {
  const { handler } = montar({ crearMensaje: async () => { throw new Error("secreto sk-123"); } });
  const r = await handler(post(base));
  assert.equal(r.status, 502);
  assert.equal(await r.text(), JSON.stringify({ error: "ia" }));
});

test("sanea la respuesta", () => {
  const r = interpretarRespuesta(mensaje({
    items: [
      { ...itemOk, kcal: -5, nombre: "<b>x</b>" },
      { ...itemOk, kcal: "300", nombre: "y".repeat(200) },
      ...Array.from({ length: 38 }, () => itemOk),
    ],
    motivo: null,
  }));
  assert.equal(r.items.length, 30);
  assert.equal(r.items[0].kcal, 0);
  assert.equal(r.items[1].kcal, 300);
  assert.ok(!/[<>]/.test(r.items[0].nombre));
  assert.ok(r.items[1].nombre.length <= 80);
});

test("interpretarRespuesta falla con max_tokens, sin texto o JSON inválido", () => {
  assert.throws(() => interpretarRespuesta({ stop_reason: "max_tokens", content: [] }), /ia/);
  assert.throws(() => interpretarRespuesta({ stop_reason: "end_turn", content: [] }), /ia/);
  assert.throws(() => interpretarRespuesta({ stop_reason: "end_turn", content: [{ type: "text", text: "no json" }] }), /ia/);
});

test("no comida: items vacíos con motivo", async () => {
  const { handler } = montar({ crearMensaje: async () => mensaje({ items: [], motivo: "No es comida" }) });
  const r = await handler(post(base));
  assert.equal(r.status, 200);
  assert.deepEqual(await r.json(), { items: [], motivo: "No es comida" });
});

test("no devuelve la imagen ni la registra en consola", async () => {
  const llamado = [];
  const orig = { log: console.log, error: console.error };
  console.log = (...a) => llamado.push(a.join(" "));
  console.error = (...a) => llamado.push(a.join(" "));
  try {
    const { handler } = montar();
    const r = await handler(post(base));
    assert.ok(!(await r.text()).includes(IMG));
  } finally { console.log = orig.log; console.error = orig.error; }
  assert.ok(!llamado.some((l) => l.includes(IMG)));
});

test("validarSolicitud", () => {
  assert.equal(validarSolicitud(base).ok, true);
  assert.equal(validarSolicitud({ ...base, tiempo: "brunch" }).ok, false);
  assert.equal(validarSolicitud({ ...base, dispositivo: "A!" }).ok, false);
  assert.equal(validarSolicitud({ ...base, nota: "x".repeat(121) }).ok, false);
  assert.equal(validarSolicitud(null).ok, false);
});
