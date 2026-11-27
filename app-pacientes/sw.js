/* Mi control de salud – permite abrir la aplicación sin internet.
   Los datos del paciente NO pasan por aquí: viven en el teléfono (localStorage / IndexedDB). */
// No cambie CACHE en cada versión: al activarse borra las cachés anteriores. Actualice PRECACHE (los ?v= deben
// coincidir con index.html); cambiar este archivo basta para que el teléfono instale el trabajador nuevo.
var CACHE = "cmla-mi-salud-v1";
var BASE = new URL(self.registration.scope).pathname; // p. ej. /centro-medico-los-andes/
var PRECACHE = [
  "", "assets/alimentos.json",
  "assets/sitio.css?v=1", "assets/app.css?v=7", "assets/nutri.js?v=4", "assets/app.js?v=9",
  "assets/logo.jpg", "iconos/favicon.svg", "iconos/icono-180.png", "iconos/icono-192.png", "manifest.webmanifest"
];

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(PRECACHE.map(function (u) { return BASE + u; })); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (ks) {
      return Promise.all(ks.filter(function (k) { return k.indexOf("cmla-mi-salud") === 0 && k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (e) {
  var r = e.request;
  if (r.method !== "GET") return;
  var u = new URL(r.url);
  if (u.origin !== self.location.origin || u.pathname.indexOf(BASE) !== 0) return;

  // Página: primero internet (para recibir actualizaciones); sin conexión, la copia guardada.
  if (r.mode === "navigate") {
    e.respondWith(
      fetch(r).then(function (res) {
        if (res.ok) { var copia = res.clone(); caches.open(CACHE).then(function (c) { c.put(BASE, copia); }); }
        return res;
      }).catch(function () { return caches.match(BASE); })
    );
    return;
  }

  // Estilos, scripts e imágenes: copia guardada al instante y se actualiza en segundo plano.
  e.respondWith(
    caches.open(CACHE).then(function (c) {
      return c.match(r).then(function (hit) {
        var red = fetch(r).then(function (res) { if (res.ok) c.put(r, res.clone()); return res; }).catch(function () { return hit; });
        return hit || red;
      });
    })
  );
});
