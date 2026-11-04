/**
 * Genera el video MP4 (1920x1080, 30 fps) de la presentación de sala de espera (/tv/).
 * Uso:  npm run video:tv            -> material-impreso/video-sala-espera.mp4
 *       node herramientas/grabar-video-tv.cjs [salida.mp4] [fps]
 * Requisitos: Node 20+, Playwright con Chromium y ffmpeg con libx264.
 * Cómo funciona: compila el sitio, lo sirve localmente, abre /tv/?grabar=1 y, para cada
 * diapositiva, congela las animaciones y avanza su tiempo cuadro a cuadro (resultado fluido
 * y determinista, sin depender de la velocidad del equipo).
 */
const { execSync, spawn } = require("node:child_process");
const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("playwright");

const RAIZ = path.resolve(__dirname, "..");
const SITE = path.join(RAIZ, "_site");
const SALIDA = path.resolve(process.argv[2] || path.join(RAIZ, "material-impreso", "video-sala-espera.mp4"));
const FPS = parseInt(process.argv[3] || "30", 10);
const TIPOS = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp" };

function servir() {
  return new Promise((ok) => {
    const srv = http.createServer((req, res) => {
      let p = decodeURIComponent(req.url.split("?")[0]);
      let f = path.join(SITE, p);
      if (!f.startsWith(SITE)) { res.writeHead(403); return res.end(); }
      if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, "index.html");
      if (!fs.existsSync(f)) { res.writeHead(404); return res.end(); }
      res.writeHead(200, { "Content-Type": TIPOS[path.extname(f)] || "application/octet-stream" });
      fs.createReadStream(f).pipe(res);
    });
    srv.listen(0, "127.0.0.1", () => ok(srv));
  });
}

(async () => {
  console.log("1/4 Compilando el sitio…");
  execSync("npx @11ty/eleventy --quiet", { cwd: RAIZ, stdio: "inherit" });
  const srv = await servir();
  const url = `http://127.0.0.1:${srv.address().port}/tv/?grabar=1`;

  console.log("2/4 Abriendo la presentación…");
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
  await page.goto(url, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  const { total, duraciones } = await page.evaluate(() => ({ total: window.tv.total, duraciones: window.tv.duraciones }));
  const segundos = duraciones.reduce((a, b) => a + b, 0);
  console.log(`   ${total} diapositivas · ${segundos} s de video`);

  fs.mkdirSync(path.dirname(SALIDA), { recursive: true });
  const ff = spawn("ffmpeg", ["-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", String(FPS), "-c:v", "mjpeg", "-i", "-",
    "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-pix_fmt", "yuv420p", "-movflags", "+faststart", SALIDA], { stdio: ["pipe", "inherit", "inherit"] });

  console.log("3/4 Grabando cuadro por cuadro…");
  let cuadros = 0;
  for (let k = 0; k < total; k++) {
    await page.evaluate((k) => {
      window.tv.mostrar(k);
      window.__anims = document.getAnimations();
      window.__anims.forEach((a) => a.pause());
    }, k);
    const n = Math.round(duraciones[k] * FPS);
    for (let f = 0; f < n; f++) {
      const t = (f * 1000) / FPS;
      await page.evaluate((t) => window.__anims.forEach((a) => { a.currentTime = t; }), t);
      const buf = await page.screenshot({ type: "jpeg", quality: 92 });
      if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once("drain", r));
      cuadros++;
    }
    process.stdout.write(`   diapositiva ${k + 1}/${total} lista\n`);
  }
  ff.stdin.end();
  await new Promise((r) => ff.on("close", r));
  await browser.close(); srv.close();
  console.log(`4/4 Video listo: ${SALIDA} (${cuadros} cuadros, ${(fs.statSync(SALIDA).size / 1048576).toFixed(1)} MB)`);
})().catch((e) => { console.error(e); process.exit(1); });
