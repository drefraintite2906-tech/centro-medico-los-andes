const test = require("node:test");
const assert = require("node:assert");
const fs = require("fs");
const path = require("path");
const N = require("../app-pacientes/assets/nutri.js");

const tabla = JSON.parse(fs.readFileSync(path.join(__dirname, "../app-pacientes/assets/alimentos.json"), "utf8"));
const lista = tabla.alimentos;
const NUMS = ["g", "kcal", "carb", "prot", "grasa", "grasaSat", "sodio"];
const ETIQUETAS = ["carne_roja", "visceras", "mariscos", "bebida_azucarada", "fritura", "alcohol"];
function nombres(a) { return a.map(function (x) { return x.nombre; }); }
function porId(id) { return lista.filter(function (a) { return a.id === id; })[0]; }

test("alimentos.json: estructura, ≥180 alimentos e id únicos", () => {
  assert.strictEqual(tabla.version, 1);
  assert.ok(Array.isArray(tabla.fuentes) && tabla.fuentes.length >= 2);
  assert.ok(typeof tabla.nota === "string" && tabla.nota.length > 20);
  assert.ok(lista.length >= 180, "hay " + lista.length);
  const ids = {};
  for (const a of lista) {
    assert.ok(typeof a.id === "string" && /^[a-z0-9_]+$/.test(a.id), "id " + a.id);
    assert.ok(!ids[a.id], "id repetido " + a.id);
    ids[a.id] = 1;
    assert.ok(typeof a.nombre === "string" && a.nombre.length > 1, a.id);
    assert.ok(typeof a.porcion === "string" && a.porcion.length > 0, a.id);
    assert.ok(Array.isArray(a.sinonimos), a.id);
    assert.ok(Array.isArray(a.etiquetas), a.id);
    for (const e of a.etiquetas) assert.ok(ETIQUETAS.indexOf(e) !== -1, a.id + " etiqueta " + e);
    assert.ok(a.fuente === "INCAP" || a.fuente === "USDA", a.id + " fuente");
  }
});

test("alimentos.json: todos los números son finitos y ≥ 0; grasa saturada ≤ grasa; g > 0", () => {
  for (const a of lista) {
    for (const k of NUMS) {
      assert.ok(typeof a[k] === "number" && isFinite(a[k]) && a[k] >= 0, a.id + "." + k + " = " + a[k]);
    }
    assert.ok(a.g > 0, a.id + " g");
    assert.ok(a.grasaSat <= a.grasa, a.id + " grasaSat > grasa");
  }
});

test("alimentos.json: kcal coherentes con 4·carb + 4·prot + 9·grasa (salvo alcohol)", () => {
  for (const a of lista) {
    if (a.etiquetas.indexOf("alcohol") !== -1) continue;
    const calc = 4 * a.carb + 4 * a.prot + 9 * a.grasa;
    assert.ok(Math.abs(a.kcal - calc) <= 0.25 * a.kcal + 15, a.id + ": kcal " + a.kcal + " vs " + calc.toFixed(1));
  }
});

test("alimentos.json: la cerveza lleva la etiqueta alcohol", () => {
  const cervezas = lista.filter(function (a) { return /cerveza/i.test(a.nombre); });
  assert.ok(cervezas.length >= 1);
  for (const c of cervezas) assert.ok(c.etiquetas.indexOf("alcohol") !== -1, c.id);
});

test("sinAcentos quita tildes, diéresis y eñe y pasa a minúsculas", () => {
  assert.strictEqual(N.sinAcentos("Plátano GUANDÚ Ñame Pingüino"), "platano guandu name pinguino");
  assert.strictEqual(N.sinAcentos(null), "");
  assert.strictEqual(N.sinAcentos(42), "42");
});

test("buscar('platano') encuentra Patacón (por sinónimo) y Plátano maduro", () => {
  const r = nombres(N.buscar(lista, "platano"));
  assert.ok(r.indexOf("Patacón") !== -1, r.join(", "));
  assert.ok(r.some(function (n) { return n.indexOf("Plátano maduro") === 0; }), r.join(", "));
});

test("buscar('GUANDU') encuentra el arroz con guandú", () => {
  const r = N.buscar(lista, "GUANDU");
  assert.ok(r.some(function (a) { return a.id === "arroz_con_guandu"; }), nombres(r).join(", "));
});

test("buscar por sinónimos: guineo/banano, porotos/frijoles", () => {
  assert.ok(N.buscar(lista, "banano").some(function (a) { return a.id === "guineo"; }));
  assert.ok(N.buscar(lista, "frijoles").some(function (a) { return a.id === "porotos_guisados"; }));
});

test("buscar: varias palabras deben coincidir todas, en cualquier orden", () => {
  const r = N.buscar(lista, "pollo arroz");
  assert.ok(r.some(function (a) { return a.id === "arroz_con_pollo"; }));
  for (const a of r) {
    const h = N.sinAcentos(a.nombre + " " + a.sinonimos.join(" "));
    assert.ok(h.indexOf("pollo") !== -1 && h.indexOf("arroz") !== -1, a.id);
  }
});

test("buscar: máximo 20, consulta vacía sin frecuentes da [] y lista vacía/no válida da []", () => {
  assert.ok(N.buscar(lista, "a").length <= 20);
  assert.strictEqual(N.buscar(lista, "a").length, 20);
  assert.deepStrictEqual(N.buscar(lista, "   "), []);
  assert.deepStrictEqual(N.buscar(null, "arroz"), []);
  assert.deepStrictEqual(N.buscar(lista, "zzzzqqq"), []);
});

test("buscar: los frecuentes van primero, luego los que empiezan por la consulta", () => {
  const sin = N.buscar(lista, "arroz");
  // sin frecuentes: los que empiezan por «arroz» van antes que los que no
  let vistoNoInicio = false;
  for (const a of sin) {
    const inicio = N.sinAcentos(a.nombre).indexOf("arroz") === 0;
    if (!inicio) vistoNoInicio = true;
    else assert.ok(!vistoNoInicio, "orden de inicio: " + nombres(sin).join(", "));
  }
  // con frecuentes: el más usado va primero aunque no empiece por la consulta
  const conAlguno = sin.filter(function (a) { return N.sinAcentos(a.nombre).indexOf("arroz") !== 0; })[0];
  assert.ok(conAlguno, "debe haber algún resultado que no empieza por arroz");
  const frec = {}; frec[conAlguno.id] = 9; frec.arroz_con_pollo = 3;
  const con = N.buscar(lista, "arroz", frec);
  assert.strictEqual(con[0].id, conAlguno.id);
  assert.strictEqual(con[1].id, "arroz_con_pollo");
});

test("buscar: consulta vacía con frecuentes devuelve los frecuentes por uso", () => {
  const r = N.buscar(lista, "", { guineo: 2, arroz_blanco: 5, no_existe: 9, toString: 4 });
  assert.deepStrictEqual(r.map(function (a) { return a.id; }), ["arroz_blanco", "guineo"]);
});

test("escalar(arroz, 1.5) redondea kcal y sodio a entero y macros a 1 decimal", () => {
  const arroz = porId("arroz_blanco");
  const it = N.escalar(arroz, 1.5);
  assert.strictEqual(it.kcal, Math.round(arroz.kcal * 1.5));
  assert.strictEqual(it.sodio, Math.round(arroz.sodio * 1.5));
  assert.strictEqual(it.carb, Math.round(arroz.carb * 1.5 * 10) / 10);
  assert.strictEqual(it.prot, Math.round(arroz.prot * 1.5 * 10) / 10);
  assert.strictEqual(it.grasa, Math.round(arroz.grasa * 1.5 * 10) / 10);
  assert.strictEqual(it.grasaSat, Math.round(arroz.grasaSat * 1.5 * 10) / 10);
  assert.strictEqual(it.g, Math.round(arroz.g * 1.5));
  assert.strictEqual(it.nombre, arroz.nombre);
  assert.strictEqual(it.alimentoId, "arroz_blanco");
  assert.strictEqual(it.porcion, "1½ taza");
  assert.deepStrictEqual(Object.keys(it).sort(),
    ["alimentoId", "carb", "etiquetas", "g", "grasa", "grasaSat", "kcal", "nombre", "porcion", "prot", "sodio"]);
});

test("escalar: texto de porción con ½, ¼, ¾ y decimales; copia las etiquetas", () => {
  const a = { id: "x", nombre: "X", porcion: "1 taza", g: 100, kcal: 100, carb: 10, prot: 5, grasa: 2, grasaSat: 1, sodio: 50, etiquetas: ["fritura"] };
  assert.strictEqual(N.escalar(a, 1).porcion, "1 taza");
  assert.strictEqual(N.escalar(a, 0.5).porcion, "½ taza");
  assert.strictEqual(N.escalar(a, 2).porcion, "2 taza");
  assert.strictEqual(N.escalar(a, 2.25).porcion, "2¼ taza");
  assert.strictEqual(N.escalar(a, 0.75).porcion, "¾ taza");
  assert.strictEqual(N.escalar(a, 1.3).porcion, "1,3 taza");
  assert.strictEqual(N.escalar({ porcion: "3 unidades", g: 90, kcal: 1, carb: 0, prot: 0, grasa: 0, grasaSat: 0, sodio: 0, etiquetas: [] }, 0.5).porcion, "1½ unidades");
  assert.strictEqual(N.escalar({ porcion: "½ taza", g: 90, kcal: 1, carb: 0, prot: 0, grasa: 0, grasaSat: 0, sodio: 0, etiquetas: [] }, 3).porcion, "1½ taza");
  assert.strictEqual(N.escalar({ porcion: "porción", g: 90, kcal: 1, carb: 0, prot: 0, grasa: 0, grasaSat: 0, sodio: 0, etiquetas: [] }, 2).porcion, "2 × porción");
  const it = N.escalar(a, 1);
  assert.deepStrictEqual(it.etiquetas, ["fritura"]);
  assert.notStrictEqual(it.etiquetas, a.etiquetas);
});

test("escalar: multiplicador no válido se toma como 1", () => {
  const a = porId("guineo");
  for (const m of [0, -1, NaN, "2", undefined, Infinity]) {
    assert.strictEqual(N.escalar(a, m).kcal, a.kcal, String(m));
  }
});

// ---- Correcciones de la revisión ----
function ids(r) { return r.map(function (a) { return a.id; }); }

test("alimentos.json: marcado como no revisado y nota sin presentar los valores como transcritos", () => {
  assert.strictEqual(tabla.revisado, false);
  assert.strictEqual(tabla.revisadoPor, null);
  assert.strictEqual(tabla.fechaRevision, null);
  assert.ok(/no se transcribieron/i.test(tabla.nota), tabla.nota);
  assert.ok(/verifi/i.test(tabla.nota) && /médico|nutricionista/i.test(tabla.nota), tabla.nota);
});

test("alimentos.json: sardinas con mariscos (purinas); jugos 100 % y duro con bebida_azucarada", () => {
  assert.ok(porId("sardinas").etiquetas.indexOf("mariscos") !== -1);
  assert.ok(porId("jugo_naranja").etiquetas.indexOf("bebida_azucarada") !== -1);
  assert.ok(porId("duro").etiquetas.indexOf("bebida_azucarada") !== -1);
  assert.strictEqual(porId("chicha_sin_azucar").etiquetas.indexOf("bebida_azucarada"), -1);
});

test("alimentos.json: valores corregidos de yuca hervida, combo de pollo y sopa instantánea", () => {
  const y = porId("yuca_hervida");
  assert.ok(y.kcal / y.g * 100 >= 100 && y.kcal / y.g * 100 <= 125, "yuca " + (y.kcal / y.g * 100));
  const c = porId("pollo_frito_combo");
  assert.ok(c.kcal >= 950 && c.kcal <= 1150, "combo " + c.kcal);
  const s = porId("sopa_instantanea");
  assert.ok(s.g >= 300, "sopa preparada pesa " + s.g);
});

test("buscar: las palabras coinciden al inicio de palabra, no en medio", () => {
  assert.strictEqual(ids(N.buscar(lista, "pollo")).indexOf("ensalada_repollo"), -1);
  assert.strictEqual(ids(N.buscar(lista, "seco")).indexOf("mezcla_nueces"), -1);
  const r = ids(N.buscar(lista, "ñame"));
  assert.strictEqual(r[0], "name_hervido");
  assert.strictEqual(r.indexOf("queso_blanco"), -1);
});

test("buscar('coca cola') da primero la soda regular", () => {
  assert.strictEqual(N.buscar(lista, "coca cola")[0].id, "soda_regular");
  assert.strictEqual(N.buscar(lista, "pepsi")[0].id, "soda_regular");
});
