const test = require("node:test");
const assert = require("node:assert/strict");
const N = require("../app-pacientes/assets/nutri.js");
test("imc", () => { assert.deepEqual(N.imc(80, 175), { valor: 26.1, clase: "sobrepeso" }); assert.equal(N.imc(0, 170), null); });
test("imc cortes", () => {
  assert.equal(N.imc(50, 170).clase, "bajo"); assert.equal(N.imc(70, 170).clase, "normal");
  assert.equal(N.imc(95, 170).clase, "obesidad1"); assert.equal(N.imc(110, 170).clase, "obesidad2");
  assert.equal(N.imc(130, 170).clase, "obesidad3"); assert.equal(N.imc(70, null), null);
});
test("tmb Mifflin", () => { assert.equal(N.tmb("M", 80, 175, 40), 1698.75); assert.equal(N.tmb("F", 65, 160, 35), 1314); assert.equal(N.tmb("", 65, 160, 35), null); });
test("meta cálculo", () => { const m = N.metaDiaria({ sexo:"M", pesoKg:80, tallaCm:175, actividad:"ligera", objetivo:"mantener", condiciones:[] }, 40);
  assert.equal(m.kcal, 2350); assert.equal(m.fuente, "calculo"); assert.match(m.detalle, /1699 × 1,375/); assert.match(m.detalle, /= 2336 \+ 0 = 2350 kcal/); });
test("meta médico prioriza", () => assert.equal(N.metaDiaria({ metaMedico: 2500 }, 40).kcal, 2500));
test("meta médico gana sobre embarazo", () => { const m = N.metaDiaria({ metaMedico: 2200, condiciones:["embarazo"] }, 30); assert.equal(m.kcal, 2200); assert.equal(m.fuente, "medico"); });
test("mínimo mujer", () => { const m = N.metaDiaria({ sexo:"F", pesoKg:45, tallaCm:150, actividad:"sedentario", objetivo:"bajar", condiciones:[] }, 60); assert.equal(m.kcal, 1200); assert.equal(m.minimoAplicado, true); });
test("embarazo y menor requieren médico", () => {
  assert.equal(N.metaDiaria({ sexo:"F", pesoKg:60, tallaCm:160, actividad:"ligera", objetivo:"mantener", condiciones:["embarazo"] }, 30).fuente, "requiereMedico");
  const m = N.metaDiaria({ sexo:"M", pesoKg:60, tallaCm:170, actividad:"ligera", objetivo:"mantener", condiciones:[] }, 16);
  assert.equal(m.fuente, "requiereMedico"); assert.equal(m.kcal, null); });
test("incompleto sin NaN", () => { const m = N.metaDiaria({ sexo:"", pesoKg:null }, 40); assert.equal(m.kcal, null); assert.equal(m.fuente, "incompleto"); });
test("imc clase según valor redondeado", () => { const r = N.imc(76.48, 175); assert.equal(r.valor, 25); assert.equal(r.clase, "sobrepeso"); });
