"""Check the evidence rows against Internet Archive (Wayback Machine) copies of the source pages.

The page copies used by scripts/verify_evidence.py are git-ignored, so nobody else can
re-run that check. This script uses public, third-party copies instead:

  python scripts/check_archives.py --discover   # find the latest Wayback copy (HTTP 200) of each
                                                # web-page source taken on or before the review
                                                # date and write evidence/archives.csv
  python scripts/check_archives.py              # fetch every copy in evidence/archives.csv, look
                                                # for each quote and link of data/evidence.csv in
                                                # it and write evidence/archive-verification.json

Local-only (needs network). Only reads public archive copies; it never asks the archive to
capture anything. A copy taken before the review shows that the text or link was already
there on that date; it says nothing about link targets (a 404 is shown by the link audit and
the screenshots, not by an archived copy of the page that links to it).
"""
from __future__ import annotations

import csv
import json
import re
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

import requests
from bs4 import BeautifulSoup

sys.path.insert(0, str(Path(__file__).resolve().parent))
from fetch_sources import UA, html_text, links_of, norm  # noqa: E402

ROOT = Path(__file__).resolve().parents[1]
REVIEW_DATE = "20261015"  # copies must be from this day or earlier
CDX = "https://web.archive.org/cdx/search/cdx"
ARCHIVES = ROOT / "evidence" / "archives.csv"
RECORD = ROOT / "evidence" / "archive-verification.json"
CACHE = ROOT / "evidence" / "snapshots" / "archive"  # git-ignored with the other page copies


def page_sources() -> dict[str, dict]:
    kinds = {s["id"]: s["kind"] for s in json.loads((ROOT / "evidence" / "sources.json").read_text(encoding="utf-8"))}
    rows = csv.DictReader(open(ROOT / "evidence" / "sources.csv", encoding="utf-8"))
    return {r["id"]: r for r in rows if kinds.get(r["id"]) == "html"}


def evidence_rows() -> list[dict]:
    rows = list(csv.DictReader(open(ROOT / "data" / "evidence.csv", encoding="utf-8")))
    for line, r in enumerate(rows, start=2):
        r["line"] = line
    return rows


def get(url: str, **kw) -> requests.Response:
    for attempt in range(6):
        try:
            r = requests.get(url, headers=UA, timeout=90, **kw)
            if r.status_code in (429, 502, 503, 504):
                raise requests.HTTPError(str(r.status_code))
            return r
        except requests.RequestException:
            if attempt == 5:
                raise
            time.sleep(20 * (attempt + 1))  # the archive refuses connections when asked too fast
    raise AssertionError("unreachable")


def discover() -> int:
    sources = page_sources()
    wanted = sorted({r["source_id"] for r in evidence_rows() if r["type"] in ("quote", "link", "html") and r["source_id"] in sources})
    out = []
    for sid in wanted:
        url = sources[sid]["url"]
        r = get(CDX, params={"url": url, "from": "2026", "to": REVIEW_DATE + "235959", "output": "json",
                             "fl": "timestamp,statuscode", "filter": "statuscode:200"})
        snaps = r.json()[1:] if r.text.strip() else []
        if snaps:
            ts = snaps[-1][0]
            out.append({"source_id": sid, "archive_url": f"https://web.archive.org/web/{ts}/{url}",
                        "archived_utc": datetime.strptime(ts, "%Y%m%d%H%M%S").strftime("%Y-%m-%dT%H:%M:%SZ")})
        print(sid, snaps[-1][0] if snaps else "no copy", file=sys.stderr)
        time.sleep(3)
    with open(ARCHIVES, "w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=["source_id", "archive_url", "archived_utc"], lineterminator="\n")
        w.writeheader()
        w.writerows(out)
    print(f"{len(out)} of {len(wanted)} web-page sources have a Wayback copy dated on or before {REVIEW_DATE}", file=sys.stderr)
    return 0


def verify() -> int:
    sources = page_sources()
    archives = list(csv.DictReader(open(ARCHIVES, encoding="utf-8")))
    ev = evidence_rows()
    out = []
    for a in archives:
        sid = a["source_id"]
        src_url = sources[sid]["url"]
        m = re.fullmatch(r"https://web\.archive\.org/web/(\d{14})/(.+)", a["archive_url"])
        if not m or m.group(2) != src_url:
            raise SystemExit(f"{sid}: archive_url does not point at {src_url}")
        cached = CACHE / f"{sid}-{m.group(1)}.html"
        if cached.exists():
            raw = cached.read_bytes()
        else:
            raw = get(f"https://web.archive.org/web/{m.group(1)}id_/{src_url}").content
            CACHE.mkdir(parents=True, exist_ok=True)
            cached.write_bytes(raw)
            time.sleep(5)
        text, _ = html_text(raw)
        soup_text = norm(BeautifulSoup(raw.decode("utf-8", "replace"), "html.parser").get_text(" "))
        links = links_of({"kind": "html", "final": src_url}, raw)
        for r in (x for x in ev if x["source_id"] == sid and x["type"] in ("quote", "link", "html")):
            e, target = norm(r["evidence"]), r["target"]
            if r["type"] == "quote":
                found = e in text
            elif r["type"] == "html":
                found = e in soup_text
            else:
                found = any(e in norm(t) and (not target or h.split("#")[0].rstrip("/") == target.split("#")[0].rstrip("/")) for t, h in links)
            out.append({"line": r["line"], "issue_id": r["issue_id"], "source_id": sid, "type": r["type"],
                        "archive_url": a["archive_url"], "found": found})
        print(sid, sum(o["found"] for o in out if o["source_id"] == sid), "of", sum(o["source_id"] == sid for o in out), file=sys.stderr)
    out.sort(key=lambda o: o["line"])
    record = {
        "_note": "Written by scripts/check_archives.py. found=true: the quote, or the link with that text and target, is in the archived copy.",
        "checked_utc": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "rows": out,
    }
    RECORD.write_text(json.dumps(record, indent=1) + "\n", encoding="utf-8", newline="\n")
    print(f"{sum(o['found'] for o in out)}/{len(out)} evidence rows found in archived copies", file=sys.stderr)
    return 0


if __name__ == "__main__":
    sys.exit(discover() if "--discover" in sys.argv else verify())
