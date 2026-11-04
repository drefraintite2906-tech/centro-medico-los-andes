/* Modo TV: avance automático, bucle infinito, reloj de Panamá y escalado a la pantalla.
   ?grabar=1  -> sin avance automático ni reloj; expone window.tv para generar el video. */
(function () {
  "use strict";
  var params = new URLSearchParams(location.search);
  var grabar = params.get("grabar") === "1";
  var stage = document.querySelector("[data-stage]");
  var bar = document.querySelector("[data-progress]");
  var reloj = document.querySelector("[data-clock]");

  function ajustar() {
    var s = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
    stage.style.transform = "scale(" + s + ")";
  }
  window.addEventListener("resize", ajustar); ajustar();

  function ahoraPanama() { var d = new Date(); return new Date(d.getTime() + d.getTimezoneOffset() * 60000 - 5 * 3600000); }
  function isoLocal(d) { return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"); }

  // Quitar promociones vencidas o futuras
  var hoy = isoLocal(ahoraPanama());
  document.querySelectorAll(".slide[data-hasta], .slide[data-desde]").forEach(function (s) {
    var h = s.getAttribute("data-hasta"), d = s.getAttribute("data-desde");
    if ((h && h < hoy) || (d && d > hoy)) s.remove();
  });

  var slides = Array.prototype.slice.call(document.querySelectorAll(".slide"));
  var i = -1, timer = null;

  function mostrar(n) {
    var prev = slides[i];
    i = (n + slides.length) % slides.length;
    var act = slides[i];
    if (prev && prev !== act) prev.classList.remove("is-active");
    // reiniciar animaciones
    act.classList.remove("is-active"); void act.offsetWidth; act.classList.add("is-active");
    var dur = (parseFloat(act.getAttribute("data-dur")) || 9) * 1000;
    if (bar) {
      bar.style.transition = "none"; bar.style.width = "0";
      void bar.offsetWidth;
      bar.style.transition = "width " + dur + "ms linear"; bar.style.width = "100%";
    }
    return dur;
  }

  function ciclo() { var d = mostrar(i + 1); timer = setTimeout(ciclo, d); }

  if (reloj) {
    if (grabar) reloj.remove();
    else {
      var tick = function () {
        var d = ahoraPanama(), h = d.getHours(), m = String(d.getMinutes()).padStart(2, "0");
        reloj.textContent = ((h % 12) || 12) + ":" + m + (h < 12 ? " a. m." : " p. m.");
      };
      tick(); setInterval(tick, 15000);
    }
  }

  // API para la grabación del video
  window.tv = {
    total: slides.length,
    duraciones: slides.map(function (s) { return parseFloat(s.getAttribute("data-dur")) || 9; }),
    mostrar: mostrar
  };

  if (!grabar) {
    // Recargar cada 6 horas para tomar cambios del panel
    setTimeout(function () { location.reload(); }, 6 * 3600 * 1000);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(ciclo); else ciclo();
  }
})();
