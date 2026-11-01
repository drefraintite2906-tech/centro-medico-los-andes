/* Centro Médico Los Andes – interacción del sitio (sin dependencias) */
(function () {
  "use strict";
  document.documentElement.classList.add("js");

  var CFG = {};
  try { CFG = JSON.parse(document.getElementById("clinica-config").textContent) || {}; } catch (e) {}
  var WA = String(CFG.whatsapp || "50760568129").replace(/\D/g, "");

  // Fecha/hora en Panamá (UTC-5, sin horario de verano)
  function ahoraPanama() {
    var d = new Date();
    return new Date(d.getTime() + d.getTimezoneOffset() * 60000 - 5 * 3600000);
  }
  function isoLocal(d) {
    return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
  }
  function waUrl(texto) { return "https://wa.me/" + WA + "?text=" + encodeURIComponent(texto); }
  function abrirWhatsApp(texto) {
    var w = window.open(waUrl(texto), "_blank", "noopener");
    if (!w) window.location.href = waUrl(texto);
  }
  function limpiar(v) { return String(v || "").replace(/[<>]/g, "").replace(/\s+/g, " ").trim(); }

  /* ---------- Encabezado y menú ---------- */
  var header = document.querySelector("[data-header]");
  var nav = document.querySelector("[data-nav]");
  var toggle = document.querySelector("[data-nav-toggle]");
  function onScroll() { if (header) header.classList.toggle("is-scrolled", window.scrollY > 10); }
  window.addEventListener("scroll", onScroll, { passive: true }); onScroll();

  function cerrarMenu() {
    if (!nav) return;
    nav.classList.remove("is-open"); document.body.classList.remove("nav-open");
    toggle && toggle.setAttribute("aria-expanded", "false");
  }
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var abierto = !nav.classList.contains("is-open");
      if (abierto) nav.style.top = Math.max(0, header.getBoundingClientRect().bottom) + "px";
      nav.classList.toggle("is-open", abierto);
      document.body.classList.toggle("nav-open", abierto);
      toggle.setAttribute("aria-expanded", String(abierto));
    });
    nav.addEventListener("click", function (e) { if (e.target.closest("a")) cerrarMenu(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") cerrarMenu(); });
    window.addEventListener("resize", function () { if (window.innerWidth >= 1280) { cerrarMenu(); nav.style.top = ""; } });
  }
  document.querySelectorAll("[data-sub-toggle]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var sub = btn.nextElementSibling, open = !sub.classList.contains("is-open");
      sub.classList.toggle("is-open", open); btn.setAttribute("aria-expanded", String(open));
    });
  });

  /* ---------- Animación de aparición ---------- */
  var reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("is-visible"); io.unobserve(en.target); } });
    }, { rootMargin: "0px 0px -40px 0px" });
    reveals.forEach(function (el) { io.observe(el); });
  } else { reveals.forEach(function (el) { el.classList.add("is-visible"); }); }

  /* ---------- Estado de horario ("Abierto ahora") ---------- */
  var estado = document.querySelector("[data-estado-horario]");
  if (estado) {
    var n = ahoraPanama(), dia = n.getDay(), h = n.getHours() + n.getMinutes() / 60;
    var abre = dia === 0 ? 9 : 8, cierra = dia === 0 ? 17 : 20;
    var abierto = h >= abre && h < cierra;
    estado.textContent = abierto ? "Abierto ahora · hasta las " + (cierra === 20 ? "8:00 p. m." : "5:00 p. m.") : "Cerrado ahora · escríbenos por WhatsApp";
    estado.classList.toggle("is-open", abierto);
  }

  /* ---------- Promociones: ocultar vencidas automáticamente ---------- */
  var hoy = isoLocal(ahoraPanama());
  document.querySelectorAll(".promo[data-hasta], .promo[data-desde]").forEach(function (card) {
    var hasta = card.getAttribute("data-hasta"), desde = card.getAttribute("data-desde");
    if ((hasta && hasta < hoy) || (desde && desde > hoy)) {
      (card.closest(".promo-wrap") || card).remove();
    }
  });
  document.querySelectorAll("[data-promos]").forEach(function (grid) {
    if (!grid.querySelector(".promo")) {
      grid.remove();
      var vacio = document.querySelector("[data-promos-empty]");
      if (vacio) vacio.classList.remove("is-hidden");
      var f = document.querySelector("[data-filters]"); if (f) f.remove();
    }
  });
  var filtros = document.querySelector("[data-filters]");
  if (filtros) {
    filtros.addEventListener("click", function (e) {
      var b = e.target.closest("[data-filter]"); if (!b) return;
      filtros.querySelectorAll(".filter").forEach(function (x) { x.classList.toggle("is-active", x === b); });
      var cat = b.getAttribute("data-filter");
      document.querySelectorAll(".promo-wrap").forEach(function (w) {
        w.classList.toggle("is-hidden", cat !== "*" && w.getAttribute("data-cat") !== cat);
      });
    });
  }

  /* ---------- Validación común ---------- */
  function validar(form) {
    var err = form.querySelector("[data-form-error]");
    form.classList.add("was-validated");
    if (err) err.textContent = "";
    var hp = form.querySelector('[name="bot-field"]');
    if (hp && hp.value) return false; // bot detectado
    var invalido = Array.prototype.find.call(form.elements, function (el) { return el.willValidate && !el.checkValidity(); });
    if (invalido) {
      if (err) err.textContent = invalido.type === "checkbox" ? "Debes aceptar la política de privacidad para continuar." : "Revisa el campo: " + String((form.querySelector('label[for="' + invalido.id + '"]') || {}).textContent || "").replace("*", "").trim();
      invalido.focus();
      return false;
    }
    var grupo = form.querySelectorAll('[name="servicios"]');
    if (grupo.length && !form.querySelector('[name="servicios"]:checked')) {
      if (err) err.textContent = "Selecciona al menos un servicio.";
      grupo[0].focus();
      return false;
    }
    return true;
  }
  function valor(form, name) { var el = form.elements[name]; return el ? limpiar(el.value) : ""; }
  function marcados(form, name) {
    return Array.prototype.map.call(form.querySelectorAll('[name="' + name + '"]:checked'), function (c) { return c.value; });
  }
  function fechaBonita(iso) {
    if (!iso) return "";
    var p = iso.split("-"); var d = new Date(+p[0], +p[1] - 1, +p[2]);
    return d.toLocaleDateString("es-PA", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  }

  /* ---------- Solicitud de cita (WhatsApp) ----------
     Arquitectura preparada: BookingProviders permite agregar un proveedor
     de reservas con calendario real (API) sin cambiar el formulario. */
  var BookingProviders = {
    whatsapp: {
      enviar: function (s) {
        var t = "*SOLICITUD DE CITA – " + (CFG.nombre || "Centro Médico Los Andes") + "*\n\n" +
          "• *Servicio:* " + s.servicio + "\n" +
          (s.profesional ? "• *Profesional:* " + s.profesional + "\n" : "") +
          "• *Nombre:* " + s.nombre + "\n" +
          "• *Teléfono:* " + s.telefono + "\n" +
          "• *Fecha preferida:* " + fechaBonita(s.fecha) + "\n" +
          "• *Horario preferido:* " + s.horario + "\n" +
          (s.comentarios ? "• *Comentarios:* " + s.comentarios + "\n" : "") +
          "\nEntiendo que esta es una solicitud y que la clínica me confirmará la disponibilidad.";
        abrirWhatsApp(t);
        return Promise.resolve({ estado: "pendiente_confirmacion" });
      }
    }
    // api: { enviar: function (s) { return fetch("/api/reservas", { method: "POST", body: JSON.stringify(s) }); } }
  };

  var formCita = document.querySelector('[data-form="cita"]');
  if (formCita) {
    var params = new URLSearchParams(location.search);
    var sel = formCita.elements.servicio, pre = params.get("servicio");
    if (pre && sel) {
      var opt = Array.prototype.find.call(sel.options, function (o) { return o.value.toLowerCase() === pre.toLowerCase(); });
      if (opt) sel.value = opt.value;
    }
    var prof = formCita.elements.profesional, preProf = params.get("profesional");
    if (prof && preProf) prof.value = preProf;
    var fecha = formCita.elements.fecha;
    if (fecha) {
      fecha.min = hoy;
      var max = ahoraPanama(); max.setMonth(max.getMonth() + 6); fecha.max = isoLocal(max);
      var hint = formCita.querySelector("[data-hint-domingo]");
      fecha.addEventListener("change", function () {
        if (!hint || !fecha.value) return;
        var p = fecha.value.split("-");
        hint.hidden = new Date(+p[0], +p[1] - 1, +p[2]).getDay() !== 0;
      });
    }
    formCita.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!validar(formCita)) return;
      var proveedor = BookingProviders[(CFG.reservas && CFG.reservas.proveedor) || "whatsapp"] || BookingProviders.whatsapp;
      proveedor.enviar({
        servicio: valor(formCita, "servicio"), profesional: valor(formCita, "profesional"),
        nombre: valor(formCita, "nombre"), telefono: valor(formCita, "telefono"),
        fecha: valor(formCita, "fecha"), horario: valor(formCita, "horario"),
        comentarios: valor(formCita, "comentarios")
      });
    });
  }

  /* ---------- Cotización empresarial y contacto ---------- */
  var mensajes = {
    cotizacion: function (f) {
      return "*SOLICITUD DE COTIZACIÓN EMPRESARIAL – SALUD OCUPACIONAL*\n\n" +
        "• *Empresa:* " + valor(f, "empresa") + "\n" +
        "• *Contacto:* " + valor(f, "contacto") + "\n" +
        "• *Teléfono:* " + valor(f, "telefono") + "\n" +
        "• *Correo:* " + valor(f, "correo") + "\n" +
        "• *N.º aproximado de trabajadores:* " + valor(f, "trabajadores") + "\n" +
        "• *Servicios solicitados:* " + marcados(f, "servicios").join(", ") + "\n" +
        (valor(f, "mensaje") ? "• *Mensaje:* " + valor(f, "mensaje") + "\n" : "");
    },
    contacto: function (f) {
      return "*MENSAJE DESDE EL SITIO WEB*\n\n" +
        "• *Nombre:* " + valor(f, "nombre") + "\n" +
        "• *Teléfono:* " + valor(f, "telefono") + "\n" +
        (valor(f, "correo") ? "• *Correo:* " + valor(f, "correo") + "\n" : "") +
        "• *Mensaje:* " + valor(f, "mensaje");
    }
  };
  ["cotizacion", "contacto"].forEach(function (tipo) {
    var f = document.querySelector('[data-form="' + tipo + '"]');
    if (!f) return;
    var enviando = false;
    f.addEventListener("submit", function (e) {
      if (enviando || !validar(f)) { e.preventDefault(); return; }
      enviando = true;
      var b = f.querySelector('[type="submit"]'); if (b) { b.disabled = true; b.textContent = "Enviando…"; }
    });
    var waBtn = f.querySelector("[data-send-wa]");
    if (waBtn) waBtn.addEventListener("click", function () { if (validar(f)) abrirWhatsApp(mensajes[tipo](f)); });
  });
})();
