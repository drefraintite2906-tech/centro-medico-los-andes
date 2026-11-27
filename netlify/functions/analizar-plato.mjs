import Anthropic from "@anthropic-ai/sdk";
import { getStore } from "@netlify/blobs";
import { crearHandler } from "./lib/plato.mjs";

// Contador simple (leer -> +1 -> guardar); la consistencia eventual es aceptable.
function contadorBlobs() {
  const store = getStore("ia-fotos");
  const leer = async (clave) => Number((await store.get(clave)) || 0) || 0;
  return {
    leer,
    async incrementar(clave) {
      const n = (await leer(clave)) + 1;
      await store.set(clave, String(n));
      return n;
    },
  };
}

export default async (req) => {
  const client = new Anthropic();
  const handler = crearHandler({
    crearMensaje: (p) => client.beta.messages.create(p),
    contador: contadorBlobs(),
    limiteMes: Number(process.env.LIMITE_MENSUAL_FOTOS) || 3000,
    ahora: () => new Date(),
  });
  return handler(req);
};

export const config = { path: "/api/analizar-plato" };
