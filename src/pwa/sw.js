/* Mi control de salud – permite abrir la página sin internet.
   Los datos del paciente NO pasan por aquí: viven en el teléfono (localStorage / IndexedDB). */
var CACHE = "cmla-mi-salud-v1";

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.add("/mi-salud/"); }).then(function () { return self.skipWaiting(); }));
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
  if (u.origin !== self.location.origin) return;

  // Página: primero internet (para recibir actualizaciones); sin conexión, la copia guardada.
  if (r.mode === "navigate") {
    if (u.pathname.indexOf("/mi-salud/") !== 0) return;
    e.respondWith(
      fetch(r).then(function (res) {
        if (res.ok) { var copia = res.clone(); caches.open(CACHE).then(function (c) { c.put("/mi-salud/", copia); }); }
        return res;
      }).catch(function () { return caches.match("/mi-salud/"); })
    );
    return;
  }

  // Estilos, scripts e íconos: copia guardada al instante y se actualiza en segundo plano.
  if (u.pathname.indexOf("/assets/") === 0 || u.pathname === "/favicon.svg" || u.pathname.indexOf("/mi-salud/") === 0) {
    e.respondWith(
      caches.open(CACHE).then(function (c) {
        return c.match(r).then(function (hit) {
          var red = fetch(r).then(function (res) { if (res.ok) c.put(r, res.clone()); return res; }).catch(function () { return hit; });
          return hit || red;
        });
      })
    );
  }
});
