/* Nutri: cálculos de alimentación (ES5, sin dependencias). */
(function (root, f) {
  if (typeof module === "object" && module.exports) module.exports = f();
  else root.Nutri = f();
})(this, function () {
  "use strict";

  var ACTIVIDAD = { sedentario: 1.2, ligera: 1.375, moderada: 1.55, intensa: 1.725 };
  var OBJETIVO = { bajar: -500, mantener: 0, subir: 300 };

  function num(x) { return typeof x === "number" && isFinite(x) && x > 0; }

  function imc(kg, cm) {
    if (!num(kg) || !num(cm)) return null;
    var m = cm / 100;
    var v = kg / (m * m);
    var clase = v < 18.5 ? "bajo" : v < 25 ? "normal" : v < 30 ? "sobrepeso" :
      v < 35 ? "obesidad1" : v < 40 ? "obesidad2" : "obesidad3";
    return { valor: Math.round(v * 10) / 10, clase: clase };
  }

  function tmb(sexo, kg, cm, edad) {
    if ((sexo !== "M" && sexo !== "F") || !num(kg) || !num(cm) || !num(edad)) return null;
    return 10 * kg + 6.25 * cm - 5 * edad + (sexo === "M" ? 5 : -161);
  }

  function coma(n) { return String(n).replace(".", ","); }

  function metaDiaria(p, edad) {
    p = p || {};
    var conds = p.condiciones || [];
    if (num(p.metaMedico)) {
      return { kcal: p.metaMedico, fuente: "medico", detalle: "Meta indicada por su médico: " + p.metaMedico + " kcal" };
    }
    if ((typeof edad === "number" && edad < 18) || conds.indexOf("embarazo") !== -1) {
      return { kcal: null, fuente: "requiereMedico",
        detalle: "Para menores de 18 años o embarazo, su médico debe indicar la meta calórica." };
    }
    var factor = ACTIVIDAD[p.actividad];
    var ajuste = OBJETIVO[p.objetivo];
    var t = tmb(p.sexo, p.pesoKg, p.tallaCm, edad);
    if (t === null || factor === undefined || ajuste === undefined) {
      return { kcal: null, fuente: "incompleto", detalle: "Complete sus datos para calcular su meta." };
    }
    var kcal = Math.round((t * factor + ajuste) / 50) * 50;
    var minimo = p.sexo === "F" ? 1200 : 1500;
    var minimoAplicado = false;
    if (kcal < minimo) { kcal = minimo; minimoAplicado = true; }
    var detalle = "TMB " + Math.round(t) + " × " + coma(factor) + " " +
      (ajuste < 0 ? "− " : "+ ") + Math.abs(ajuste) + " = " + kcal + " kcal";
    if (minimoAplicado) detalle += " (mínimo seguro aplicado)";
    return { kcal: kcal, fuente: "calculo", tmb: t, factor: factor, ajuste: ajuste,
      minimoAplicado: minimoAplicado, detalle: detalle };
  }

  return { imc: imc, tmb: tmb, metaDiaria: metaDiaria, ACTIVIDAD: ACTIVIDAD, OBJETIVO: OBJETIVO };
});
