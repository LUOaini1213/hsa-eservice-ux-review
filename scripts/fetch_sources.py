"""Fetch every public source listed in evidence/sources.json, measure it, and audit its links.

Local-only (needs network). Writes:
  evidence/snapshots/<ID>.<ext> and <ID>.txt   (gitignored: page copies are not redistributed)
  evidence/sources.csv                         (id, url, final URL, HTTP status, SHA-256, bytes, words,
                                                median response seconds over 3 GETs, fetch time UTC)
  evidence/link-audit.csv                      (every link found in the HSA pages and where it ends up)

Nothing is submitted: every request is a plain GET of a public URL, no cookies, no log-in.
"""
from __future__ import annotations

import csv
import hashlib
import io
import json
import re
import statistics
import subprocess
import sys
import time
import urllib.parse
import zipfile
from datetime import datetime, timezone
from pathlib import Path

import requests
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1]
EVID = ROOT / "evidence"
SNAP = EVID / "snapshots"
UA = {"User-Agent": "Mozilla/5.0 (independent UX review from public pages; github.com/LUOaini1213/hsa-eservice-ux-review)"}
EXT = {"html": "html", "pdf": "pdf", "docx": "docx", "xml": "xml", "formsg": "json"}


def norm(s: str) -> str:
    s = s.replace("​", "").replace("\xa0", " ")
    return " ".join(s.split())


def html_text(raw: bytes) -> tuple[str, BeautifulSoup]:
    soup = BeautifulSoup(raw.decode("utf-8", errors="replace"), "html.parser")
    for t in soup(["script", "style", "noscript", "svg"]):
        t.decompose()
    main = soup.find("main") or soup.body or soup
    return norm(main.get_text(" ")), main


def rsc_payload(raw: bytes) -> str:
    """Next.js pages carry their data in self.__next_f.push([1,"..."]) strings."""
    h = raw.decode("utf-8", errors="replace")
    parts = re.findall(r'self\.__next_f\.push\(\[1,"(.*?)"\]\)', h, flags=re.S)
    out = []
    for p in parts:
        try:
            out.append(json.loads('"' + p + '"'))
        except json.JSONDecodeError:
            pass
    return "".join(out)


def pdf_text(path: Path) -> str:
    try:
        return norm(subprocess.run(["pdftotext", "-layout", str(path), "-"], capture_output=True, check=True).stdout.decode("utf-8", "replace"))
    except (OSError, subprocess.CalledProcessError):
        return ""


def docx_text(raw: bytes) -> str:
    x = zipfile.ZipFile(io.BytesIO(raw)).read("word/document.xml").decode("utf-8")
    paras = re.findall(r"<w:p[ >].*?</w:p>", x, flags=re.S)
    return norm(" \n".join("".join(re.findall(r"<w:t[^>]*>([^<]*)</w:t>", p)) for p in paras))


def formsg_text(raw: bytes) -> str:
    f = json.loads(raw)["form"]
    bits = [f["title"]]
    for fld in f["form_fields"]:
        bits.append(f'{fld["title"]} [{fld["fieldType"]}{", required" if fld.get("required") else ", optional"}]')
        bits.append(fld.get("description") or "")
        if fld.get("fieldOptions"):
            bits.append(" / ".join(fld["fieldOptions"]))
    return norm(" ".join(bits))


def links_of(src: dict, raw: bytes) -> list[tuple[str, str]]:
    if src["kind"] != "html":
        return []
    _, main = html_text(raw)
    found = []
    for a in main.find_all("a", href=True):
        found.append((norm(a.get_text(" ")), urllib.parse.urljoin(src["final"], a["href"])))
    # Markdown links embedded in self-help tool data, e.g. [text](/hsa/mdc/...)
    for text, href in re.findall(r"\[([^\]]{1,120})\]\((/[^)\s]+|https?://[^)\s]+)\)", rsc_payload(raw)):
        found.append((norm(text), urllib.parse.urljoin(src["final"], href)))
    return found


def main() -> int:
    SNAP.mkdir(parents=True, exist_ok=True)
    sources = json.loads((EVID / "sources.json").read_text(encoding="utf-8"))
    rows, link_rows = [], []
    for src in sources:
        times, r = [], None
        for _ in range(3):
            t0 = time.perf_counter()
            r = requests.get(src["url"], headers=UA, timeout=60)
            times.append(time.perf_counter() - t0)
            time.sleep(0.5)
        raw = r.content
        src["final"] = r.url
        ext = EXT[src["kind"]]
        (SNAP / f'{src["id"]}.{ext}').write_bytes(raw)
        if src["kind"] == "html":
            text = html_text(raw)[0]
            payload = rsc_payload(raw)
            if payload:
                (SNAP / f'{src["id"]}.rsc.txt').write_text(payload, encoding="utf-8")
        elif src["kind"] == "pdf":
            text = pdf_text(SNAP / f'{src["id"]}.pdf')
        elif src["kind"] == "docx":
            text = docx_text(raw)
        elif src["kind"] == "formsg":
            text = formsg_text(raw)
        else:
            text = norm(raw.decode("utf-8", "replace"))
        (SNAP / f'{src["id"]}.txt').write_text(text, encoding="utf-8")
        rows.append({
            "id": src["id"], "title": src["title"], "url": src["url"], "final_url": r.url,
            "status": r.status_code, "sha256": hashlib.sha256(raw).hexdigest(), "bytes": len(raw),
            "words": len(text.split()), "median_response_s": round(statistics.median(times), 3),
            "fetched_utc": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        })
        print(src["id"], r.status_code, rows[-1]["words"], "words", rows[-1]["median_response_s"], "s", file=sys.stderr)
        if src["id"].startswith("S"):
            for text_, href in links_of(src, raw):
                link_rows.append({"source_id": src["id"], "link_text": text_[:160], "href": href})

    with open(EVID / "sources.csv", "w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=list(rows[0]))
        w.writeheader()
        w.writerows(rows)

    # Link audit: resolve every distinct http(s) link once.
    cache: dict[str, tuple[int | str, str]] = {}
    for lr in link_rows:
        href = lr["href"].split("#")[0] if lr["href"].split("#")[0] else lr["href"]
        lr["href"] = href
        if not href.startswith("http"):
            lr["status"], lr["final_url"] = "skipped", ""
            continue
        if href not in cache:
            try:
                rr = requests.get(href, headers=UA, timeout=30, allow_redirects=True, stream=True)
                cache[href] = (rr.status_code, rr.url)
                rr.close()
            except requests.RequestException as e:
                cache[href] = (f"error:{type(e).__name__}", "")
            time.sleep(0.3)
        lr["status"], lr["final_url"] = cache[href]
    seen, uniq = set(), []
    for lr in link_rows:
        key = (lr["source_id"], lr["link_text"], lr["href"])
        if key not in seen:
            seen.add(key)
            uniq.append(lr)
    with open(EVID / "link-audit.csv", "w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=["source_id", "link_text", "href", "status", "final_url"])
        w.writeheader()
        w.writerows(uniq)
    print(f"{len(rows)} sources, {len(uniq)} links ({len(cache)} distinct targets)", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(main())
