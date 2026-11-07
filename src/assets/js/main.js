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
  // Celular/tableta: abre WhatsApp en la misma pestaña (va directo a la app).
  // Computadora: muestra un cuadro de ayuda con QR para terminar desde el celular, abrir WhatsApp
  // en la PC, copiar el mensaje o llamar. Evita abrir pestañas repetidas.
  var esMovil = /Android|iPhone|iPad|iPod|Mobile|Silk|Opera Mini/i.test(navigator.userAgent) ||
    (navigator.maxTouchPoints > 1 && /Macintosh/.test(navigator.userAgent));
  var ultimoEnvio = 0;
  function abrirWhatsApp(texto) {
    var ahora = Date.now();
    if (ahora - ultimoEnvio < 2500) return; // evita dobles clics
    ultimoEnvio = ahora;
    if (esMovil) { window.location.href = waUrl(texto); return; }
    mostrarAyudaPC(texto);
  }

  function cargarQR(cb) {
    if (window.qrcode) return cb();
    var s = document.createElement("script");
    s.src = "/assets/js/vendor/qrcode.js";
    s.onload = function () { cb(); }; s.onerror = function () { cb(new Error("qr")); };
    document.head.appendChild(s);
  }
  function qrSVG(url) {
    var q = window.qrcode(0, "L"); q.addData(url); q.make();
    var n = q.getModuleCount(), m = 4, size = n + m * 2, d = "";
    for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) if (q.isDark(r, c)) d += "M" + (c + m) + " " + (r + m) + "h1v1h-1z";
    return '<svg viewBox="0 0 ' + size + " " + size + '" shape-rendering="crispEdges" role="img" aria-label="Código QR para enviar el mensaje desde su celular"><rect width="100%" height="100%" fill="#fff"/><path fill="#102D54" d="' + d + '"/></svg>';
  }
  // Versión compacta del mensaje para el QR (menos caracteres = código más fácil de escanear)
  function urlQR(texto) {
    var corto = texto.replace(/\*/g, "").replace(/•\s?/g, "- ").replace(/\n{2,}/g, "\n")
      .replace(/\nEntiendo que esta es una solicitud[\s\S]*$/, "");
    return "https://api.whatsapp.com/send?phone=" + WA + "&text=" + encodeURIComponent(corto).replace(/%20/g, "+");
  }
  var dlg = null;
  function mostrarAyudaPC(texto) {
    if (!dlg) {
      dlg = document.createElement("dialog");
      dlg.className = "wa-dialog";
      dlg.setAttribute("aria-labelledby", "wa-dialog-titulo");
      dlg.innerHTML =
        '<button type="button" class="wa-dialog__close" data-cerrar aria-label="Cerrar">×</button>' +
        '<h2 id="wa-dialog-titulo">Tu mensaje está listo</h2>' +
        '<p class="wa-dialog__lead">Elige cómo enviarlo a la clínica (' + (CFG.whatsappVisible || ("+" + WA)) + '):</p>' +
        '<div class="wa-dialog__grid">' +
          '<div class="wa-dialog__qr"><div data-qr class="wa-dialog__qrbox"></div><strong>Opción 1 · Desde tu celular</strong><span>Abre la cámara, escanea el código y pulsa <b>Enviar</b> en WhatsApp.</span></div>' +
          '<div class="wa-dialog__opts">' +
            '<a class="btn btn--wa btn--block" data-abrir target="_blank" rel="noopener">Opción 2 · Abrir WhatsApp en esta computadora</a>' +
            '<p class="wa-dialog__hint">Si no tienes WhatsApp instalado en la PC, te pedirá vincular tu WhatsApp con WhatsApp Web.</p>' +
            '<button type="button" class="btn btn--outline btn--block" data-copiar>Copiar mensaje</button>' +
            '<a class="btn btn--outline btn--block" href="tel:' + ((CFG.prefijo || "+507") + (CFG.telefono || "")).replace(/[^\d+]/g, "") + '">Llamar al ' + (CFG.telefono || "") + '</a>' +
          "</div>" +
        "</div>" +
        '<p class="wa-dialog__note">Tu solicitud no es una cita confirmada: la clínica te confirmará la fecha y la hora.</p>';
      document.body.appendChild(dlg);
      dlg.addEventListener("click", function (e) {
        if (e.target === dlg || e.target.closest("[data-cerrar]")) dlg.close();
      });
    }
    var abrir = dlg.querySelector("[data-abrir]");
    abrir.href = waUrl(texto);
    abrir.onclick = function () { setTimeout(function () { dlg.close(); }, 300); };
    var copiar = dlg.querySelector("[data-copiar]");
    copiar.textContent = "Copiar mensaje";
    copiar.onclick = function () {
      var ok = function () { copiar.textContent = "¡Mensaje copiado!"; };
      if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(texto).then(ok, function () {});
      else { var ta = document.createElement("textarea"); ta.value = texto; document.body.appendChild(ta); ta.select(); try { document.execCommand("copy"); ok(); } catch (e) {} ta.remove(); }
    };
    var box = dlg.querySelector("[data-qr]");
    box.innerHTML = '<span class="wa-dialog__loading">Generando código…</span>';
    cargarQR(function (err) {
      box.innerHTML = err ? '<span class="wa-dialog__loading">No se pudo generar el código. Usa la opción 2.</span>' : qrSVG(urlQR(texto));
    });
    if (typeof dlg.showModal === "function") dlg.showModal(); else window.open(waUrl(texto), "_blank", "noopener");
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

/* ---------- Carrusel de imágenes ---------- */
(function () {
  "use strict";
  var reducido = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  document.querySelectorAll("[data-slider]").forEach(function (el) {
    var slides = el.querySelectorAll(".slider__slide");
    if (slides.length < 2) return;
    var dots = el.querySelectorAll("[data-slider-dot]");
    var pauseBtn = el.querySelector("[data-slider-pause]");
    var ms = parseInt(el.getAttribute("data-intervalo"), 10) || 5000;
    var i = 0, timer = null, pausadoUsuario = reducido;

    function ir(n) {
      i = (n + slides.length) % slides.length;
      slides.forEach(function (s, k) {
        var act = k === i;
        s.classList.toggle("is-active", act);
        if (act) { s.removeAttribute("aria-hidden"); var img = s.querySelector("img"); if (img) img.loading = "eager"; }
        else s.setAttribute("aria-hidden", "true");
      });
      dots.forEach(function (d, k) {
        d.classList.toggle("is-active", k === i);
        if (k === i) d.setAttribute("aria-current", "true"); else d.removeAttribute("aria-current");
      });
      // precargar la siguiente
      var sig = slides[(i + 1) % slides.length].querySelector("img"); if (sig) sig.loading = "eager";
    }
    function parar() { clearInterval(timer); timer = null; }
    function iniciar() { parar(); if (!pausadoUsuario && !document.hidden) timer = setInterval(function () { ir(i + 1); }, ms); }
    function actualizarPausa() {
      el.classList.toggle("is-paused", pausadoUsuario);
      if (pauseBtn) pauseBtn.setAttribute("aria-label", pausadoUsuario ? "Reanudar carrusel" : "Pausar carrusel");
    }

    var prev = el.querySelector("[data-slider-prev]"), next = el.querySelector("[data-slider-next]");
    if (prev) prev.addEventListener("click", function () { ir(i - 1); iniciar(); });
    if (next) next.addEventListener("click", function () { ir(i + 1); iniciar(); });
    dots.forEach(function (d) { d.addEventListener("click", function () { ir(+d.getAttribute("data-slider-dot")); iniciar(); }); });
    if (pauseBtn) pauseBtn.addEventListener("click", function () { pausadoUsuario = !pausadoUsuario; actualizarPausa(); iniciar(); });

    el.addEventListener("mouseenter", parar);
    el.addEventListener("mouseleave", iniciar);
    el.addEventListener("focusin", parar);
    el.addEventListener("focusout", iniciar);
    document.addEventListener("visibilitychange", iniciar);

    // Deslizar con el dedo
    var x0 = null;
    el.addEventListener("touchstart", function (e) { x0 = e.touches[0].clientX; parar(); }, { passive: true });
    el.addEventListener("touchend", function (e) {
      if (x0 === null) return;
      var dx = e.changedTouches[0].clientX - x0; x0 = null;
      if (Math.abs(dx) > 40) ir(dx < 0 ? i + 1 : i - 1);
      iniciar();
    }, { passive: true });

    actualizarPausa(); iniciar();
  });
})();
