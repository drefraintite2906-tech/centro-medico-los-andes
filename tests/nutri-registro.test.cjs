const test = require("node:test");
const assert = require("node:assert");
const N = require("../app-pacientes/assets/nutri.js");

function perfil(over) {
  var p = { sexo: "M", pesoKg: 80, tallaCm: 175, cinturaCm: null, actividad: "ligera", objetivo: "mantener",
    condiciones: [], labs: { glucosa: null, hba1c: null, colesterol: null, ldl: null, hdl: null,
      trigliceridos: null, creatinina: null, acidoUrico: null }, metaMedico: null };
  for (var k in over) p[k] = over[k];
  return p;
}
function claves(a) { return a.map(function (x) { return x.clave; }); }
function it(o) {
  var r = { nombre: "x", porcion: "1", g: 100, kcal: 0, carb: 0, prot: 0, grasa: 0, grasaSat: 0, sodio: 0, etiquetas: [] };
  for (var k in o) r[k] = o[k];
  return r;
}

test("metaDiaria ignora claves heredadas del prototipo", () => {
  assert.strictEqual(N.metaDiaria({ sexo: "M", pesoKg: 80, tallaCm: 175, actividad: "toString", objetivo: "mantener", condiciones: [] }, 40).fuente, "incompleto");
});

test("totalesDia usa dia, no t", () => {
  var cs = [
    { id: "a", t: Date.UTC(2026, 10, 27, 12), dia: "2026-11-27", items: [it({ kcal: 300, carb: 10 })] },
    { id: "b", t: Date.UTC(2026, 10, 27, 12), dia: "2026-11-26", items: [it({ kcal: 999 })] }
  ];
  var t = N.totalesDia(cs, "2026-11-27");
  assert.strictEqual(t.kcal, 300);
  assert.strictEqual(t.carb, 10);
});

test("nivelAlerta", () => {
  assert.strictEqual(N.nivelAlerta(1999, 2500), 0);
  assert.strictEqual(N.nivelAlerta(2000, 2500), 80);
  assert.strictEqual(N.nivelAlerta(2500, 2500), 100);
  assert.strictEqual(N.nivelAlerta(2751, 2500), 110);
  assert.strictEqual(N.nivelAlerta(500, null), 0);
});

test("alertasPorMostrar", () => {
  assert.deepStrictEqual(N.alertasPorMostrar(110, []), [110]);
  assert.deepStrictEqual(N.alertasPorMostrar(100, [80]), [100]);
  assert.deepStrictEqual(N.alertasPorMostrar(80, [80]), []);
  assert.deepStrictEqual(N.alertasPorMostrar(0, [80]), []);
});

test("cambio de meta baja el nivel", () => {
  assert.strictEqual(N.nivelAlerta(1700, 2000), 80);
  assert.strictEqual(N.nivelAlerta(1700, 2500), 0);
});

test("textoAlerta", () => {
  assert.strictEqual(N.textoAlerta(80, 1700, 2000), "Se está acercando a su meta. Le quedan 300 kcal.");
  assert.strictEqual(N.textoAlerta(100, 2000, 2000), "Llegó a su meta de hoy.");
  assert.strictEqual(N.textoAlerta(110, 2300, 2000), "Pasó su meta por 300 kcal.");
});

test("avisos: carbohidratos", () => {
  var p = perfil({ condiciones: ["dm2"] });
  assert.ok(claves(N.avisosCondicion(p, { kcal: 2000, carb: 260 }, [], "2026-11-27")).indexOf("carb_dia") !== -1);
  var cs = [{ id: "a", dia: "2026-11-27", items: [it({ carb: 70, kcal: 400 })] }];
  assert.ok(claves(N.avisosCondicion(p, { kcal: 400, carb: 70 }, cs, "2026-11-27")).indexOf("carb_comida") !== -1);
  var p2 = perfil(); p2.labs.hba1c = { v: 6.0, fecha: "2026-11-01" };
  assert.ok(claves(N.avisosCondicion(p2, { kcal: 2000, carb: 260 }, [], "2026-11-27")).indexOf("carb_dia") !== -1);
});

test("avisos: erc, hta, grasa_sat, gota, labs_viejos", () => {
  var h = "2026-11-27";
  assert.ok(claves(N.avisosCondicion(perfil({ condiciones: ["erc"], pesoKg: 70 }), { kcal: 2000, prot: 70 }, [], h)).indexOf("proteina") !== -1);
  assert.ok(claves(N.avisosCondicion(perfil({ condiciones: ["hta"] }), { kcal: 2000, sodio: 2100 }, [], h)).indexOf("sodio") !== -1);
  var p = perfil({ condiciones: ["dm2"] }); p.labs.ldl = { v: 110, fecha: "2026-11-01" };
  var t = { kcal: 2000, grasaSat: 25 };
  assert.ok(claves(N.avisosCondicion(p, t, [], h)).indexOf("grasa_sat") !== -1);
  var q = perfil(); q.labs.ldl = { v: 110, fecha: "2026-11-01" };
  assert.ok(claves(N.avisosCondicion(q, t, [], h)).indexOf("grasa_sat") === -1);
  var cs = [{ id: "a", dia: h, items: [it({ etiquetas: ["visceras"] })] }];
  assert.ok(claves(N.avisosCondicion(perfil({ condiciones: ["gota"] }), { kcal: 500 }, cs, h)).indexOf("gota") !== -1);
  var v = perfil(); v.labs.glucosa = { v: 90, fecha: "2026-05-11" };
  assert.ok(claves(N.avisosCondicion(v, { kcal: 0 }, [], h)).indexOf("labs_viejos") !== -1);
  var r = perfil(); r.labs.glucosa = { v: 90, fecha: "2026-10-11" };
  assert.ok(claves(N.avisosCondicion(r, { kcal: 0 }, [], h)).indexOf("labs_viejos") === -1);
});

test("avisos: kcal 0 no divide", () => {
  var r = N.avisosCondicion(perfil({ condiciones: ["dm2"] }), { kcal: 0, carb: 0, grasaSat: 0 }, [], "2026-11-27");
  assert.strictEqual(claves(r).indexOf("carb_dia"), -1);
});

test("normalizarNutri no lanza", () => {
  var n = N.normalizarNutri(null);
  assert.deepStrictEqual(n.comidas, []);
  assert.deepStrictEqual(n.perfil.condiciones, []);
  assert.strictEqual(n.perfil.metaMedico, null);
  assert.strictEqual(n.perfil.labs.hba1c, null);
  assert.deepStrictEqual(N.normalizarNutri({ comidas: "x" }).comidas, []);
  var m = N.normalizarNutri({ comidas: [
    { id: "a", dia: "2026-11-27", items: [{ kcal: "abc", carb: -5 }] },
    { dia: "2026-11-27", items: [] },
    { id: "c", dia: "mal", items: [] }
  ], pesos: "x", alertasDia: { "2026-11-27": [80, "z"] }, frecuentes: { a: "q", b: 3 } });
  assert.strictEqual(m.comidas.length, 1);
  assert.strictEqual(m.comidas[0].items[0].kcal, 0);
  assert.strictEqual(m.comidas[0].items[0].carb, 0);
  assert.deepStrictEqual(m.comidas[0].items[0].etiquetas, []);
  assert.deepStrictEqual(m.pesos, []);
  assert.deepStrictEqual(m.alertasDia["2026-11-27"], [80]);
  assert.strictEqual(m.frecuentes.a, 0);
  assert.strictEqual(m.frecuentes.b, 3);
  assert.doesNotThrow(function () { N.normalizarNutri({ comidas: [null, 5, { id: "z", dia: "2026-11-27", items: [null] }] }); });
});

test("nuevoNutri", () => {
  var n = N.nuevoNutri();
  assert.deepStrictEqual(n.comidas, []);
  assert.deepStrictEqual(n.alertasDia, {});
});

test("tiempoPorHora", () => {
  assert.strictEqual(N.tiempoPorHora(new Date(2026, 10, 27, 13, 0)), "almuerzo");
  assert.strictEqual(N.tiempoPorHora(new Date(2026, 10, 27, 8, 0)), "desayuno");
  assert.strictEqual(N.tiempoPorHora(new Date(2026, 10, 27, 16, 0)), "merienda");
  assert.strictEqual(N.tiempoPorHora(new Date(2026, 10, 27, 20, 0)), "cena");
  assert.strictEqual(N.tiempoPorHora(new Date(2026, 10, 27, 23, 0)), "otro");
});

test("statsPeriodo", () => {
  var cs = [
    { id: "a", dia: "2026-11-25", items: [it({ kcal: 2000, carb: 250, prot: 100, grasa: 40 })] },
    { id: "b", dia: "2026-11-26", items: [it({ kcal: 2500 })] },
    { id: "c", dia: "2026-11-27", items: [it({ kcal: 3000 })] }
  ];
  var s = N.statsPeriodo(cs, 2500, ["2026-11-24", "2026-11-25", "2026-11-26", "2026-11-27"]);
  assert.strictEqual(s.n, 3);
  assert.strictEqual(s.prom, 2500);
  assert.strictEqual(s.debajo, 1);
  assert.strictEqual(s.dentro, 1);
  assert.strictEqual(s.encima, 1);
  assert.strictEqual(typeof s.pct.carb, "number");
});

test("gota: cualquiera de las etiquetas (incluido alcohol)", () => {
  ["carne_roja", "visceras", "mariscos", "bebida_azucarada", "alcohol"].forEach(function (e) {
    var cs = [{ id: "a", dia: "2026-11-27", items: [it({ etiquetas: [e] })] }];
    assert.ok(claves(N.avisosCondicion(perfil({ condiciones: ["gota"] }), { kcal: 500 }, cs, "2026-11-27")).indexOf("gota") !== -1, e);
  });
});

test("grasa_sat por trigliceridos o dislipidemia", () => {
  var t = { kcal: 2000, grasaSat: 25 }, h = "2026-11-27";
  var p = perfil(); p.labs.trigliceridos = { v: 160, fecha: "2026-11-01" }; p.labs.ldl = { v: 90, fecha: "2026-11-01" };
  assert.ok(claves(N.avisosCondicion(p, t, [], h)).indexOf("grasa_sat") !== -1);
  assert.ok(claves(N.avisosCondicion(perfil({ condiciones: ["dislipidemia"] }), t, [], h)).indexOf("grasa_sat") !== -1);
});

test("normalizarNutri ignora claves de prototipo", () => {
  var r = N.normalizarNutri(JSON.parse('{"frecuentes":{"__proto__":{"x":1}},"alertasDia":{"__proto__":[80]}}'));
  assert.strictEqual(Object.getPrototypeOf(r.frecuentes), Object.prototype);
  assert.strictEqual(Object.getPrototypeOf(r.alertasDia), Object.prototype);
  assert.strictEqual(Object.keys(r.frecuentes).length, 0);
});

test("normalizarNutri conserva dispositivo solo si es válido", () => {
  assert.strictEqual(N.normalizarNutri({ dispositivo: "abc123def456ghi789jk" }).dispositivo, "abc123def456ghi789jk");
  assert.strictEqual(N.normalizarNutri({ dispositivo: "ABC" }).dispositivo, undefined);
  assert.strictEqual(N.normalizarNutri({ dispositivo: "a b c d e f g h" }).dispositivo, undefined);
  assert.strictEqual(N.normalizarNutri({ dispositivo: 5 }).dispositivo, undefined);
});

test("normalizarNutri sanea pesos", () => {
  var r = N.normalizarNutri({ pesos: [null, { kg: "x" }, { id: "a", t: 1, kg: 80 }, { id: "b", t: 2, kg: 0 }, { id: 3, t: 1, kg: 70 }] });
  assert.deepStrictEqual(r.pesos, [{ id: "a", t: 1, kg: 80 }]);
});
