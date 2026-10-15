// Local-only: capture evidence screenshots with headless Chrome over the DevTools protocol.
// Outlines are drawn around the element in question and a caption marked
// "Reviewer annotation" is added; page content is otherwise unchanged.
//   CHROME="C:/Program Files/Google/Chrome/Application/chrome.exe" node scripts/screenshots.mjs
import { spawn } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname, resolve, extname } from "node:path";
import { fileURLToPath } from "node:url";
import http from "node:http";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "evidence", "screenshots");
const chromePath = process.env.CHROME || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const port = 9333;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Static server for the prototype (ES modules do not load from file://).
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css" };
const server = http.createServer((req, res) => {
  const p = join(root, "docs", decodeURIComponent(new URL(req.url, "http://x").pathname).replace(/^\/$/, "/index.html"));
  if (!p.startsWith(join(root, "docs")) || !existsSync(p)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { "content-type": types[extname(p)] || "application/octet-stream" });
  res.end(readFileSync(p));
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const local = `http://127.0.0.1:${server.address().port}/`;

const profile = mkdtempSync(join(tmpdir(), "shots-"));
const chrome = spawn(chromePath, ["--headless=new", `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, "--window-size=1280,900", "--hide-scrollbars", "--no-first-run", "--no-default-browser-check", "about:blank"], { stdio: "ignore" });

async function cdp() {
  for (let i = 0; i < 50; i++) {
    try { const v = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json(); return v.webSocketDebuggerUrl; } catch { await sleep(200); }
  }
  throw new Error("Chrome did not start");
}

// hsa.gov.sg and form.gov.sg answer headless Chrome with HTTP 403 (CloudFront), and this review
// does not work around bot protection. Those screenshots (A-01, A-02 tools page, A-07, B-07) were
// taken in an ordinary browser window instead; see evidence/screenshots/README.md.
const shots = [
  { file: "A-02-selfhelp-404.png", url: "https://selfhelp.hsa.gov.sg/hsa/mdc/medical-devices", find: null },
  { file: "A-11-question-1-of-15.png", url: "https://selfhelp.hsa.gov.sg/hsa/mdc/is-medical-device", find: "Question 1 of 15", note: () => "Reviewer annotation: the tree has 12 questions; the longest path asks 11" },
  { file: "proto-question.png", url: local, find: null, proto: "question" },
  { file: "proto-result.png", url: local, find: null, proto: "result" },
];

const P1 = [["activities", ["import", "wholesale"]], ["acra", ["yes"]], ["deviceClass", ["B"]], ["special", ["none"]], ["approvals", ["FDA"]], ["marketed3y", ["yes"]], ["safety", ["no"]], ["rejection", ["no"]]];

async function main() {
  const ws = new WebSocket(await cdp());
  await new Promise((r) => ws.addEventListener("open", r, { once: true }));
  let id = 0;
  const pending = new Map();
  ws.addEventListener("message", (m) => {
    const msg = JSON.parse(m.data);
    if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
  });
  const send = (method, params = {}, sessionId) => new Promise((res, rej) => {
    const n = ++id;
    pending.set(n, (msg) => (msg.error ? rej(new Error(`${method}: ${msg.error.message}`)) : res(msg.result)));
    ws.send(JSON.stringify({ id: n, method, params, sessionId }));
  });
  const { targetId } = await send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
  const s = (m, p) => send(m, p, sessionId);
  await s("Page.enable");
  await s("Emulation.setDeviceMetricsOverride", { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
  const evaluate = async (expr) => (await s("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true })).result.value;

  for (const shot of shots) {
    await s("Page.navigate", { url: shot.url });
    await sleep(6000);
    if (shot.proto === "result") {
      for (const [q, vals] of P1) {
        await evaluate(`(() => { for (const v of ${JSON.stringify(vals)}) document.querySelector('input[name="${q}"][value="' + v + '"]').click(); document.querySelector('button[type=submit]').click(); })()`);
        await sleep(150);
      }
    } else if (shot.proto === "question") {
      await evaluate(`(() => { document.querySelector('input[value="import"]').click(); document.querySelector('input[value="wholesale"]').click(); document.querySelector('button[type=submit]').click(); document.querySelector('input[value="yes"]').click(); document.querySelector('button[type=submit]').click(); document.querySelector('input[value="B"]').click(); document.querySelector('button[type=submit]').click(); document.querySelector('input[value="none"]').click(); document.querySelector('button[type=submit]').click(); document.querySelector('input[value="FDA"]').click(); })()`);
    }
    let clip;
    if (shot.find) {
      const rect = await evaluate(`(() => {
        const want = ${JSON.stringify(shot.find)};
        const all = [...document.querySelectorAll('a, button, p, span, label, h1, h2, h3, div, td')];
        const el = all.filter(e => (e.innerText || '').trim().startsWith(want)).sort((a, b) => a.innerText.length - b.innerText.length)[0];
        if (!el) return null;
        el.scrollIntoView({ block: 'center' });
        el.style.outline = '4px solid #d00';
        el.style.outlineOffset = '3px';
        const href = el.closest('a') ? el.closest('a').getAttribute('href') : '';
        const note = document.createElement('div');
        note.textContent = ${JSON.stringify("")} + (${shot.note ? shot.note.toString() : "() => ''"})(href);
        note.style.cssText = 'position:absolute;z-index:99999;background:#d00;color:#fff;font:600 15px/1.3 Arial,sans-serif;padding:6px 10px;border-radius:4px;max-width:640px';
        const r = el.getBoundingClientRect();
        note.style.left = (r.left + window.scrollX) + 'px';
        note.style.top = (r.bottom + window.scrollY + 12) + 'px';
        if (note.textContent) document.body.appendChild(note);
        const n = note.getBoundingClientRect();
        return { x: 0, y: Math.max(0, r.top + window.scrollY - 220), width: 1280, height: Math.min(560, (note.textContent ? n.bottom : r.bottom) - r.top + 260) };
      })()`);
      if (!rect) { console.error(`Not found on page: ${shot.find} (${shot.file})`); continue; }
      clip = { ...rect, scale: 1 };
      await sleep(300);
    }
    const shotRes = await s("Page.captureScreenshot", { format: "png", ...(clip ? { clip } : {}), captureBeyondViewport: !!clip });
    writeFileSync(join(outDir, shot.file), Buffer.from(shotRes.data, "base64"));
    console.log("saved", shot.file);
  }
  await send("Browser.close").catch(() => {});
  ws.close();
}

main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(async () => {
  server.close();
  if (chrome.exitCode === null) chrome.kill();
  await sleep(1000);
  try { rmSync(profile, { recursive: true, force: true }); } catch {}
});
