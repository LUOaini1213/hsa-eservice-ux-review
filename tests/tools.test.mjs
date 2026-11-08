import test from "node:test";
import assert from "node:assert/strict";
import { findChrome } from "../scripts/find-chrome.mjs";

const only = (...paths) => (p) => paths.includes(p);

test("findChrome: CHROME wins, then platform locations, then PATH; null when nothing exists", () => {
  assert.equal(findChrome({ CHROME: "/x/chrome" }, "linux", () => false), "/x/chrome");
  assert.equal(findChrome({ PATH: "/usr/local/bin:/usr/bin" }, "linux", only("/usr/bin/chromium")), "/usr/bin/chromium");
  assert.equal(findChrome({ PATH: "/a:/b" }, "linux", only("/b/google-chrome", "/a/chromium")), "/a/chromium", "PATH order first");
  assert.equal(findChrome({ PATH: "/usr/bin" }, "linux", () => false), null);
  assert.equal(findChrome({}, "linux", () => true), null, "empty PATH");
  const win = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
  assert.equal(findChrome({ PROGRAMFILES: "C:\\Program Files" }, "win32", only(win)), win);
  assert.equal(findChrome({ PROGRAMFILES: "C:\\Program Files" }, "win32", () => false), null);
  assert.equal(findChrome({}, "darwin", only("/Applications/Chromium.app/Contents/MacOS/Chromium")), "/Applications/Chromium.app/Contents/MacOS/Chromium");
});
