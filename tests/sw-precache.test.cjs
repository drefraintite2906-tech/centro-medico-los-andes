const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const dir = path.join(__dirname, "..", "app-pacientes");
const sw = fs.readFileSync(path.join(dir, "sw.js"), "utf8");
const html = fs.readFileSync(path.join(dir, "index.html"), "utf8");

test("sw.js conserva el nombre de caché (no borra la copia sin conexión de los teléfonos)", () => {
  assert.match(sw, /var CACHE = "cmla-mi-salud-v1";/);
});

test("PRECACHE de sw.js incluye los mismos ?v= que index.html y los archivos existen", () => {
  const lista = JSON.parse("[" + /var PRECACHE = \[([\s\S]*?)\];/.exec(sw)[1] + "]");
  const versionados = [...html.matchAll(/(?:href|src)="(assets\/[^"]+\?v=\d+)"/g)].map((m) => m[1]);
  assert.ok(versionados.length >= 4);
  for (const u of versionados) assert.ok(lista.includes(u), "falta en PRECACHE: " + u);
  for (const u of lista) if (u) assert.ok(fs.existsSync(path.join(dir, u.split("?")[0])), "no existe: " + u);
});
