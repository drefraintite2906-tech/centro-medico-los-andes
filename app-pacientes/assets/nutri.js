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
    var v = Math.round(kg / (m * m) * 10) / 10;
    var clase = v < 18.5 ? "bajo" : v < 25 ? "normal" : v < 30 ? "sobrepeso" :
      v < 35 ? "obesidad1" : v < 40 ? "obesidad2" : "obesidad3";
    return { valor: v, clase: clase };
  }

  function tmb(sexo, kg, cm, edad) {
    if ((sexo !== "M" && sexo !== "F") || !num(kg) || !num(cm) || !num(edad)) return null;
    return 10 * kg + 6.25 * cm - 5 * edad + (sexo === "M" ? 5 : -161);
  }

  function has(o, k) { return Object.prototype.hasOwnProperty.call(o, k); }

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
    var factor = has(ACTIVIDAD, p.actividad) ? ACTIVIDAD[p.actividad] : undefined;
    var ajuste = has(OBJETIVO, p.objetivo) ? OBJETIVO[p.objetivo] : undefined;
    var t = tmb(p.sexo, p.pesoKg, p.tallaCm, edad);
    if (t === null || factor === undefined || ajuste === undefined) {
      return { kcal: null, fuente: "incompleto", detalle: "Complete sus datos para calcular su meta." };
    }
    var kcal = Math.round((t * factor + ajuste) / 50) * 50;
    var minimo = p.sexo === "F" ? 1200 : 1500;
    var minimoAplicado = false;
    if (kcal < minimo) { kcal = minimo; minimoAplicado = true; }
    var detalle = "TMB " + Math.round(t) + " × " + coma(factor) + " = " + Math.round(t * factor) + " " +
      (ajuste < 0 ? "− " : "+ ") + Math.abs(ajuste) + " = " + kcal + " kcal";
    if (minimoAplicado) detalle += " (mínimo seguro aplicado)";
    return { kcal: kcal, fuente: "calculo", tmb: t, factor: factor, ajuste: ajuste,
      minimoAplicado: minimoAplicado, detalle: detalle };
  }

  var REGLAS_NUTRI = { carbPctMax: 0.45, carbComidaMax: 60, protGkgErc: 0.8, sodioMax: 2000,
    grasaSatPctMax: 0.10, ldl: 130, ldlDm: 100, tg: 150, hba1c: 5.7, glucosa: 100, labsDiasMax: 182 };
  var LABS = ["glucosa", "hba1c", "colesterol", "ldl", "hdl", "trigliceridos", "creatinina", "acidoUrico"];
  var CAMPOS = ["kcal", "carb", "prot", "grasa", "grasaSat", "sodio"];
  var RE_DIA = /^\d{4}-\d{2}-\d{2}$/;

  function n0(x) { return typeof x === "number" && isFinite(x) && x >= 0 ? x : 0; }
  function badKey(k) { return k === "__proto__" || k === "constructor" || k === "prototype"; }
  function isObj(x) { return x !== null && typeof x === "object" && !Array.isArray(x); }
  function validDia(d) { return typeof d === "string" && RE_DIA.test(d); }

  function perfilVacio() {
    var labs = {};
    for (var i = 0; i < LABS.length; i++) labs[LABS[i]] = null;
    return { sexo: null, pesoKg: null, tallaCm: null, cinturaCm: null, actividad: null, objetivo: null,
      condiciones: [], labs: labs, metaMedico: null };
  }

  function nuevoNutri() {
    return { perfil: perfilVacio(), pesos: [], comidas: [], alertasDia: {}, frecuentes: {} };
  }

  function normPerfil(p) {
    var r = perfilVacio();
    if (!isObj(p)) return r;
    var k;
    for (k in p) if (has(p, k) && !badKey(k) && k !== "labs" && k !== "condiciones") r[k] = p[k];
    if (Array.isArray(p.condiciones)) {
      for (var i = 0; i < p.condiciones.length; i++) if (typeof p.condiciones[i] === "string") r.condiciones.push(p.condiciones[i]);
    }
    if (isObj(p.labs)) {
      for (var j = 0; j < LABS.length; j++) {
        var l = p.labs[LABS[j]];
        if (isObj(l) && typeof l.v === "number" && isFinite(l.v)) r.labs[LABS[j]] = { v: l.v, fecha: typeof l.fecha === "string" ? l.fecha : null };
      }
    }
    if (!num(r.metaMedico)) r.metaMedico = null;
    return r;
  }

  function normItem(it) {
    var o = {};
    var src = isObj(it) ? it : {};
    var k;
    for (k in src) if (has(src, k) && !badKey(k)) o[k] = src[k];
    o.nombre = typeof src.nombre === "string" ? src.nombre : "";
    o.porcion = typeof src.porcion === "string" ? src.porcion : "";
    o.g = n0(src.g);
    for (var i = 0; i < CAMPOS.length; i++) o[CAMPOS[i]] = n0(src[CAMPOS[i]]);
    o.etiquetas = [];
    if (Array.isArray(src.etiquetas)) {
      for (var j = 0; j < src.etiquetas.length; j++) if (typeof src.etiquetas[j] === "string") o.etiquetas.push(src.etiquetas[j]);
    }
    return o;
  }

  function normalizarNutri(obj) {
    var r = nuevoNutri();
    try {
      if (!isObj(obj)) return r;
      if (typeof obj.dispositivo === "string" && /^[a-z0-9]{8,40}$/.test(obj.dispositivo)) r.dispositivo = obj.dispositivo;
      r.perfil = normPerfil(obj.perfil);
      if (Array.isArray(obj.pesos)) {
        for (var q = 0; q < obj.pesos.length; q++) {
          var pe = obj.pesos[q];
          if (isObj(pe) && typeof pe.id === "string" && typeof pe.t === "number" && isFinite(pe.t) && num(pe.kg)) {
            r.pesos.push({ id: pe.id, t: pe.t, kg: pe.kg });
          }
        }
      }
      if (Array.isArray(obj.comidas)) {
        for (var i = 0; i < obj.comidas.length; i++) {
          var c = obj.comidas[i];
          if (!isObj(c) || !c.id || !validDia(c.dia)) continue;
          var nc = {};
          for (var k in c) if (has(c, k) && !badKey(k)) nc[k] = c[k];
          nc.items = [];
          if (Array.isArray(c.items)) for (var j = 0; j < c.items.length; j++) nc.items.push(normItem(c.items[j]));
          r.comidas.push(nc);
        }
      }
      if (isObj(obj.alertasDia)) {
        for (var d in obj.alertasDia) {
          if (!has(obj.alertasDia, d) || badKey(d) || !Array.isArray(obj.alertasDia[d])) continue;
          var arr = [];
          for (var a = 0; a < obj.alertasDia[d].length; a++) {
            var v = obj.alertasDia[d][a];
            if (typeof v === "number" && isFinite(v)) arr.push(v);
          }
          r.alertasDia[d] = arr;
        }
      }
      if (isObj(obj.frecuentes)) {
        for (var f in obj.frecuentes) if (has(obj.frecuentes, f) && !badKey(f)) r.frecuentes[f] = n0(obj.frecuentes[f]);
      }
    } catch (e) { return nuevoNutri(); }
    return r;
  }

  function sumaComida(c, t) {
    var items = (c && c.items) || [];
    for (var j = 0; j < items.length; j++) {
      for (var k = 0; k < CAMPOS.length; k++) t[CAMPOS[k]] += n0(items[j] && items[j][CAMPOS[k]]);
    }
    return t;
  }

  function totalesVacios() { return { kcal: 0, carb: 0, prot: 0, grasa: 0, grasaSat: 0, sodio: 0 }; }

  function totalesDia(comidas, dia) {
    var t = totalesVacios();
    comidas = comidas || [];
    for (var i = 0; i < comidas.length; i++) if (comidas[i] && comidas[i].dia === dia) sumaComida(comidas[i], t);
    return t;
  }

  function nivelAlerta(kcal, meta) {
    if (!num(meta) || !num(kcal)) return 0;
    var r = kcal / meta;
    if (r > 1.1) return 110;
    if (r >= 1) return 100;
    if (r >= 0.8) return 80;
    return 0;
  }

  function alertasPorMostrar(nivel, ya) {
    ya = ya || [];
    var max = 0;
    for (var i = 0; i < ya.length; i++) if (ya[i] > max) max = ya[i];
    return nivel > max ? [nivel] : [];
  }

  function textoAlerta(nivel, kcal, meta) {
    if (nivel === 80) return "Se está acercando a su meta. Le quedan " + Math.round(meta - kcal) + " kcal.";
    if (nivel === 100) return "Llegó a su meta de hoy.";
    if (nivel === 110) return "Pasó su meta por " + Math.round(kcal - meta) + " kcal.";
    return "";
  }

  function tiempoPorHora(d) {
    var m = d.getHours() * 60 + d.getMinutes();
    return m < 630 ? "desayuno" : m < 900 ? "almuerzo" : m < 1080 ? "merienda" : m < 1320 ? "cena" : "otro";
  }

  function diasEntre(a, b) {
    var pa = /^(\d{4})-(\d{2})-(\d{2})$/.exec(a || ""), pb = /^(\d{4})-(\d{2})-(\d{2})$/.exec(b || "");
    if (!pa || !pb) return 0;
    return (Date.UTC(+pb[1], +pb[2] - 1, +pb[3]) - Date.UTC(+pa[1], +pa[2] - 1, +pa[3])) / 86400000;
  }

  function hayGota(et) {
    var g = ["carne_roja", "visceras", "mariscos", "bebida_azucarada", "alcohol"];
    for (var i = 0; i < g.length; i++) if (et.indexOf(g[i]) !== -1) return true;
    return false;
  }

  function labV(p, k) {
    var l = p.labs && p.labs[k];
    return l && typeof l.v === "number" ? l.v : null;
  }

  function avisosCondicion(perfil, totales, comidasDelDia, hoyISO) {
    var R = REGLAS_NUTRI, out = [];
    perfil = perfil || {};
    totales = totales || {};
    var conds = perfil.condiciones || [];
    function tiene(c) { return conds.indexOf(c) !== -1; }
    var kcal = n0(totales.kcal);
    var hba1c = labV(perfil, "hba1c"), glu = labV(perfil, "glucosa"), ldl = labV(perfil, "ldl");
    var glucemia = tiene("dm2") || tiene("prediabetes") ||
      (hba1c !== null && hba1c >= R.hba1c) || (glu !== null && glu >= R.glucosa);
    var pct;
    if (glucemia && kcal > 0) {
      pct = n0(totales.carb) * 4 / kcal;
      if (pct > R.carbPctMax) out.push({ clave: "carb_dia", texto: "Hoy los carbohidratos son el " +
        Math.round(pct * 100) + " % de sus calorías; para su control, procure que no pasen del " +
        Math.round(R.carbPctMax * 100) + " %." });
    }
    if (glucemia) {
      var cs = comidasDelDia || [];
      for (var i = 0; i < cs.length; i++) {
        var tc = sumaComida(cs[i], totalesVacios());
        if (tc.carb > R.carbComidaMax) {
          out.push({ clave: "carb_comida", texto: "Una de sus comidas tiene " + Math.round(tc.carb) +
            " g de carbohidratos; para su control, procure mantenerla por debajo de " + R.carbComidaMax + " g." });
          break;
        }
      }
    }
    if (tiene("erc") && num(perfil.pesoKg)) {
      var lim = R.protGkgErc * perfil.pesoKg;
      if (n0(totales.prot) > lim) out.push({ clave: "proteina", texto: "Hoy lleva " + Math.round(totales.prot) +
        " g de proteína; para cuidar sus riñones, procure no pasar de " + Math.round(lim) + " g." });
    }
    if (tiene("hta") && n0(totales.sodio) > R.sodioMax) {
      out.push({ clave: "sodio", texto: "Hoy lleva " + Math.round(totales.sodio) +
        " mg de sodio; para cuidar su presión, procure no pasar de " + R.sodioMax + " mg." });
    }
    var tg = labV(perfil, "trigliceridos");
    var lipidos = tiene("dislipidemia") || (ldl !== null && ldl >= (tiene("dm2") ? R.ldlDm : R.ldl)) ||
      (tg !== null && tg >= R.tg);
    if (lipidos && kcal > 0) {
      pct = n0(totales.grasaSat) * 9 / kcal;
      if (pct >= R.grasaSatPctMax) out.push({ clave: "grasa_sat", texto: "Las grasas saturadas son el " +
        Math.round(pct * 100) + " % de sus calorías de hoy; para cuidar su colesterol, procure que sean menos del " +
        Math.round(R.grasaSatPctMax * 100) + " %." });
    }
    if (tiene("gota")) {
      var cg = comidasDelDia || [];
      var hay = false;
      for (var a = 0; a < cg.length && !hay; a++) {
        var its = (cg[a] && cg[a].items) || [];
        for (var b = 0; b < its.length; b++) {
          if (its[b] && its[b].etiquetas && hayGota(its[b].etiquetas)) { hay = true; break; }
        }
      }
      if (hay) out.push({ clave: "gota", texto: "Hoy registró carnes rojas, vísceras, mariscos, bebidas azucaradas o alcohol, que pueden subir el ácido úrico; para cuidar sus articulaciones, conviene moderarlos." });
    }
    for (var j = 0; j < LABS.length; j++) {
      var l = perfil.labs && perfil.labs[LABS[j]];
      if (l && typeof l.v === "number" && l.fecha && diasEntre(l.fecha, hoyISO) > R.labsDiasMax) {
        out.push({ clave: "labs_viejos", texto: "Sus exámenes de laboratorio tienen más de 6 meses; un control reciente le ayudará a ajustar su alimentación." });
        break;
      }
    }
    return out;
  }

  function statsPeriodo(comidas, meta, diasISO) {
    var r = { prom: 0, n: 0, debajo: 0, dentro: 0, encima: 0, pct: { carb: 0, prot: 0, grasa: 0 } };
    var tot = totalesVacios();
    comidas = comidas || [];
    for (var i = 0; i < (diasISO || []).length; i++) {
      var d = diasISO[i], tiene = false;
      for (var k = 0; k < comidas.length; k++) if (comidas[k] && comidas[k].dia === d) { tiene = true; break; }
      if (!tiene) continue;
      var t = totalesDia(comidas, d);
      r.n++;
      for (var c = 0; c < CAMPOS.length; c++) tot[CAMPOS[c]] += t[CAMPOS[c]];
      if (num(meta)) {
        var q = t.kcal / meta;
        if (q < 0.9) r.debajo++; else if (q <= 1.1) r.dentro++; else r.encima++;
      }
    }
    if (r.n) {
      r.prom = Math.round(tot.kcal / r.n);
      if (tot.kcal > 0) {
        r.pct.carb = Math.round(tot.carb * 4 / tot.kcal * 100);
        r.pct.prot = Math.round(tot.prot * 4 / tot.kcal * 100);
        r.pct.grasa = Math.round(tot.grasa * 9 / tot.kcal * 100);
      }
    }
    return r;
  }

  /* ---- Tabla de alimentos: búsqueda y porciones ---- */
  var ACENTOS = { "á": "a", "à": "a", "â": "a", "ä": "a", "é": "e", "è": "e", "ê": "e", "ë": "e",
    "í": "i", "ì": "i", "î": "i", "ï": "i", "ó": "o", "ò": "o", "ô": "o", "ö": "o",
    "ú": "u", "ù": "u", "û": "u", "ü": "u", "ñ": "n", "ç": "c" };

  function sinAcentos(s) {
    if (s === null || s === undefined) return "";
    s = String(s).toLowerCase();
    if (s.normalize) s = s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return s.replace(/[áàâäéèêëíìîïóòôöúùûüñç]/g, function (c) { return ACENTOS[c]; });
  }

  function textoBusqueda(a) {
    var partes = [a.nombre];
    var sin = a.sinonimos || [];
    for (var i = 0; i < sin.length; i++) partes.push(sin[i]);
    return " " + sinAcentos(partes.join(" ")).replace(/[^a-z0-9]+/g, " ");
  }

  function usoDe(frecuentes, id) {
    if (!frecuentes || typeof frecuentes !== "object" || typeof id !== "string" || !has(frecuentes, id)) return 0;
    var n = frecuentes[id];
    return typeof n === "number" && isFinite(n) && n > 0 ? n : 0;
  }

  function buscar(alimentos, q, frecuentes) {
    if (!alimentos || !alimentos.length) return [];
    var qn = sinAcentos(q).replace(/[^a-z0-9]+/g, " ").replace(/^ | $/g, "");
    var palabras = qn ? qn.split(" ") : [];
    var cand = [];
    for (var i = 0; i < alimentos.length; i++) {
      var a = alimentos[i];
      if (!a || typeof a.nombre !== "string") continue;
      var uso = usoDe(frecuentes, a.id);
      var inicio = 0;
      if (palabras.length) {
        var h = textoBusqueda(a), ok = true;
        for (var p = 0; p < palabras.length; p++) if (h.indexOf(" " + palabras[p]) === -1) { ok = false; break; }
        if (!ok) continue;
        if (sinAcentos(a.nombre).indexOf(qn) === 0) inicio = 2;
        else {
          var sin = a.sinonimos || [];
          for (var k = 0; k < sin.length; k++) if (sinAcentos(sin[k]).indexOf(qn) === 0) { inicio = 1; break; }
        }
      } else if (!uso) continue;
      cand.push({ a: a, uso: uso, inicio: inicio, n: sinAcentos(a.nombre), i: i });
    }
    cand.sort(function (x, y) {
      if (x.uso !== y.uso) return y.uso - x.uso;
      if (x.inicio !== y.inicio) return y.inicio - x.inicio;
      if (x.n !== y.n) return x.n < y.n ? -1 : 1;
      return x.i - y.i;
    });
    var out = [];
    for (var j = 0; j < cand.length && j < 20; j++) out.push(cand[j].a);
    return out;
  }

  var FRACCIONES = [[0.25, "¼"], [1 / 3, "⅓"], [0.5, "½"], [2 / 3, "⅔"], [0.75, "¾"]];
  var GLIFOS = { "¼": 0.25, "⅓": 1 / 3, "½": 0.5, "⅔": 2 / 3, "¾": 0.75 };

  function cantidadTexto(x) {
    var ent = Math.floor(x + 0.01), fr = x - ent;
    if (Math.abs(fr) < 0.01) return String(ent);
    for (var i = 0; i < FRACCIONES.length; i++) {
      if (Math.abs(fr - FRACCIONES[i][0]) < 0.01) return (ent ? String(ent) : "") + FRACCIONES[i][1];
    }
    return coma(Math.round(x * 10) / 10);
  }

  function porcionTexto(porcion, mult) {
    porcion = typeof porcion === "string" ? porcion : "";
    var m = /^(\d+(?:[.,]\d+)?)?\s*([¼⅓½⅔¾])?\s*/.exec(porcion);
    if (!m[1] && !m[2]) return mult === 1 ? porcion : cantidadTexto(mult) + " × " + porcion;
    if (mult === 1) return porcion;
    var q = (m[1] ? parseFloat(m[1].replace(",", ".")) : 0) + (m[2] ? GLIFOS[m[2]] : 0);
    return cantidadTexto(q * mult) + " " + porcion.slice(m[0].length);
  }

  function r1(x) { return Math.round(x * 10) / 10; }

  function escalar(a, mult) {
    a = a || {};
    if (!num(mult) || mult === Infinity) mult = 1;
    return {
      nombre: a.nombre, porcion: porcionTexto(a.porcion, mult), g: Math.round(n0(a.g) * mult),
      kcal: Math.round(n0(a.kcal) * mult), carb: r1(n0(a.carb) * mult), prot: r1(n0(a.prot) * mult),
      grasa: r1(n0(a.grasa) * mult), grasaSat: r1(n0(a.grasaSat) * mult), sodio: Math.round(n0(a.sodio) * mult),
      etiquetas: (a.etiquetas || []).slice(), alimentoId: a.id
    };
  }

  return { imc: imc, tmb: tmb, metaDiaria: metaDiaria, ACTIVIDAD: ACTIVIDAD, OBJETIVO: OBJETIVO,
    REGLAS_NUTRI: REGLAS_NUTRI, nuevoNutri: nuevoNutri, normalizarNutri: normalizarNutri,
    totalesDia: totalesDia, nivelAlerta: nivelAlerta, alertasPorMostrar: alertasPorMostrar,
    textoAlerta: textoAlerta, avisosCondicion: avisosCondicion, tiempoPorHora: tiempoPorHora,
    statsPeriodo: statsPeriodo, sinAcentos: sinAcentos, buscar: buscar, escalar: escalar };
});
