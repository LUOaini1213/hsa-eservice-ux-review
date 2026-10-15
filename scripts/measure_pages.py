"""Measure the published prototype's response time the same way as the HSA pages
(median of 3 GETs of the HTML, see scripts/fetch_sources.py) and record it in
data/klm/measured.json. Local-only (needs network)."""
from __future__ import annotations

import json
import statistics
import sys
import time
from datetime import datetime, timezone
from pathlib import Path

import requests

ROOT = Path(__file__).resolve().parents[1]
URL = "https://luoaini1213.github.io/hsa-eservice-ux-review/"
UA = {"User-Agent": "Mozilla/5.0 (independent UX review from public pages; github.com/LUOaini1213/hsa-eservice-ux-review)"}


def main() -> int:
    times = []
    for _ in range(3):
        t0 = time.perf_counter()
        r = requests.get(URL, headers=UA, timeout=60)
        times.append(time.perf_counter() - t0)
        r.raise_for_status()
        time.sleep(0.5)
    out = {
        "_note": "Median of 3 GETs of the published prototype page, measured with scripts/measure_pages.py after deployment, same method as evidence/sources.csv.",
        "url": URL,
        "measuredUtc": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "samplesSeconds": [round(t, 3) for t in times],
        "pagesMedianResponseSeconds": round(statistics.median(times), 3),
    }
    (ROOT / "data" / "klm" / "measured.json").write_text(json.dumps(out, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(out, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
