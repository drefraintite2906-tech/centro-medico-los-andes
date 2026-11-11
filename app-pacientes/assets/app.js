/* Centro Médico Los Andes – "Mi control de salud" (aplicación independiente, publicada en GitHub Pages)
   Todo se guarda SOLO en el dispositivo del paciente (localStorage + IndexedDB para fotos/PDF).
   No hay servidor ni base de datos: el paciente decide cuándo enviar el resumen por WhatsApp. */
(function () {
  "use strict";
  var raiz = document.querySelector("[data-salud]");
  if (!raiz) return;

  var CFG = {};
  try { CFG = JSON.parse(document.getElementById("clinica-config").textContent) || {}; } catch (e) {}
  var CLINICA = CFG.nombre || "Centro Médico Los Andes";
  var WA_CLINICA = String(CFG.whatsapp || "50760568129").replace(/\D/g, "");

  var KEY = "cmla-mi-salud-v1";
  var METAS_DEF = { paSis: 130, paDia: 80, gluAyMin: 80, gluAyMax: 130, gluPostMax: 180 };
  var MOMENTOS = { ayunas: "En ayunas", antes: "Antes de comer", despues: "2 h después de comer", dormir: "Al acostarse", azar: "Al azar" };
  var BRAZOS = { izq: "brazo izq.", der: "brazo der." };
  var POSICIONES = { sentado: "sentado(a)", pie: "de pie", acostado: "acostado(a)" };
  var DIA = 86400000;
  var CONSENT_VERSION = "1.0";

  function $(s, el) { return (el || raiz).querySelector(s); }
  function $$(s, el) { return Array.prototype.slice.call((el || raiz).querySelectorAll(s)); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function limpiar(s, max) { return String(s || "").replace(/[<>]/g, "").replace(/\s+/g, " ").trim().slice(0, max || 200); }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
  function pad(n) { return String(n).padStart(2, "0"); }
  function isoDia(d) { return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()); }
  function horaInput(d) { return pad(d.getHours()) + ":" + pad(d.getMinutes()); }
  function fecha(t) { var d = new Date(t); return pad(d.getDate()) + "/" + pad(d.getMonth() + 1) + "/" + d.getFullYear(); }
  function fechaCorta(t) { var d = new Date(t); return pad(d.getDate()) + "/" + pad(d.getMonth() + 1); }
  function hora(t) {
    var d = new Date(t), h = d.getHours(), m = pad(d.getMinutes());
    return (h % 12 || 12) + ":" + m + (h < 12 ? " a. m." : " p. m.");
  }
  function fechaHora(t) { return fecha(t) + " · " + hora(t); }
  function fechaISOaT(iso) { return new Date(iso + "T12:00:00").getTime(); }
  function redondear(n) { return Math.round(n); }
  function promedio(a) { return a.length ? a.reduce(function (s, x) { return s + x; }, 0) / a.length : 0; }
  function normalizarWA(v) {
    var d = String(v || "").replace(/\D/g, "");
    if (d.length === 7 || d.length === 8) d = "507" + d; // número de Panamá sin código de país
    return d.length >= 10 ? d : "";
  }
  function normalizarCorreo(v) {
    var c = String(v || "").trim().toLowerCase();
    return /^[^\s@<>]+@[^\s@<>]+\.[a-z]{2,}$/.test(c) ? c.slice(0, 100) : "";
  }
  function edad(iso) {
    if (!iso) return "";
    var n = new Date(iso + "T00:00:00"), h = new Date(), e = h.getFullYear() - n.getFullYear();
    if (h.getMonth() < n.getMonth() || (h.getMonth() === n.getMonth() && h.getDate() < n.getDate())) e--;
    return e >= 0 && e < 130 ? e : "";
  }

  /* ---------- Almacenamiento ---------- */
  function nuevo() {
    return { version: 1, perfil: { nombre: "", nacimiento: "", medico: "", whatsapp: "", correo: "", acepto: false }, metas: Object.assign({}, METAS_DEF), presiones: [], glicemias: [], examenes: [] };
  }
  function normalizar(d) {
    var n = nuevo();
    if (!d || typeof d !== "object") return n;
    n.perfil = Object.assign(n.perfil, d.perfil || {});
    n.metas = Object.assign(n.metas, d.metas || {});
    ["presiones", "glicemias", "examenes"].forEach(function (k) { n[k] = Array.isArray(d[k]) ? d[k].filter(function (r) { return r && r.id; }) : []; });
    return n;
  }
  var almacenOK = true;
  try { localStorage.setItem(KEY + "-test", "1"); localStorage.removeItem(KEY + "-test"); } catch (e) { almacenOK = false; }
  var datos = nuevo();
  try { datos = normalizar(JSON.parse(localStorage.getItem(KEY))); } catch (e) {}

  function guardar() {
    try { localStorage.setItem(KEY, JSON.stringify(datos)); return true; }
    catch (e) { mostrarAlerta("critico", ["<strong>No se pudo guardar.</strong> El almacenamiento del teléfono está lleno o bloqueado. Cree un respaldo y libere espacio."]); return false; }
  }
  var pidioPersistencia = false;
  function pedirPersistencia() {
    if (pidioPersistencia) return; pidioPersistencia = true;
    try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) {}
  }

  // Fotos y PDF en IndexedDB (más espacio que localStorage)
  var dbPromesa = null;
  function db() {
    if (dbPromesa) return dbPromesa;
    dbPromesa = new Promise(function (ok, mal) {
      if (!window.indexedDB) return mal(new Error("Sin IndexedDB"));
      var r = indexedDB.open("cmla-mi-salud", 1);
      r.onupgradeneeded = function () { r.result.createObjectStore("archivos"); };
      r.onsuccess = function () { ok(r.result); };
      r.onerror = function () { mal(r.error); };
    });
    return dbPromesa;
  }
  function tx(modo, fn) {
    return db().then(function (d) {
      return new Promise(function (ok, mal) {
        var t = d.transaction("archivos", modo), st = t.objectStore("archivos"), res;
        var req = fn(st);
        if (req) req.onsuccess = function () { res = req.result; };
        t.oncomplete = function () { ok(res); };
        t.onerror = function () { mal(t.error); };
        t.onabort = function () { mal(t.error); };
      });
    });
  }
  function archivoPut(id, obj) { return tx("readwrite", function (st) { return st.put(obj, id); }); }
  function archivoGet(id) { return tx("readonly", function (st) { return st.get(id); }); }
  function archivoDel(id) { return tx("readwrite", function (st) { return st.delete(id); }); }
  function archivosTodos() {
    return tx("readonly", function (st) { return st.getAllKeys(); }).then(function (keys) {
      return Promise.all((keys || []).map(function (k) { return archivoGet(k).then(function (v) { return [k, v]; }); }));
    });
  }
  function archivosBorrarTodo() { return tx("readwrite", function (st) { return st.clear(); }); }

  function leerComoDataURL(file) {
    return new Promise(function (ok, mal) {
      var fr = new FileReader();
      fr.onload = function () { ok(fr.result); };
      fr.onerror = function () { mal(fr.error); };
      fr.readAsDataURL(file);
    });
  }
  function comprimirImagen(file) {
    return leerComoDataURL(file).then(function (url) {
      return new Promise(function (ok, mal) {
        var img = new Image();
        img.onload = function () {
          var max = 1800, s = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
          var c = document.createElement("canvas");
          c.width = Math.round(img.naturalWidth * s); c.height = Math.round(img.naturalHeight * s);
          var x = c.getContext("2d"); x.fillStyle = "#fff"; x.fillRect(0, 0, c.width, c.height);
          x.drawImage(img, 0, 0, c.width, c.height);
          ok(c.toDataURL("image/jpeg", 0.85));
        };
        img.onerror = function () { mal(new Error("No se pudo leer la imagen")); };
        img.src = url;
      });
    });
  }
  function dataURLaBlob(url) {
    var p = url.split(","), mime = (p[0].match(/:(.*?);/) || [])[1] || "application/octet-stream";
    var bin = atob(p[1]), arr = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return new Blob([arr], { type: mime });
  }

  /* ---------- Clasificación (orientativa; las metas las define el médico) ---------- */
  function clasPA(p) {
    var m = datos.metas;
    if (p.sis >= 180 || p.dia >= 120) return { nivel: "critico", texto: "Muy alta" };
    if (p.sis < 90 || p.dia < 60) return { nivel: "bajo", texto: "Baja" };
    if (p.sis >= 140 || p.dia >= 90) return { nivel: "alto", texto: "Alta" };
    if (p.sis >= m.paSis || p.dia >= m.paDia) return { nivel: "medio", texto: "Sobre la meta" };
    return { nivel: "ok", texto: "En meta" };
  }
  function esAyunas(g) { return g.momento === "ayunas" || g.momento === "antes"; }
  function clasGlu(g) {
    var m = datos.metas, v = g.valor;
    if (v < 54) return { nivel: "critico", texto: "Muy baja" };
    if (v < 70) return { nivel: "bajo", texto: "Baja" };
    if (v >= 300) return { nivel: "critico", texto: "Muy alta" };
    if (esAyunas(g)) {
      if (v > m.gluAyMax) return { nivel: v >= 200 ? "alto" : "medio", texto: "Sobre la meta" };
      if (v < m.gluAyMin) return { nivel: "medio", texto: "Bajo la meta" };
      return { nivel: "ok", texto: "En meta" };
    }
    if (v >= m.gluPostMax) return { nivel: v >= 250 ? "alto" : "medio", texto: "Sobre la meta" };
    return { nivel: "ok", texto: "En meta" };
  }

  /* ---------- Alertas ---------- */
  var alerta = $("[data-alerta]");
  function mostrarAlerta(tipo, parrafos) {
    alerta.className = "salud-alerta salud-alerta--" + tipo;
    alerta.innerHTML = parrafos.map(function (p) { return "<p>" + p + "</p>"; }).join("") +
      '<button type="button" class="btn btn--sm btn--outline salud-alerta__cerrar" data-cerrar-alerta>Entendido</button>';
    alerta.hidden = false;
    alerta.scrollIntoView({ behavior: "smooth", block: "center" });
  }
  alerta.addEventListener("click", function (e) { if (e.target.closest("[data-cerrar-alerta]")) alerta.hidden = true; });

  function alertaPresion(p) {
    if (p.sis >= 180 || p.dia >= 120) {
      mostrarAlerta("critico", [
        "<strong>Su presión está muy alta (" + p.sis + "/" + p.dia + ").</strong> Siéntese, descanse 5 minutos y vuelva a medirla.",
        "<strong>Acuda a urgencias de inmediato</strong> si sigue igual de alta o si tiene dolor de pecho, falta de aire, dolor de cabeza fuerte, visión borrosa, debilidad o adormecimiento de un lado del cuerpo, o dificultad para hablar.",
        "Si no tiene síntomas, comuníquese hoy con su médico."
      ]);
      return;
    }
    if (p.sis < 90 || p.dia < 60) {
      mostrarAlerta("aviso", ["<strong>Su presión está baja (" + p.sis + "/" + p.dia + ").</strong> Si se siente mareado(a), acuéstese y levante las piernas. Si se desmaya o tiene dolor de pecho, acuda a urgencias. Coménteselo a su médico."]);
      return;
    }
    mostrarAlerta("ok", ["Toma guardada: <strong>" + p.sis + "/" + p.dia + "</strong> (" + clasPA(p).texto.toLowerCase() + ")."]);
  }
  function alertaGlicemia(g) {
    if (g.valor < 70) {
      mostrarAlerta("critico", [
        "<strong>Su glicemia está baja (" + g.valor + " mg/dL).</strong> Tome de inmediato 15 g de azúcar: ½ vaso de jugo o refresco normal (no de dieta), o 3 cucharaditas de azúcar en agua.",
        "Vuelva a medirse en 15 minutos. Si sigue por debajo de 70, repita. Cuando suba, coma algo.",
        "<strong>Si está confundido(a), no puede tragar o se desmaya, llame a emergencias.</strong> Avise a su médico."
      ]);
      return;
    }
    if (g.valor >= 300) {
      mostrarAlerta("critico", [
        "<strong>Su glicemia está muy alta (" + g.valor + " mg/dL).</strong> Tome agua y vuelva a medirse en 1 a 2 horas. Comuníquese hoy con su médico.",
        "<strong>Acuda a urgencias</strong> si tiene vómitos, mucha sed, respiración rápida, dolor de barriga, somnolencia o confusión."
      ]);
      return;
    }
    mostrarAlerta("ok", ["Toma guardada: <strong>" + g.valor + " mg/dL</strong> (" + clasGlu(g).texto.toLowerCase() + ")."]);
  }

  /* ---------- Pestañas ---------- */
  var tabs = $$("[data-tab]"), paneles = $$("[data-panel]");
  var redibujar = {};
  function irA(nombre) {
    tabs.forEach(function (t) { var a = t.getAttribute("data-tab") === nombre; t.setAttribute("aria-selected", a ? "true" : "false"); t.tabIndex = a ? 0 : -1; });
    paneles.forEach(function (p) { p.hidden = p.getAttribute("data-panel") !== nombre; });
    alerta.hidden = true;
    try { sessionStorage.setItem(KEY + "-tab", nombre); } catch (e) {}
    if (redibujar[nombre]) redibujar[nombre]();
  }
  tabs.forEach(function (t, i) {
    t.addEventListener("click", function () { irA(t.getAttribute("data-tab")); });
    t.addEventListener("keydown", function (e) {
      var j = e.key === "ArrowRight" ? i + 1 : e.key === "ArrowLeft" ? i - 1 : null;
      if (j === null) return;
      j = (j + tabs.length) % tabs.length; tabs[j].focus(); irA(tabs[j].getAttribute("data-tab"));
    });
  });

  /* ---------- Formularios: utilidades ---------- */
  function error(form, msg) { var e = form.querySelector("[data-form-error]"); if (e) e.textContent = msg || ""; }
  function validar(form) {
    error(form, "");
    var inv = Array.prototype.find.call(form.elements, function (el) { return el.willValidate && !el.checkValidity(); });
    if (inv) {
      var lab = form.querySelector('label[for="' + inv.id + '"]');
      var nombre = lab ? lab.textContent.replace("*", "").trim() : "un campo";
      var msg = inv.validity.valueMissing ? "Complete: " + nombre + "." :
        (inv.validity.rangeUnderflow || inv.validity.rangeOverflow) ? "Revise el valor de " + nombre + " (entre " + inv.min + " y " + inv.max + ")." :
        "Revise: " + nombre + ".";
      if (inv.type === "checkbox") msg = "Debe aceptar las condiciones para continuar.";
      error(form, msg); inv.focus(); return false;
    }
    return true;
  }
  function ponerAhora(form) {
    var d = new Date();
    if (form.elements.fecha) { form.elements.fecha.value = isoDia(d); form.elements.fecha.max = isoDia(d); }
    if (form.elements.hora) form.elements.hora.value = horaInput(d);
  }
  function tiempoDe(form) {
    var t = new Date(form.elements.fecha.value + "T" + (form.elements.hora ? form.elements.hora.value : "12:00")).getTime();
    return isNaN(t) ? Date.now() : t;
  }
  function ordenar(arr) { return arr.sort(function (a, b) { return a.t - b.t; }); }
  function num(form, n) { var v = form.elements[n].value; return v === "" ? null : Number(v); }

  /* ---------- Bienvenida y perfil ---------- */
  var bienvenida = $("[data-bienvenida]"), app = $("[data-app]");
  function consentOK() {
    var c = datos.perfil.consentimiento;
    return !!(c && c.version === CONSENT_VERSION && c.almacenamiento && c.autorizacion);
  }
  function textoConsentimiento() {
    var c = datos.perfil.consentimiento;
    if (!c) return "";
    return "Consentimiento v" + c.version + " otorgado el " + fechaHora(new Date(c.fecha).getTime()) + " por " +
      (c.otorgadoPor === "representante" ? "su representante legal (" + c.representante + ")" : "el (la) paciente");
  }
  function mostrarBienvenida() {
    app.hidden = true; bienvenida.hidden = false;
    var f = $('[data-form="bienvenida"]');
    if (datos.perfil.nombre) f.elements.nombre.value = datos.perfil.nombre;
    if (datos.perfil.medico) f.elements.medico.value = datos.perfil.medico;
    if (datos.perfil.whatsapp) f.elements.whatsapp.value = "+" + datos.perfil.whatsapp;
    if (datos.perfil.correo) f.elements.correo.value = datos.perfil.correo;
  }
  // Texto completo del consentimiento (una sola fuente: bienvenida y «Mis datos»)
  var tplConsent = document.getElementById("texto-consentimiento");
  $$("[data-consentimiento-texto]").forEach(function (box) { if (tplConsent) box.appendChild(tplConsent.content.cloneNode(true)); });
  var selOtorga = $('[name="otorgadoPor"]'), campoRep = $("[data-campo-representante]");
  selOtorga.addEventListener("change", function () {
    var r = selOtorga.value === "representante";
    campoRep.hidden = !r; campoRep.querySelector("input").required = r;
  });
  function mostrarApp() {
    bienvenida.hidden = true; app.hidden = false;
    $("[data-saludo]").textContent = "Hola, " + (datos.perfil.nombre.split(" ")[0] || "") + ".";
    var t = "presion"; try { t = sessionStorage.getItem(KEY + "-tab") || t; } catch (e) {}
    irA(t);
  }
  $('[data-form="bienvenida"]').addEventListener("submit", function (e) {
    e.preventDefault();
    var f = e.currentTarget; if (!validar(f)) return;
    datos.perfil.nombre = limpiar(f.elements.nombre.value, 80);
    datos.perfil.medico = limpiar(f.elements.medico.value, 80);
    datos.perfil.whatsapp = normalizarWA(f.elements.whatsapp.value);
    if (f.elements.correo.value.trim() && !normalizarCorreo(f.elements.correo.value)) { error(f, "Revise el correo de su médico."); f.elements.correo.focus(); return; }
    datos.perfil.correo = normalizarCorreo(f.elements.correo.value);
    var otorga = f.elements.otorgadoPor.value === "representante" ? "representante" : "paciente";
    var rep = limpiar(f.elements.representante.value, 80);
    if (otorga === "representante" && rep.length < 3) { error(f, "Escriba el nombre del representante que acepta."); f.elements.representante.focus(); return; }
    datos.perfil.consentimiento = { version: CONSENT_VERSION, fecha: new Date().toISOString(), otorgadoPor: otorga, representante: otorga === "representante" ? rep : "", almacenamiento: true, autorizacion: true };
    datos.perfil.acepto = true;
    if (guardar()) { pedirPersistencia(); llenarPerfil(); mostrarApp(); window.scrollTo({ top: 0 }); }
  });

  var formPerfil = $('[data-form="perfil"]');
  function llenarPerfil() {
    var f = formPerfil, p = datos.perfil, m = datos.metas;
    f.elements.nombre.value = p.nombre || ""; f.elements.nacimiento.value = p.nacimiento || "";
    f.elements.medico.value = p.medico || ""; f.elements.whatsapp.value = p.whatsapp ? "+" + p.whatsapp : "";
    f.elements.correo.value = p.correo || "";
    Object.keys(METAS_DEF).forEach(function (k) { f.elements[k].value = m[k]; });
    f.elements.nacimiento.max = isoDia(new Date());
    $("[data-consentimiento-estado]").textContent = consentOK() ? textoConsentimiento() + ". Puede retirarlo cuando quiera." : "";
    $("[data-destino]").textContent = "Destino: " + (p.medico ? p.medico + " · " : "") + "WhatsApp +" + (p.whatsapp || WA_CLINICA) + (p.whatsapp ? "" : " (clínica)") +
      (p.correo ? " · correo " + p.correo : "") + ". Puede cambiarlo en «Mis datos».";
  }
  formPerfil.addEventListener("submit", function (e) {
    e.preventDefault();
    var f = e.currentTarget; if (!validar(f)) return;
    var wa = f.elements.whatsapp.value.trim();
    if (wa && !normalizarWA(wa)) { error(f, "Revise el número de WhatsApp de su médico."); return; }
    var correo = f.elements.correo.value.trim();
    if (correo && !normalizarCorreo(correo)) { error(f, "Revise el correo electrónico de su médico."); return; }
    if (Number(f.elements.gluAyMin.value) >= Number(f.elements.gluAyMax.value)) { error(f, "La glicemia en ayunas «desde» debe ser menor que «hasta»."); return; }
    datos.perfil.nombre = limpiar(f.elements.nombre.value, 80);
    datos.perfil.nacimiento = f.elements.nacimiento.value || "";
    datos.perfil.medico = limpiar(f.elements.medico.value, 80);
    datos.perfil.whatsapp = normalizarWA(wa);
    datos.perfil.correo = normalizarCorreo(correo);
    Object.keys(METAS_DEF).forEach(function (k) { datos.metas[k] = Number(f.elements[k].value); });
    if (guardar()) { llenarPerfil(); pintarTodo(); mostrarApp(); irA("datos"); mostrarAlerta("ok", ["Cambios guardados."]); }
  });

  /* ---------- Presión ---------- */
  var formPA = $('[data-form="presion"]');
  formPA.addEventListener("submit", function (e) {
    e.preventDefault();
    var f = e.currentTarget; if (!validar(f)) return;
    var p = { id: uid(), t: tiempoDe(f), sis: num(f, "sis"), dia: num(f, "dia"), pulso: num(f, "pulso"), brazo: f.elements.brazo.value, posicion: f.elements.posicion.value, nota: limpiar(f.elements.nota.value, 140) };
    if (p.sis <= p.dia) { error(f, "La sistólica (número alto) debe ser mayor que la diastólica (número bajo)."); return; }
    if (p.t > Date.now() + 5 * 60000) { error(f, "La fecha y hora no pueden estar en el futuro."); return; }
    datos.presiones.push(p); ordenar(datos.presiones);
    if (!guardar()) { datos.presiones = datos.presiones.filter(function (x) { return x.id !== p.id; }); return; }
    pedirPersistencia();
    var brazo = f.elements.brazo.value, pos = f.elements.posicion.value;
    f.reset(); f.elements.brazo.value = brazo; f.elements.posicion.value = pos; ponerAhora(f);
    pintarPresion(); alertaPresion(p);
  });

  /* ---------- Glicemia ---------- */
  var formGlu = $('[data-form="glicemia"]');
  formGlu.addEventListener("submit", function (e) {
    e.preventDefault();
    var f = e.currentTarget; if (!validar(f)) return;
    var g = { id: uid(), t: tiempoDe(f), valor: num(f, "valor"), momento: f.elements.momento.value, nota: limpiar(f.elements.nota.value, 140) };
    if (g.t > Date.now() + 5 * 60000) { error(f, "La fecha y hora no pueden estar en el futuro."); return; }
    datos.glicemias.push(g); ordenar(datos.glicemias);
    if (!guardar()) { datos.glicemias = datos.glicemias.filter(function (x) { return x.id !== g.id; }); return; }
    pedirPersistencia();
    f.reset(); ponerAhora(f);
    pintarGlicemia(); alertaGlicemia(g);
  });

  /* ---------- Exámenes ---------- */
  var formEx = $('[data-form="examenes"]');
  formEx.addEventListener("submit", function (e) {
    e.preventDefault();
    var f = e.currentTarget; if (!validar(f)) return;
    var archivos = Array.prototype.slice.call(f.elements.archivos.files || []);
    if (archivos.length > 3) { error(f, "Puede adjuntar hasta 3 archivos por examen."); return; }
    var grande = archivos.find(function (a) { return a.type === "application/pdf" && a.size > 8 * 1024 * 1024; });
    if (grande) { error(f, "El PDF «" + grande.name + "» es muy grande (máximo 8 MB)."); return; }
    var btn = f.querySelector('[type="submit"]'); btn.disabled = true; btn.textContent = "Guardando…";
    var ex = { id: uid(), fecha: f.elements.fecha.value, t: fechaISOaT(f.elements.fecha.value), nombre: limpiar(f.elements.nombre.value, 60), resultado: limpiar(f.elements.resultado.value, 40), unidad: limpiar(f.elements.unidad.value, 15), laboratorio: limpiar(f.elements.laboratorio.value, 60), nota: limpiar(f.elements.nota.value, 140), archivos: [] };
    Promise.all(archivos.map(function (a) {
      var id = uid(), esPDF = a.type === "application/pdf";
      return (esPDF ? leerComoDataURL(a) : comprimirImagen(a)).then(function (url) {
        return archivoPut(id, { tipo: esPDF ? "pdf" : "jpg", nombre: limpiar(a.name, 80), url: url }).then(function () { ex.archivos.push({ id: id, tipo: esPDF ? "pdf" : "jpg" }); });
      });
    })).then(function () {
      datos.examenes.push(ex); ordenar(datos.examenes);
      if (!guardar()) { datos.examenes = datos.examenes.filter(function (x) { return x.id !== ex.id; }); return; }
      pedirPersistencia();
      f.reset(); ponerAhora(f); pintarExamenes();
      mostrarAlerta("ok", ["Examen guardado: <strong>" + esc(ex.nombre) + "</strong>" + (ex.archivos.length ? " con " + ex.archivos.length + " archivo(s)." : ".")]);
    }).catch(function () {
      ex.archivos.forEach(function (a) { archivoDel(a.id).catch(function () {}); });
      error(f, "No se pudo guardar el archivo. Intente con una foto más pequeña o libere espacio en el teléfono.");
    }).then(function () { btn.disabled = false; btn.textContent = "Guardar resultado"; });
  });

  /* ---------- Listas ---------- */
  var mostrarTodo = {};
  function lista(tipo, arr, filaFn) {
    var ul = $('[data-lista="' + tipo + '"]');
    var rec = arr.slice().reverse();
    if (!rec.length) { ul.innerHTML = '<li class="salud-vacio">Aún no hay registros.</li>'; quitarMas(ul); return; }
    var lim = mostrarTodo[tipo] ? rec.length : 15;
    ul.innerHTML = rec.slice(0, lim).map(filaFn).join("");
    quitarMas(ul);
    if (rec.length > lim) {
      var b = document.createElement("button");
      b.type = "button"; b.className = "btn btn--outline btn--sm salud-mas"; b.textContent = "Ver todos (" + rec.length + ")";
      b.addEventListener("click", function () { mostrarTodo[tipo] = true; lista(tipo, arr, filaFn); });
      ul.after(b);
    }
  }
  function quitarMas(ul) { var n = ul.nextElementSibling; if (n && n.classList.contains("salud-mas")) n.remove(); }
  function btnBorrar(tipo, id) { return '<button type="button" class="reg__borrar" data-borrar="' + tipo + '" data-id="' + esc(id) + '" aria-label="Eliminar registro">×</button>'; }

  function filaPA(p) {
    var c = clasPA(p), extra = [];
    if (p.brazo && BRAZOS[p.brazo]) extra.push(BRAZOS[p.brazo]);
    if (p.posicion && p.posicion !== "sentado" && POSICIONES[p.posicion]) extra.push(POSICIONES[p.posicion]);
    return '<li class="reg"><div class="reg__main"><strong class="reg__valor">' + p.sis + "/" + p.dia + " <small>mmHg</small></strong>" +
      (p.pulso ? '<span class="reg__extra">Pulso ' + p.pulso + "</span>" : "") +
      '<span class="badge badge--' + c.nivel + '">' + c.texto + "</span></div>" +
      btnBorrar("presiones", p.id) +
      '<div class="reg__meta">' + fechaHora(p.t) + (extra.length ? " · " + extra.join(", ") : "") + "</div>" +
      (p.nota ? '<div class="reg__nota">' + esc(p.nota) + "</div>" : "") + "</li>";
  }
  function filaGlu(g) {
    var c = clasGlu(g);
    return '<li class="reg"><div class="reg__main"><strong class="reg__valor">' + g.valor + " <small>mg/dL</small></strong>" +
      '<span class="reg__extra">' + esc(MOMENTOS[g.momento] || "") + "</span>" +
      '<span class="badge badge--' + c.nivel + '">' + c.texto + "</span></div>" +
      btnBorrar("glicemias", g.id) +
      '<div class="reg__meta">' + fechaHora(g.t) + "</div>" +
      (g.nota ? '<div class="reg__nota">' + esc(g.nota) + "</div>" : "") + "</li>";
  }
  function filaEx(x) {
    return '<li class="reg"><div class="reg__main"><strong class="reg__valor">' + esc(x.nombre) + "</strong>" +
      (x.resultado ? '<span class="reg__extra">' + esc(x.resultado) + (x.unidad ? " " + esc(x.unidad) : "") + "</span>" : "") + "</div>" +
      btnBorrar("examenes", x.id) +
      '<div class="reg__meta">' + fecha(x.t) + (x.laboratorio ? " · " + esc(x.laboratorio) : "") + "</div>" +
      (x.nota ? '<div class="reg__nota">' + esc(x.nota) + "</div>" : "") +
      (x.archivos && x.archivos.length ? '<div class="reg__fotos">' + x.archivos.map(function (a) {
        return '<button type="button" data-ver="' + esc(a.id) + '" aria-label="Ver archivo">' + (a.tipo === "pdf" ? "PDF" : '<img data-mini="' + esc(a.id) + '" alt="">') + "</button>";
      }).join("") + "</div>" : "") + "</li>";
  }
  function cargarMiniaturas() {
    $$("[data-mini]").forEach(function (img) {
      archivoGet(img.getAttribute("data-mini")).then(function (a) { if (a && a.url) img.src = a.url; }).catch(function () {});
    });
  }

  raiz.addEventListener("click", function (e) {
    var b = e.target.closest("[data-borrar]");
    if (b) {
      var tipo = b.getAttribute("data-borrar"), id = b.getAttribute("data-id");
      if (!window.confirm("¿Eliminar este registro? No se puede deshacer.")) return;
      var r = datos[tipo].find(function (x) { return x.id === id; });
      datos[tipo] = datos[tipo].filter(function (x) { return x.id !== id; });
      if (r && r.archivos) r.archivos.forEach(function (a) { archivoDel(a.id).catch(function () {}); });
      guardar(); pintarTodo(); return;
    }
    var v = e.target.closest("[data-ver]");
    if (v) verArchivo(v.getAttribute("data-ver"));
  });

  var visor = null;
  function verArchivo(id) {
    archivoGet(id).then(function (a) {
      if (!a) return;
      if (a.tipo === "pdf") {
        var u = URL.createObjectURL(dataURLaBlob(a.url));
        window.open(u, "_blank", "noopener");
        setTimeout(function () { URL.revokeObjectURL(u); }, 60000);
        return;
      }
      if (!visor) {
        visor = document.createElement("dialog"); visor.className = "salud-visor";
        visor.innerHTML = '<img alt="Resultado del examen"><button type="button" class="btn btn--white">Cerrar</button>';
        visor.addEventListener("click", function () { visor.close(); });
        document.body.appendChild(visor);
      }
      visor.querySelector("img").src = a.url;
      if (visor.showModal) visor.showModal();
    }).catch(function () {});
  }

  /* ---------- Estadísticas ---------- */
  function desde(dias) { return dias ? Date.now() - dias * DIA : 0; }
  function filtrar(arr, dias) { var d = desde(dias); return arr.filter(function (r) { return r.t >= d; }); }
  function statsPA(arr) {
    if (!arr.length) return null;
    var m = datos.metas, pul = arr.filter(function (p) { return p.pulso; }).map(function (p) { return p.pulso; });
    var man = arr.filter(function (p) { return new Date(p.t).getHours() < 12; }), tar = arr.filter(function (p) { return new Date(p.t).getHours() >= 12; });
    var max = arr.reduce(function (a, b) { return b.sis > a.sis || (b.sis === a.sis && b.dia > a.dia) ? b : a; });
    var min = arr.reduce(function (a, b) { return b.sis < a.sis ? b : a; });
    function prom(a) { return a.length ? redondear(promedio(a.map(function (p) { return p.sis; }))) + "/" + redondear(promedio(a.map(function (p) { return p.dia; }))) : ""; }
    var sobre = arr.filter(function (p) { return p.sis >= m.paSis || p.dia >= m.paDia; }).length;
    return {
      n: arr.length, prom: prom(arr), pulso: pul.length ? redondear(promedio(pul)) : "", max: max, min: min, sobre: sobre,
      pct: redondear(sobre * 100 / arr.length), manana: prom(man), nMan: man.length, tarde: prom(tar), nTar: tar.length,
      criticas: arr.filter(function (p) { return p.sis >= 180 || p.dia >= 120; }).length,
      bajas: arr.filter(function (p) { return p.sis < 90 || p.dia < 60; }).length
    };
  }
  function grupoGlu(arr, nombre, filtro) {
    var a = arr.filter(filtro);
    if (!a.length) return null;
    var v = a.map(function (g) { return g.valor; });
    return { nombre: nombre, n: a.length, prom: redondear(promedio(v)), min: Math.min.apply(null, v), max: Math.max.apply(null, v),
      fuera: a.filter(function (g) { var c = clasGlu(g).nivel; return c !== "ok"; }).length };
  }
  function statsGlu(arr) {
    if (!arr.length) return null;
    return {
      n: arr.length,
      grupos: [
        grupoGlu(arr, "En ayunas / antes de comer", esAyunas),
        grupoGlu(arr, "2 h después de comer", function (g) { return g.momento === "despues"; }),
        grupoGlu(arr, "Al acostarse / al azar", function (g) { return g.momento === "dormir" || g.momento === "azar"; })
      ].filter(Boolean),
      bajas: arr.filter(function (g) { return g.valor < 70; }).length,
      muyAltas: arr.filter(function (g) { return g.valor >= 300; }).length
    };
  }
  function stat(valor, etiqueta) { return '<div class="salud-stat"><strong>' + valor + "</strong><span>" + etiqueta + "</span></div>"; }

  /* ---------- Gráficas (canvas, sin librerías) ---------- */
  var COL = { navy: "#102D54", blue: "#3276AC", rojo: "#C0392B", naranja: "#D9822B", gris: "#7F8C8D", linea: "#DCE4EE", texto: "#5B6B7F", ok: "#1E8449", morado: "#6C4AB6" };
  function pasoBonito(rango, n) {
    var bruto = rango / n, p = [5, 10, 20, 25, 50, 100];
    for (var i = 0; i < p.length; i++) if (p[i] >= bruto) return p[i];
    return 100;
  }
  function grafica(ctx, x, y, w, h, op) {
    var f = op.f || 12, fuente = "Inter, Arial, sans-serif";
    var pl = f * 3.2, pr = f * 0.8, pt = f * 1.2, pb = f * 2.4;
    var gx = x + pl, gy = y + pt, gw = w - pl - pr, gh = h - pt - pb;
    var pts = [];
    op.series.forEach(function (s) { pts = pts.concat(s.puntos); });
    ctx.save();
    ctx.font = f + "px " + fuente; ctx.textBaseline = "middle";
    if (!pts.length) {
      ctx.fillStyle = COL.texto; ctx.textAlign = "center";
      ctx.fillText("Sin registros en este período", x + w / 2, y + h / 2);
      ctx.restore(); return;
    }
    var tMin = op.tMin != null ? op.tMin : Math.min.apply(null, pts.map(function (p) { return p.t; }));
    var tMax = op.tMax != null ? op.tMax : Math.max.apply(null, pts.map(function (p) { return p.t; }));
    if (tMax - tMin < DIA) { tMin -= DIA / 2; tMax += DIA / 2; }
    var vals = pts.map(function (p) { return p.v; }).concat(op.refs.map(function (r) { return r.v; }));
    var vMin = Math.min(op.yMin, Math.min.apply(null, vals)), vMax = Math.max(op.yMax, Math.max.apply(null, vals));
    var paso = pasoBonito(vMax - vMin, 5);
    vMin = Math.floor((vMin - paso * 0.3) / paso) * paso; vMax = Math.ceil((vMax + paso * 0.3) / paso) * paso;
    function X(t) { return gx + (t - tMin) / (tMax - tMin) * gw; }
    function Y(v) { return gy + gh - (v - vMin) / (vMax - vMin) * gh; }

    // Cuadrícula y eje Y
    ctx.lineWidth = Math.max(1, f * 0.08); ctx.strokeStyle = COL.linea; ctx.fillStyle = COL.texto; ctx.textAlign = "right";
    for (var v = vMin; v <= vMax + 0.01; v += paso) {
      ctx.beginPath(); ctx.moveTo(gx, Y(v)); ctx.lineTo(gx + gw, Y(v)); ctx.stroke();
      ctx.fillText(String(v), gx - f * 0.5, Y(v));
    }
    // Eje X (fechas)
    ctx.textAlign = "center"; ctx.textBaseline = "top";
    var nX = Math.max(2, Math.min(6, Math.floor(gw / (f * 5.5))));
    for (var i = 0; i <= nX; i++) {
      var t = tMin + (tMax - tMin) * i / nX;
      ctx.fillText(fechaCorta(t), Math.min(Math.max(X(t), gx + f * 1.5), gx + gw - f * 1.5), gy + gh + f * 0.7);
    }
    // Líneas de meta
    ctx.setLineDash([f * 0.5, f * 0.4]); ctx.textBaseline = "bottom"; ctx.textAlign = "right"; ctx.font = (f * 0.85) + "px " + fuente;
    op.refs.forEach(function (r) {
      ctx.strokeStyle = r.color; ctx.lineWidth = Math.max(1, f * 0.12);
      ctx.beginPath(); ctx.moveTo(gx, Y(r.v)); ctx.lineTo(gx + gw, Y(r.v)); ctx.stroke();
    });
    ctx.setLineDash([]);
    // Series
    var radio = pts.length > 60 ? f * 0.22 : f * 0.32;
    op.series.forEach(function (s) {
      if (!s.puntos.length) return;
      ctx.strokeStyle = s.color; ctx.fillStyle = s.color; ctx.lineWidth = f * 0.18; ctx.lineJoin = "round";
      if (s.linea !== false && s.puntos.length > 1) {
        ctx.globalAlpha = s.linea === "suave" ? 0.35 : 0.9;
        ctx.beginPath();
        s.puntos.forEach(function (p, k) { if (k) ctx.lineTo(X(p.t), Y(p.v)); else ctx.moveTo(X(p.t), Y(p.v)); });
        ctx.stroke(); ctx.globalAlpha = 1;
      }
      s.puntos.forEach(function (p) { ctx.beginPath(); ctx.arc(X(p.t), Y(p.v), radio, 0, Math.PI * 2); ctx.fill(); });
    });
    // Etiquetas de las metas (encima de los datos para que se lean)
    ctx.textBaseline = "bottom"; ctx.textAlign = "right"; ctx.font = (f * 0.85) + "px " + fuente;
    op.refs.forEach(function (r) {
      var tw = ctx.measureText(r.texto).width;
      ctx.fillStyle = "rgba(255,255,255,.9)"; ctx.fillRect(gx + gw - tw - f * 0.5, Y(r.v) - f * 1.15, tw + f * 0.4, f * 1);
      ctx.fillStyle = r.color; ctx.fillText(r.texto, gx + gw - f * 0.2, Y(r.v) - f * 0.15);
    });
    // Leyenda
    ctx.font = (f * 0.9) + "px " + fuente; ctx.textBaseline = "middle"; ctx.textAlign = "left";
    var lx = gx, ly = y + f * 0.2;
    op.series.forEach(function (s) {
      if (!s.puntos.length) return;
      ctx.fillStyle = s.color; ctx.beginPath(); ctx.arc(lx + f * 0.35, ly, f * 0.32, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = COL.navy; ctx.fillText(s.nombre, lx + f * 0.9, ly);
      lx += f * 1.6 + ctx.measureText(s.nombre).width;
    });
    ctx.restore();
  }
  function opcionesPA(arr, f, tMin, tMax) {
    var m = datos.metas;
    return { f: f, tMin: tMin, tMax: tMax, yMin: 60, yMax: 150,
      series: [
        { nombre: "Sistólica", color: COL.rojo, puntos: arr.map(function (p) { return { t: p.t, v: p.sis }; }) },
        { nombre: "Diastólica", color: COL.blue, puntos: arr.map(function (p) { return { t: p.t, v: p.dia }; }) }
      ],
      refs: [{ v: m.paSis, color: COL.rojo, texto: "Meta < " + m.paSis }, { v: m.paDia, color: COL.blue, texto: "Meta < " + m.paDia }] };
  }
  function opcionesGlu(arr, f, tMin, tMax) {
    var m = datos.metas;
    function de(fn) { return arr.filter(fn).map(function (g) { return { t: g.t, v: g.valor }; }); }
    return { f: f, tMin: tMin, tMax: tMax, yMin: 60, yMax: 200,
      series: [
        { nombre: "Ayunas/antes de comer", color: COL.blue, linea: "suave", puntos: de(esAyunas) },
        { nombre: "Después de comer", color: COL.naranja, linea: "suave", puntos: de(function (g) { return g.momento === "despues"; }) },
        { nombre: "Otros", color: COL.gris, linea: false, puntos: de(function (g) { return g.momento === "dormir" || g.momento === "azar"; }) }
      ],
      refs: [{ v: m.gluPostMax, color: COL.naranja, texto: "< " + m.gluPostMax + " después de comer" }, { v: m.gluAyMax, color: COL.blue, texto: "Ayunas ≤ " + m.gluAyMax }, { v: 70, color: COL.morado, texto: "70 (baja)" }] };
  }
  function dibujarEnPantalla(canvas, opFn) {
    var box = canvas.parentNode;
    if (!box.offsetWidth) return;
    var dpr = Math.min(window.devicePixelRatio || 1, 3), w = box.offsetWidth, h = 240;
    canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
    var ctx = canvas.getContext("2d"); ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, w, h);
    grafica(ctx, 0, 0, w, h, opFn(w < 420 ? 11 : 12));
  }

  /* ---------- Pintar pestañas ---------- */
  function pintarPresion() {
    var arr = filtrar(datos.presiones, 30), s = statsPA(arr);
    $('[data-stats="presion"]').innerHTML = s ?
      stat(s.prom, "Promedio (" + s.n + " tomas)") + (s.pulso ? stat(s.pulso, "Pulso promedio") : "") +
      stat(s.max.sis + "/" + s.max.dia, "Más alta") + stat(s.pct + " %", "Sobre la meta") :
      '<p class="salud-vacio">Aún no hay tomas en los últimos 30 días.</p>';
    var cv = $('[data-grafica="presion"]');
    cv.parentNode.hidden = !arr.length;
    redibujar.presion = function () { dibujarEnPantalla(cv, function (f) { return opcionesPA(arr, f, Date.now() - 30 * DIA, Date.now()); }); };
    redibujar.presion();
    lista("presion", datos.presiones, filaPA);
  }
  function pintarGlicemia() {
    var arr = filtrar(datos.glicemias, 30), s = statsGlu(arr);
    $('[data-stats="glicemia"]').innerHTML = s ?
      s.grupos.map(function (g) { return stat(g.prom, "Prom. " + g.nombre.toLowerCase() + " (" + g.n + ")"); }).join("") + stat(s.bajas, "Bajas (< 70)") :
      '<p class="salud-vacio">Aún no hay tomas en los últimos 30 días.</p>';
    var cv = $('[data-grafica="glicemia"]');
    cv.parentNode.hidden = !arr.length;
    redibujar.glicemia = function () { dibujarEnPantalla(cv, function (f) { return opcionesGlu(arr, f, Date.now() - 30 * DIA, Date.now()); }); };
    redibujar.glicemia();
    lista("glicemia", datos.glicemias, filaGlu);
  }
  function pintarExamenes() { lista("examenes", datos.examenes, filaEx); cargarMiniaturas(); }
  function pintarTodo() { pintarPresion(); pintarGlicemia(); pintarExamenes(); vistaPrevia.hidden = true; }
  var tRes;
  window.addEventListener("resize", function () {
    clearTimeout(tRes);
    tRes = setTimeout(function () { ["presion", "glicemia"].forEach(function (k) { if (redibujar[k]) redibujar[k](); }); }, 150);
  });

  /* ---------- Resumen para el médico ---------- */
  function textoPeriodo(dias) {
    var hoy = Date.now();
    if (!dias) {
      var todos = datos.presiones.concat(datos.glicemias, datos.examenes).map(function (r) { return r.t; });
      return todos.length ? fecha(Math.min.apply(null, todos)) + " al " + fecha(hoy) : "Todo";
    }
    return fecha(hoy - dias * DIA) + " al " + fecha(hoy);
  }
  function resumenTexto(dias) {
    var p = datos.perfil, m = datos.metas, L = [];
    var pa = filtrar(datos.presiones, dias), gl = filtrar(datos.glicemias, dias), ex = filtrar(datos.examenes, dias);
    var sp = statsPA(pa), sg = statsGlu(gl), e = edad(p.nacimiento);
    L.push("🔒 *INFORMACIÓN CONFIDENCIAL DE SALUD* – uso exclusivo del médico tratante");
    L.push("*Resumen de control en casa*");
    L.push("Paciente: " + p.nombre + (e !== "" ? " (" + e + " años)" : ""));
    if (p.medico) L.push("Para: " + p.medico);
    L.push("Período: " + textoPeriodo(dias));
    L.push("");
    L.push("*Presión arterial*" + (sp ? " (" + sp.n + " tomas)" : ""));
    if (sp) {
      L.push("• Promedio: " + sp.prom + " mmHg" + (sp.pulso ? " · pulso " + sp.pulso : ""));
      if (sp.nMan && sp.nTar) L.push("• Mañana: " + sp.manana + " (" + sp.nMan + ") · Tarde/noche: " + sp.tarde + " (" + sp.nTar + ")");
      L.push("• Más alta: " + sp.max.sis + "/" + sp.max.dia + " (" + fechaHora(sp.max.t) + ")");
      L.push("• Más baja: " + sp.min.sis + "/" + sp.min.dia + " (" + fechaHora(sp.min.t) + ")");
      L.push("• Sobre la meta (< " + m.paSis + "/" + m.paDia + "): " + sp.sobre + " de " + sp.n + " (" + sp.pct + " %)");
      if (sp.criticas) L.push("• ⚠️ Tomas de 180/120 o más: " + sp.criticas);
      if (sp.bajas) L.push("• Tomas bajas (< 90/60): " + sp.bajas);
    } else L.push("• Sin tomas en el período.");
    L.push("");
    L.push("*Glicemia*" + (sg ? " (" + sg.n + " tomas)" : ""));
    if (sg) {
      sg.grupos.forEach(function (g) { L.push("• " + g.nombre + ": promedio " + g.prom + " mg/dL (rango " + g.min + "–" + g.max + ", n=" + g.n + ", fuera de meta " + g.fuera + ")"); });
      L.push("• Bajas (< 70): " + sg.bajas + (sg.muyAltas ? " · ⚠️ Muy altas (≥ 300): " + sg.muyAltas : ""));
    } else L.push("• Sin tomas en el período.");
    L.push("");
    L.push("*Exámenes*");
    if (ex.length) ex.slice().reverse().forEach(function (x) { L.push("• " + fecha(x.t) + " – " + x.nombre + (x.resultado ? ": " + x.resultado + (x.unidad ? " " + x.unidad : "") : "") + (x.archivos && x.archivos.length ? " 📎" : "")); });
    else L.push("• Sin exámenes en el período.");
    L.push("");
    L.push("_Datos anotados por el paciente en «Mi control de salud» de " + CLINICA + ". No han sido verificados por la clínica._");
    if (consentOK()) L.push("_" + textoConsentimiento() + ": autoriza a la clínica y a su médico tratante a recibir esta información, usarla para su atención e incorporarla a su expediente, bajo confidencialidad._");
    return L.join("\n");
  }

  // Imagen del reporte (1080 px de ancho; dos pasadas: medir y dibujar)
  function recortar(ctx, s, max) {
    s = String(s || "");
    if (ctx.measureText(s).width <= max) return s;
    while (s.length && ctx.measureText(s + "…").width > max) s = s.slice(0, -1);
    return s + "…";
  }
  function dibujarReporte(ctx, dias) {
    var W = 1080, M = 56, y = 0, F = "Inter, Arial, sans-serif", H = "Montserrat, Inter, Arial, sans-serif";
    var p = datos.perfil, m = datos.metas;
    var pa = filtrar(datos.presiones, dias), gl = filtrar(datos.glicemias, dias), ex = filtrar(datos.examenes, dias);
    var sp = statsPA(pa), sg = statsGlu(gl), e = edad(p.nacimiento);
    var tMin = dias ? Date.now() - dias * DIA : null, tMax = dias ? Date.now() : null;

    function txt(s, x, yy, font, color, align) { ctx.font = font; ctx.fillStyle = color; ctx.textAlign = align || "left"; ctx.textBaseline = "alphabetic"; ctx.fillText(s, x, yy); }
    function titulo(s) { y += 30; txt(s, M, y + 34, "700 34px " + H, COL.navy); y += 52; ctx.fillStyle = COL.blue; ctx.fillRect(M, y, 70, 5); y += 26; }
    function tarjetas(items) {
      var n = items.length, g = 16, w = (W - 2 * M - g * (n - 1)) / n, h = 112;
      items.forEach(function (it, i) {
        var x = M + i * (w + g);
        ctx.fillStyle = it.fondo || "#EAF2F9"; ctx.beginPath();
        if (ctx.roundRect) ctx.roundRect(x, y, w, h, 16); else ctx.rect(x, y, w, h);
        ctx.fill();
        txt(it.valor, x + 20, y + 52, "700 36px " + H, it.color || COL.navy);
        ctx.font = "19px " + F; txt(recortar(ctx, it.etiqueta, w - 32), x + 20, y + 90, "19px " + F, COL.texto);
      });
      y += h + 18;
    }
    function linea(s, color, negrita) { ctx.font = (negrita ? "600 " : "") + "24px " + F; txt(recortar(ctx, s, W - 2 * M), M, y + 26, ctx.font, color || "#1B2635"); y += 38; }
    function tabla(cols, filas) {
      var x0 = M, anchoTot = W - 2 * M;
      ctx.fillStyle = "#102D54"; ctx.fillRect(x0, y, anchoTot, 46);
      var x = x0;
      cols.forEach(function (c) { txt(c.t, x + 12, y + 31, "600 21px " + F, "#fff"); x += c.w * anchoTot; });
      y += 46;
      filas.forEach(function (f, i) {
        ctx.fillStyle = i % 2 ? "#F4F6F8" : "#FFFFFF"; ctx.fillRect(x0, y, anchoTot, 42);
        var xx = x0;
        f.forEach(function (celda, j) {
          var c = typeof celda === "object" ? celda : { t: celda };
          ctx.font = (c.b ? "600 " : "") + "21px " + F;
          txt(recortar(ctx, c.t, cols[j].w * anchoTot - 20), xx + 12, y + 29, ctx.font, c.color || "#1B2635");
          xx += cols[j].w * anchoTot;
        });
        y += 42;
      });
      y += 10;
    }
    var colorNivel = { ok: COL.ok, medio: "#8A5A00", alto: "#A83C12", critico: COL.rojo, bajo: COL.morado };

    // Encabezado: logo sobre blanco y título en franja azul
    ctx.fillStyle = "#FFFFFF"; ctx.fillRect(0, 0, W, 100000);
    var top = 0;
    if (logoImg) {
      var lh = 150, lw = Math.min(W - 2 * M, lh * logoImg.naturalWidth / logoImg.naturalHeight);
      lh = lw * logoImg.naturalHeight / logoImg.naturalWidth;
      ctx.drawImage(logoImg, M, 24, lw, lh);
      txt("CONFIDENCIAL", W - M, 24 + lh / 2 - 6, "800 28px " + H, COL.rojo, "right");
      txt("Uso exclusivo del médico tratante", W - M, 24 + lh / 2 + 28, "20px " + F, COL.texto, "right");
      top = lh + 48;
    }
    ctx.fillStyle = COL.navy; ctx.fillRect(0, top, W, 150);
    ctx.fillStyle = COL.blue; ctx.fillRect(0, top + 150, W, 8);
    if (!logoImg) txt(CLINICA.toUpperCase(), M, top + 40, "600 22px " + F, "#A9CBEA");
    txt("Resumen de control en casa", M, top + (logoImg ? 78 : 92), "800 48px " + H, "#FFFFFF");
    txt("Presión arterial · Glicemia · Exámenes", M, top + (logoImg ? 122 : 132), "24px " + F, "rgba(255,255,255,.85)");
    y = top + 200;
    txt(p.nombre + (e !== "" ? "  ·  " + e + " años" : ""), M, y, "700 34px " + H, COL.navy); y += 44;
    linea("Período: " + textoPeriodo(dias) + "   ·   Generado: " + fechaHora(Date.now()), COL.texto);
    if (p.medico) linea("Para: " + p.medico, COL.texto);

    // Presión
    titulo("Presión arterial");
    if (sp) {
      tarjetas([
        { valor: sp.prom, etiqueta: "Promedio (" + sp.n + ")" },
        { valor: sp.pulso ? String(sp.pulso) : "—", etiqueta: "Pulso promedio" },
        { valor: sp.max.sis + "/" + sp.max.dia, etiqueta: "Más alta · " + fechaCorta(sp.max.t), color: colorNivel[clasPA(sp.max).nivel] },
        { valor: sp.pct + " %", etiqueta: "Sobre la meta", color: sp.pct > 50 ? COL.rojo : COL.navy }
      ]);
      if (sp.nMan && sp.nTar) linea("Promedio mañana: " + sp.manana + " (" + sp.nMan + ")   ·   Tarde/noche: " + sp.tarde + " (" + sp.nTar + ")");
      linea("Más baja: " + sp.min.sis + "/" + sp.min.dia + " (" + fechaHora(sp.min.t) + ")" + (sp.criticas ? "   ·   ⚠ 180/120 o más: " + sp.criticas : "") + (sp.bajas ? "   ·   Bajas: " + sp.bajas : ""), sp.criticas ? COL.rojo : null, !!sp.criticas);
      y += 6; grafica(ctx, M - 10, y, W - 2 * M + 10, 400, opcionesPA(pa, 22, tMin, tMax)); y += 410;
    } else linea("Sin tomas de presión en este período.", COL.texto);

    // Glicemia
    titulo("Glicemia");
    if (sg) {
      var corto = { "En ayunas / antes de comer": "Ayunas", "2 h después de comer": "Post comida", "Al acostarse / al azar": "Otros" };
      var tg = sg.grupos.map(function (g) { return { valor: String(g.prom), etiqueta: corto[g.nombre] + " (" + g.n + ")" }; });
      tg.push({ valor: String(sg.bajas), etiqueta: "Bajas (< 70)", color: sg.bajas ? COL.morado : COL.navy });
      tarjetas(tg);
      sg.grupos.forEach(function (g) { linea(g.nombre + ": rango " + g.min + "–" + g.max + " mg/dL · fuera de meta " + g.fuera + " de " + g.n); });
      if (sg.muyAltas) linea("⚠ Glicemias de 300 o más: " + sg.muyAltas, COL.rojo, true);
      y += 6; grafica(ctx, M - 10, y, W - 2 * M + 10, 400, opcionesGlu(gl, 22, tMin, tMax)); y += 410;
    } else linea("Sin tomas de glicemia en este período.", COL.texto);

    // Exámenes
    titulo("Exámenes");
    if (ex.length) {
      tabla([{ t: "Fecha", w: 0.17 }, { t: "Examen", w: 0.43 }, { t: "Resultado", w: 0.25 }, { t: "Adjunto", w: 0.15 }],
        ex.slice().reverse().map(function (x) { return [fecha(x.t), { t: x.nombre, b: true }, (x.resultado || "—") + (x.unidad ? " " + x.unidad : ""), x.archivos && x.archivos.length ? x.archivos.length + " archivo(s)" : "—"]; }));
    } else linea("Sin exámenes en este período.", COL.texto);

    // Detalle
    var LIM = 30;
    if (pa.length) {
      titulo("Detalle de presión" + (pa.length > LIM ? " (últimas " + LIM + " de " + pa.length + ")" : ""));
      tabla([{ t: "Fecha y hora", w: 0.30 }, { t: "PA", w: 0.13 }, { t: "Pulso", w: 0.09 }, { t: "Estado", w: 0.19 }, { t: "Nota", w: 0.29 }],
        pa.slice(-LIM).reverse().map(function (r) { var c = clasPA(r); return [fechaHora(r.t), { t: r.sis + "/" + r.dia, b: true }, r.pulso || "—", { t: c.texto, color: colorNivel[c.nivel], b: true }, [BRAZOS[r.brazo], r.posicion !== "sentado" ? POSICIONES[r.posicion] : "", r.nota].filter(Boolean).join(" · ") || ""]; }));
    }
    if (gl.length) {
      titulo("Detalle de glicemia" + (gl.length > LIM ? " (últimas " + LIM + " de " + gl.length + ")" : ""));
      var MCORTO = { ayunas: "Ayunas", antes: "Antes de comer", despues: "2 h post comida", dormir: "Al acostarse", azar: "Al azar" };
      tabla([{ t: "Fecha y hora", w: 0.30 }, { t: "mg/dL", w: 0.10 }, { t: "Momento", w: 0.22 }, { t: "Estado", w: 0.19 }, { t: "Nota", w: 0.19 }],
        gl.slice(-LIM).reverse().map(function (r) { var c = clasGlu(r); return [fechaHora(r.t), { t: String(r.valor), b: true }, MCORTO[r.momento] || "", { t: c.texto, color: colorNivel[c.nivel], b: true }, r.nota || ""]; }));
    }

    // Pie
    y += 24;
    ctx.fillStyle = "#F4F6F8"; ctx.fillRect(0, y, W, 230);
    txt("Datos anotados por el paciente en «Mi control de salud». No han sido verificados por la clínica.", M, y + 48, "20px " + F, COL.texto);
    txt("Metas: PA < " + m.paSis + "/" + m.paDia + " · Glicemia ayunas " + m.gluAyMin + "–" + m.gluAyMax + " · 2 h después de comer < " + m.gluPostMax + " mg/dL", M, y + 82, "20px " + F, COL.texto);
    ctx.font = "600 20px " + F;
    txt(recortar(ctx, consentOK() ? textoConsentimiento() + "." : "Sin consentimiento registrado.", W - 2 * M), M, y + 128, ctx.font, COL.navy);
    txt("Autoriza a la clínica y a su médico tratante a recibir esta información, usarla para su atención e", M, y + 160, "20px " + F, COL.texto);
    txt("incorporarla a su expediente. Información confidencial de salud (Ley 81 de 2019 y Ley 68 de 2003).", M, y + 190, "20px " + F, COL.texto);
    return y + 230;
  }
  function generarImagen(dias) {
    var c = document.createElement("canvas");
    c.width = 1080; c.height = 10;
    var alto = dibujarReporte(c.getContext("2d"), dias); // pasada de medición
    c.height = Math.min(Math.ceil(alto), 14000);
    dibujarReporte(c.getContext("2d"), dias);
    return c;
  }

  /* ---------- Logo para el reporte ---------- */
  var logoImg = null, logoPromesa = null;
  function cargarLogo() {
    if (logoPromesa) return logoPromesa;
    logoPromesa = new Promise(function (ok) {
      if (!CFG.logo) return ok(null);
      var img = new Image();
      img.onload = function () { logoImg = img; ok(img); };
      img.onerror = function () { ok(null); };
      img.src = CFG.logo;
    });
    return logoPromesa;
  }

  /* ---------- Enviar ---------- */
  var vistaPrevia = $("[data-preview]"), preparado = null;
  var ayudaCompartir = $("[data-compartir-ayuda]");
  function nombreArchivo(s) { return String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase().slice(0, 40); }
  function waDestino() { return datos.perfil.whatsapp || WA_CLINICA; }

  $("[data-preparar]").addEventListener("click", function () {
    var btn = this, dias = Number($("[data-periodo]").value), conFotos = $("[data-incluir-fotos]").checked;
    var hay = filtrar(datos.presiones, dias).length + filtrar(datos.glicemias, dias).length + filtrar(datos.examenes, dias).length;
    if (!hay) { mostrarAlerta("aviso", ["No hay registros en el período elegido. Elija un período más largo o anote sus tomas primero."]); return; }
    btn.disabled = true; btn.textContent = "Preparando…";
    var listo = Promise.all([document.fonts && document.fonts.ready ? document.fonts.ready : null, cargarLogo()]);
    listo.then(function () {
      var canvas = generarImagen(dias), texto = resumenTexto(dias);
      var hoy = isoDia(new Date()), base = "resumen-salud-" + nombreArchivo(datos.perfil.nombre) + "-" + hoy;
      var archivosEx = conFotos ? filtrar(datos.examenes, dias).reduce(function (acc, x) {
        (x.archivos || []).forEach(function (a, i) { acc.push({ id: a.id, nombre: "examen-" + x.fecha + "-" + nombreArchivo(x.nombre) + (i ? "-" + (i + 1) : "") + "." + a.tipo }); });
        return acc;
      }, []) : [];
      return Promise.all([
        new Promise(function (ok) { canvas.toBlob(ok, "image/png"); }),
        Promise.all(archivosEx.map(function (a) { return archivoGet(a.id).then(function (v) { return v ? new File([dataURLaBlob(v.url)], a.nombre, { type: v.tipo === "pdf" ? "application/pdf" : "image/jpeg" }) : null; }).catch(function () { return null; }); }))
      ]).then(function (r) {
        var png = new File([r[0]], base + ".png", { type: "image/png" });
        preparado = { texto: texto, png: png, archivos: [png].concat(r[1].filter(Boolean)), url: canvas.toDataURL("image/png") };
        $("[data-preview-img]").src = preparado.url;
        $("[data-preview-texto]").textContent = texto;
        var puede = navigator.canShare && navigator.canShare({ files: preparado.archivos });
        ayudaCompartir.textContent = puede ?
          "«Compartir» abre el menú del teléfono: elija WhatsApp, Gmail, Outlook, Telegram u otra aplicación y luego a su médico. Se enviarán " + preparado.archivos.length + " archivo(s) y el texto." :
          "Este navegador no permite compartir archivos directamente: al compartir o enviar por correo se guardará la imagen en su equipo para que la adjunte.";
        vistaPrevia.hidden = false;
        vistaPrevia.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }).catch(function () {
      mostrarAlerta("critico", ["No se pudo preparar el resumen. Intente de nuevo."]);
    }).then(function () { btn.disabled = false; btn.textContent = "Preparar resumen"; });
  });

  function descargar(url, nombre) {
    var a = document.createElement("a"); a.href = url; a.download = nombre; document.body.appendChild(a); a.click(); a.remove();
  }
  function abrirWA(texto) {
    var u = "https://wa.me/" + waDestino() + "?text=" + encodeURIComponent(texto);
    var movil = /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
    if (movil) window.location.href = u; else window.open(u, "_blank", "noopener");
  }
  $("[data-compartir]").addEventListener("click", function () {
    if (!preparado) return;
    if (navigator.canShare && navigator.canShare({ files: preparado.archivos })) {
      // El texto va como mensaje junto con la imagen y los adjuntos
      navigator.share({ files: preparado.archivos, text: preparado.texto, title: "Resumen de control en casa" }).catch(function (err) {
        if (err && err.name === "AbortError") return;
        // Algunos teléfonos rechazan varios archivos: intentar solo con la imagen
        navigator.share({ files: [preparado.png], text: preparado.texto }).catch(function () {});
      });
      return;
    }
    descargar(preparado.url, preparado.png.name);
    mostrarAlerta("aviso", ["Se guardó la imagen del resumen en su equipo (" + esc(preparado.png.name) + "). Adjúntela en el mensaje o correo para su médico. También puede usar «Enviar por correo» o «Enviar el texto al WhatsApp de mi médico»."]);
  });
  function textoPlano(t) { return t.replace(/[*_]/g, "").replace(/🔒 /g, ""); }
  $("[data-enviar-correo]").addEventListener("click", function () {
    if (!preparado) return;
    var p = datos.perfil, asunto = "Resumen de control en casa – " + p.nombre + " – CONFIDENCIAL";
    var cuerpo = textoPlano(preparado.texto) + "\n\nSe adjunta la imagen del resumen con gráficas.";
    if (navigator.canShare && navigator.canShare({ files: preparado.archivos })) {
      // Con adjuntos: el paciente elige su aplicación de correo en el menú del teléfono
      if (p.correo && navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(p.correo).catch(function () {});
      mostrarAlerta("aviso", [p.correo ? "Elija su aplicación de correo (Gmail, Outlook…). El correo de su médico, <strong>" + esc(p.correo) + "</strong>, quedó copiado: péguelo en «Para»." : "Elija su aplicación de correo (Gmail, Outlook…) y escriba el correo de su médico en «Para»."]);
      navigator.share({ files: preparado.archivos, title: asunto, text: cuerpo }).catch(function () {});
      return;
    }
    // Sin poder adjuntar automáticamente: se guarda la imagen y se abre el correo con el texto
    descargar(preparado.url, preparado.png.name);
    window.location.href = "mailto:" + encodeURIComponent(p.correo || "") + "?subject=" + encodeURIComponent(asunto) + "&body=" + encodeURIComponent(cuerpo);
    mostrarAlerta("aviso", ["Se abrió su correo con el resumen y se guardó la imagen (" + esc(preparado.png.name) + "). Adjúntela antes de enviar."]);
  });
  $("[data-imprimir]").addEventListener("click", function () {
    if (!preparado) return;
    var img = document.querySelector("[data-imprimir-img]");
    img.onload = function () { window.print(); };
    if (img.src === preparado.url && img.complete) window.print(); else img.src = preparado.url;
  });
  $("[data-enviar-texto]").addEventListener("click", function () { if (preparado) abrirWA(preparado.texto); });
  $("[data-descargar]").addEventListener("click", function () { if (preparado) descargar(preparado.url, preparado.png.name); });
  $("[data-periodo]").addEventListener("change", function () { vistaPrevia.hidden = true; });
  $("[data-incluir-fotos]").addEventListener("change", function () { vistaPrevia.hidden = true; });

  /* ---------- Respaldo ---------- */
  $("[data-exportar]").addEventListener("click", function () {
    archivosTodos().catch(function () { return []; }).then(function (pares) {
      var arch = {}; pares.forEach(function (p) { arch[p[0]] = p[1]; });
      var json = JSON.stringify({ app: "cmla-mi-salud", exportado: new Date().toISOString(), datos: datos, archivos: arch });
      var nombre = "respaldo-mi-salud-" + nombreArchivo(datos.perfil.nombre) + "-" + isoDia(new Date()) + ".json";
      var file = new File([json], nombre, { type: "application/json" });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        navigator.share({ files: [file], title: "Respaldo de Mi control de salud" }).catch(function (err) {
          if (!err || err.name !== "AbortError") { var u = URL.createObjectURL(file); descargar(u, nombre); setTimeout(function () { URL.revokeObjectURL(u); }, 30000); }
        });
      } else {
        var u = URL.createObjectURL(file); descargar(u, nombre); setTimeout(function () { URL.revokeObjectURL(u); }, 30000);
      }
      datos.perfil.ultimoRespaldo = new Date().toISOString(); guardar();
    });
  });
  $("[data-importar]").addEventListener("change", function () {
    var input = this, file = input.files && input.files[0];
    if (!file) return;
    file.text().then(function (t) {
      var j = JSON.parse(t);
      if (!j || j.app !== "cmla-mi-salud" || !j.datos) throw new Error("formato");
      var nuevoDatos = normalizar(j.datos);
      var resumen = nuevoDatos.presiones.length + " tomas de presión, " + nuevoDatos.glicemias.length + " de glicemia y " + nuevoDatos.examenes.length + " exámenes";
      if (!window.confirm("¿Restaurar el respaldo de " + (nuevoDatos.perfil.nombre || "paciente") + " (" + resumen + ")? Reemplazará los datos actuales de este teléfono.")) return;
      return archivosBorrarTodo().catch(function () {}).then(function () {
        return Promise.all(Object.keys(j.archivos || {}).map(function (k) {
          var a = j.archivos[k];
          return a && typeof a.url === "string" && /^data:(image\/jpeg|application\/pdf);base64,/.test(a.url) ? archivoPut(k, a) : null;
        }));
      }).then(function () {
        datos = nuevoDatos; guardar(); llenarPerfil(); pintarTodo();
        if (!consentOK()) { mostrarBienvenida(); return; }
        mostrarApp(); irA("datos");
        mostrarAlerta("ok", ["Respaldo restaurado: " + resumen + "."]);
      });
    }).catch(function () {
      mostrarAlerta("critico", ["El archivo no es un respaldo válido de «Mi control de salud»."]);
    }).then(function () { input.value = ""; });
  });
  $("[data-retirar]").addEventListener("click", function () {
    if (!window.confirm("Al retirar su consentimiento se borrarán de este teléfono todos sus registros, fotos y datos, y dejará de usar la aplicación.\n\nLa información que ya envió a su médico forma parte de su expediente clínico; para consultarla, corregirla u oponerse a su uso, comuníquese con la clínica.\n\n¿Desea retirar su consentimiento?")) return;
    borrarTodoYRecargar();
  });
  $("[data-borrar-todo]").addEventListener("click", function () {
    if (!window.confirm("¿Borrar TODOS sus datos de este teléfono? Se perderán sus registros y fotos. Esta acción no se puede deshacer.")) return;
    if (!window.confirm("Confirme otra vez: ¿borrar todo?")) return;
    borrarTodoYRecargar();
  });
  function borrarTodoYRecargar() {
    try { localStorage.removeItem(KEY); } catch (e) {}
    archivosBorrarTodo().catch(function () {}).then(function () { window.location.reload(); });
  }

  /* ---------- Instalación (Android/Chrome) ---------- */
  var eventoInstalar = null, btnInstalar = $("[data-instalar]");
  window.addEventListener("beforeinstallprompt", function (e) { e.preventDefault(); eventoInstalar = e; btnInstalar.hidden = false; });
  btnInstalar.addEventListener("click", function () { if (!eventoInstalar) return; eventoInstalar.prompt(); eventoInstalar = null; btnInstalar.hidden = true; });
  if ("serviceWorker" in navigator && window.isSecureContext) {
    window.addEventListener("load", function () { navigator.serviceWorker.register("sw.js", { scope: "./" }).catch(function () {}); });
  }

  /* ---------- Inicio ---------- */
  [formPA, formGlu, formEx].forEach(ponerAhora);
  if (!almacenOK) { $("[data-sin-almacen]").hidden = false; return; }
  llenarPerfil();
  pintarTodo();
  if (consentOK() && datos.perfil.nombre) mostrarApp(); else mostrarBienvenida();

  // Recordatorio de respaldo: si hay datos y pasó más de un mes
  var ult = datos.perfil.ultimoRespaldo ? new Date(datos.perfil.ultimoRespaldo).getTime() : 0;
  var total = datos.presiones.length + datos.glicemias.length + datos.examenes.length;
  if (consentOK() && total >= 10 && Date.now() - ult > 30 * DIA) {
    mostrarAlerta("aviso", ["Le recomendamos <strong>crear un respaldo</strong> de sus datos (pestaña «Mis datos»). Si cambia o pierde el teléfono, podrá recuperarlos."]);
  }
})();
