const { chromium } = require("playwright");
const { spawn } = require("child_process");
const path = require("path");
const [,, out="video.mp4", DUR="38", FPS="30", only] = process.argv;
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  await p.goto("file://" + path.resolve("index.html"));
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(800);
  await p.evaluate(() => document.getAnimations().forEach(a => a.pause()));
  const setT = (ms) => p.evaluate((ms) => document.getAnimations().forEach(a => a.currentTime = ms), ms);
  if (only) { for (const s of only.split(",")) { await setT(+s*1000); await p.screenshot({ path: `prev_${s}.png` }); } await b.close(); return; }
  const ff = spawn("ffmpeg", ["-y","-loglevel","error","-f","image2pipe","-framerate",FPS,"-i","-","-c:v","libx264","-pix_fmt","yuv420p","-crf","18","-preset","medium",out], { stdio: ["pipe","inherit","inherit"] });
  const N = Math.round(+DUR * +FPS);
  for (let i = 0; i < N; i++) {
    await setT(i * 1000 / +FPS);
    const buf = await p.screenshot({ type: "jpeg", quality: 92 });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once("drain", r));
  }
  ff.stdin.end(); await new Promise(r => ff.on("close", r)); await b.close();
})();
