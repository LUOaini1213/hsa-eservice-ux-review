"""Summarise the decision trees embedded in HSA's public self-help tools (S18, S19, S20).

Reads the page payloads saved by scripts/fetch_sources.py and writes
evidence/selfhelp-trees.json: number of question nodes, result nodes, the
longest question path, the progress total the page displays, and every link
target found in result texts. Local-only (snapshots are not committed).
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SNAP = ROOT / "evidence" / "snapshots"


def is_md_tree(payload: str) -> dict:
    objs = re.findall(r'\{"qid":"[^"]+".*?\}(?=,\{"qid"|\])', payload, flags=re.S)
    nodes = {o["qid"]: o for o in (json.loads(x) for x in objs)}
    questions = {k: v for k, v in nodes.items() if v.get("ans1") not in (None, "null")}

    def longest(qid: str, seen: frozenset = frozenset()) -> int:
        n = questions.get(qid)
        if n is None or qid in seen:
            return 0
        return 1 + max(longest(n["ans1_next"], seen | {qid}), longest(n["ans2_next"], seen | {qid}))

    linking = sum(1 for k, v in nodes.items() if k not in questions and "/hsa/mdc/medical-devices" in v.get("question", ""))
    return {"nodes": len(nodes), "questions": len(questions), "results": len(nodes) - len(questions), "resultsLinkingToRequirementsTool": linking, "longestQuestionPath": longest("1")}


def structured_tree(payload: str) -> dict:
    i = payload.find('{"data":{"startQuestion"')
    obj, _ = json.JSONDecoder().raw_decode(payload[i:])
    data = obj["data"]
    qs, results = data["questions"], data["results"]

    def longest(qid: str, seen: frozenset = frozenset()) -> int:
        q = qs.get(qid)
        if q is None or qid in seen:
            return 0
        return 1 + max((longest(o.get("next", ""), seen | {qid}) for o in q.get("options", [])), default=0)

    linking = sum(1 for r in results.values() if "/hsa/mdc/medical-devices" in json.dumps(r))
    return {"questions": len(qs), "results": len(results), "resultsLinkingToRequirementsTool": linking, "longestQuestionPath": longest(data["startQuestion"])}


def main() -> int:
    out = {}
    for sid in ("S18", "S19", "S20"):
        payload = (SNAP / f"{sid}.rsc.txt").read_text(encoding="utf-8")
        text = (SNAP / f"{sid}.txt").read_text(encoding="utf-8")
        summary = is_md_tree(payload) if sid == "S18" else structured_tree(payload)
        shown = re.search(r"Question 1 of (\d+)", text)
        summary["progressTotalShown"] = int(shown.group(1)) if shown else None
        summary["linkTargetsInResults"] = sorted(set(re.findall(r"\]\((/hsa/[^)\s]+)\)", payload)))
        out[sid] = summary
    (ROOT / "evidence" / "selfhelp-trees.json").write_text(json.dumps(out, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(out, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
