/**
 * Graba la página HTML animada del reel cuadro por cuadro (determinista).
 * Uso: HTML=reel.html [DSF=2] [FROM=0 TO=n] node grabar.cjs video salida.mp4 30
 *      HTML=reel.html node grabar.cjs fotos 4 12.5 30   -> f-<t>.jpg para revisar
 * La página debe exponer window.reel.TOTAL (segundos) y usar animaciones CSS/WAAPI.
 */
const { spawn } = require("node:child_process");
const path = require("node:path");
const { chromium } = require("playwright");
const [,, modo, salida, fpsArg] = process.argv; // modo: "fotos" o "video"
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: +(process.env.DSF || 1) });
  await p.goto("file://" + path.resolve(process.env.HTML || "reel-dengue.html"));
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(500);
  const TOTAL = await p.evaluate(() => { window.__a = document.getAnimations(); window.__a.forEach(a => a.pause()); return window.reel.TOTAL; });
  const seek = (t) => p.evaluate((t) => { document.getAnimations().forEach(a => { a.pause(); a.currentTime = t; }); }, t);
  if (modo === "fotos") {
    const ts = process.argv.slice(3).map(Number);
    for (const t of ts) { await seek(t * 1000); await p.screenshot({ path: `f-${t}.jpg`, type: "jpeg", quality: 80 }); }
  } else {
    const FPS = +(fpsArg || 30);
    const ff = spawn("ffmpeg", ["-y","-loglevel","error","-f","image2pipe","-framerate",String(FPS),"-c:v","mjpeg","-i","-","-c:v","libx264","-preset","fast","-crf","18","-pix_fmt","yuv420p","-movflags","+faststart",salida], { stdio: ["pipe","inherit","inherit"] });
    const n = Math.round(TOTAL * FPS);
    const F0 = +(process.env.FROM || 0), F1 = Math.min(n, +(process.env.TO || n));
    for (let f = F0; f < F1; f++) {
      await seek((f * 1000) / FPS);
      const buf = await p.screenshot({ type: "jpeg", quality: 92 });
      if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once("drain", r));
      if (f % 300 === 0) console.log(`cuadro ${f}/${F1}`);
    }
    ff.stdin.end(); await new Promise(r => ff.on("close", r));
  }
  console.log("TOTAL", TOTAL); await b.close();
})();
