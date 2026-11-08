// Locate a Chrome or Chromium executable for scripts/screenshots.mjs (pure, so it can be unit tested).
import { existsSync } from "node:fs";
import { win32, posix } from "node:path";

/**
 * CHROME from the environment wins; otherwise the usual install locations for the platform
 * (Windows, macOS) or the first of google-chrome, google-chrome-stable, chromium,
 * chromium-browser on PATH (Linux and others). Returns null when nothing is found.
 */
export function findChrome(env = process.env, platform = process.platform, exists = existsSync) {
  if (env.CHROME) return env.CHROME;
  let candidates;
  if (platform === "win32") {
    candidates = [env.PROGRAMFILES, env["PROGRAMFILES(X86)"], env.LOCALAPPDATA]
      .filter(Boolean).map((d) => win32.join(d, "Google", "Chrome", "Application", "chrome.exe"));
  } else if (platform === "darwin") {
    candidates = ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/Applications/Chromium.app/Contents/MacOS/Chromium"];
  } else {
    candidates = (env.PATH || "").split(":").filter(Boolean).flatMap((d) =>
      ["google-chrome", "google-chrome-stable", "chromium", "chromium-browser"].map((n) => posix.join(d, n)));
  }
  return candidates.find((c) => exists(c)) ?? null;
}
