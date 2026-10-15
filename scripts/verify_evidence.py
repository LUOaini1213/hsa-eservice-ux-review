"""Check every quote and link in data/evidence.csv against the fetched snapshots.

Local-only (needs evidence/snapshots from scripts/fetch_sources.py). Writes
evidence/verification.txt, which is committed as the record of the check.
'data' rows are checked in CI by tests/evidence.test.mjs instead.
"""
from __future__ import annotations

import csv
import sys
from pathlib import Path

from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1]
SNAP = ROOT / "evidence" / "snapshots"


def norm(s: str) -> str:
    return " ".join(s.replace("​", "").replace("\xa0", " ").split())


def main() -> int:
    sources = {r["id"]: r for r in csv.DictReader(open(ROOT / "evidence" / "sources.csv", encoding="utf-8"))}
    links = list(csv.DictReader(open(ROOT / "evidence" / "link-audit.csv", encoding="utf-8")))
    rows = list(csv.DictReader(open(ROOT / "data" / "evidence.csv", encoding="utf-8")))
    out, bad = [], 0
    for i, r in enumerate(rows, start=2):
        sid, kind, ev, target = r["source_id"], r["type"], norm(r["evidence"]), r["target"]
        ok, detail = True, ""
        if kind == "quote":
            text = norm((SNAP / f"{sid}.txt").read_text(encoding="utf-8"))
            ok = ev in text
        elif kind == "html":
            soup = BeautifulSoup((SNAP / f"{sid}.html").read_text(encoding="utf-8"), "html.parser")
            ok = ev in norm(soup.get_text(" "))
        elif kind == "link":
            # The link audit drops #fragments (a hash-bang route keeps only the host part).
            hits = [l for l in links if l["source_id"] == sid and ev in norm(l["link_text"]) and (not target or l["href"].rstrip("/") == target.split("#")[0].rstrip("/"))]
            ok = bool(hits)
            detail = f" -> HTTP {hits[0]['status']} {hits[0]['final_url']}" if hits else ""
        elif kind == "data":
            detail = " (checked in CI by tests/evidence.test.mjs)"
        else:
            ok, detail = False, " unknown type"
        when = sources[sid]["fetched_utc"] if sid in sources else ""
        out.append(f"{'PASS' if ok else 'FAIL'} line {i} {r['issue_id']} {sid or '-'} {kind}{detail} [{when}] {ev[:90]}")
        bad += 0 if ok else 1
    summary = f"{len(rows) - bad}/{len(rows)} evidence rows verified against snapshots fetched {min(s['fetched_utc'] for s in sources.values())} to {max(s['fetched_utc'] for s in sources.values())}."
    (ROOT / "evidence" / "verification.txt").write_text(summary + "\n" + "\n".join(out) + "\n", encoding="utf-8")
    print(summary)
    for line in out:
        if line.startswith("FAIL"):
            print(line)
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
