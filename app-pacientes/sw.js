/* Mi control de salud – permite abrir la aplicación sin internet.
   Los datos del paciente NO pasan por aquí: viven en el teléfono (localStorage / IndexedDB). */
var CACHE = "cmla-mi-salud-v1";
var BASE = new URL(self.registration.scope).pathname; // p. ej. /centro-medico-los-andes/

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.add(BASE); }).then(function () { return self.skipWaiting(); }));
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
