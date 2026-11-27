// Lógica pura de la función «analizar-plato» (sin dependencias de red).
export const ORIGEN_PERMITIDO = "https://drefraintite2906-tech.github.io";
export const MODELO = "claude-opus-5-5";
export const MAX_BYTES_IMAGEN = 1.5 * 1024 * 1024;
export const LIMITE_DIA = 20;
const TIEMPOS = ["desayuno", "almuerzo", "merienda", "cena", "otro"];
const ETIQUETAS = ["carne_roja", "visceras", "mariscos", "bebida_azucarada", "fritura", "alcohol"];
const CONFIANZAS = ["alta", "media", "baja"];

export const ESQUEMA_PLATO = {
  type: "object",
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          nombre: { type: "string" },
          porcion: { type: "string" },
          g: { type: "number" },
          kcal: { type: "number" },
          carb: { type: "number" },
          prot: { type: "number" },
          grasa: { type: "number" },
          grasaSat: { type: "number" },
          sodio: { type: "number" },
          etiquetas: { type: "array", items: { type: "string", enum: ETIQUETAS } },
          confianza: { type: "string", enum: CONFIANZAS },
        },
        required: ["nombre", "porcion", "g", "kcal", "carb", "prot", "grasa", "grasaSat", "sodio", "etiquetas", "confianza"],
        additionalProperties: false,
      },
    },
    motivo: { type: "string" },
  },
  required: ["items", "motivo"],
  additionalProperties: false,
};

const SISTEMA = `Eres un asistente de nutrición para pacientes de una clínica en Panamá. Se te envía la foto de un plato o comida.
Estima los alimentos visibles, cada uno con una porción casera (por ejemplo "1 taza", "1 presa mediana", "2 cucharadas") y su peso aproximado en gramos.
Usa valores nutricionales propios de la comida panameña y latinoamericana (arroz blanco, frijoles, pollo guisado, plátano, yuca, sancocho, tamales, carimañolas, etc.).
Por cada alimento devuelve: kcal, carbohidratos (carb, g), proteínas (prot, g), grasa total (grasa, g), grasa saturada (grasaSat, g) y sodio (sodio, mg).
Usa solo estas etiquetas cuando apliquen: carne_roja, visceras, mariscos, bebida_azucarada, fritura, alcohol.
Indica tu confianza en cada alimento: alta, media o baja.
No des consejos médicos ni recomendaciones de salud.
Si la imagen no es comida, devuelve items vacío y un motivo breve en español; si es comida, motivo es una cadena vacía ("").`;

export function validarSolicitud(body) {
  if (!body || typeof body !== "object") return { ok: false };
  const { imagen, tiempo, nota, dispositivo } = body;
  if (typeof imagen !== "string" || imagen.length === 0) return { ok: false };
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(imagen)) return { ok: false };
  if ((imagen.length * 3) / 4 > MAX_BYTES_IMAGEN) return { ok: false };
  if (!TIEMPOS.includes(tiempo)) return { ok: false };
  if (typeof dispositivo !== "string" || !/^[a-z0-9]{8,40}$/.test(dispositivo)) return { ok: false };
  if (nota !== undefined && nota !== null && (typeof nota !== "string" || nota.length > 120)) return { ok: false };
  return { ok: true, datos: { imagen, tiempo, nota: nota || "", dispositivo } };
}

export function construirPeticion({ imagen, tiempo, nota }) {
  return {
    model: MODELO,
    max_tokens: 16000,
    system: SISTEMA,
    messages: [{
      role: "user",
      content: [
        { type: "image", source: { type: "base64", media_type: "image/jpeg", data: imagen } },
        { type: "text", text: `Tiempo de comida: ${tiempo}. Nota del paciente: ${nota || "ninguna"}` },
      ],
    }],
    output_config: { effort: "low", format: { type: "json_schema", schema: ESQUEMA_PLATO } },
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
  };
}

const num = (v, max) => {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(n, max);
};
const texto = (v, max) =>
  (typeof v === "string" ? v : "").replace(/[<>]/g, "").trim().slice(0, max);

export function interpretarRespuesta(message) {
  if (!message || message.stop_reason === "refusal" || message.stop_reason === "max_tokens") throw new Error("ia");
  // Con fallbacks, un bloque parcial rechazado puede preceder a la respuesta final: se usa el último texto.
  const textos = (message.content || []).filter((b) => b && b.type === "text");
  const bloque = textos[textos.length - 1];
  if (!bloque) throw new Error("ia");
  let data;
  try { data = JSON.parse(bloque.text); } catch { throw new Error("ia"); }
  if (!data || typeof data !== "object" || !Array.isArray(data.items)) throw new Error("ia");
  const items = data.items.slice(0, 30).filter((i) => i && typeof i === "object").map((i) => ({
    nombre: texto(i.nombre, 80),
    porcion: texto(i.porcion, 80),
    g: num(i.g, 5000),
    kcal: num(i.kcal, 5000),
    carb: num(i.carb, 1000),
    prot: num(i.prot, 1000),
    grasa: num(i.grasa, 1000),
    grasaSat: num(i.grasaSat, 1000),
    sodio: num(i.sodio, 20000),
    etiquetas: (Array.isArray(i.etiquetas) ? i.etiquetas : []).filter((e) => ETIQUETAS.includes(e)),
    confianza: CONFIANZAS.includes(i.confianza) ? i.confianza : "baja",
  }));
  const motivo = typeof data.motivo === "string" && data.motivo ? texto(data.motivo, 200) : null;
  return { items, motivo };
}

const CORS = {
  "Access-Control-Allow-Origin": ORIGEN_PERMITIDO,
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  Vary: "Origin",
};
const json = (status, obj) =>
  new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json", ...CORS } });

export function crearHandler({ crearMensaje, contador, limiteMes, ahora }) {
  return async (req) => {
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
    if (req.headers.get("origin") !== ORIGEN_PERMITIDO) return json(403, { error: "origen" });
    if (req.method !== "POST") return json(405, { error: "metodo" });

    let body;
    try { body = await req.json(); } catch { return json(400, { error: "solicitud" }); }
    const v = validarSolicitud(body);
    if (!v.ok) return json(400, { error: "solicitud" });
    const { datos } = v;

    const iso = new Date(ahora().getTime() - 5 * 3600 * 1000).toISOString();
    const claveMes = `mes-${iso.slice(0, 7)}`;
    const claveDia = `dia-${iso.slice(0, 10)}-${datos.dispositivo}`;

    try {
      if ((await contador.leer(claveMes)) >= limiteMes) return json(429, { error: "limite_mes" });
      if ((await contador.incrementar(claveDia)) > LIMITE_DIA) return json(429, { error: "limite_dia" });
      await contador.incrementar(claveMes);
    } catch {
      return json(502, { error: "ia" });
    }

    try {
      const mensaje = await crearMensaje(construirPeticion(datos));
      return json(200, interpretarRespuesta(mensaje));
    } catch {
      return json(502, { error: "ia" });
    }
  };
}
