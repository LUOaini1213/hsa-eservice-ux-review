// Integrity checks for the issue log, evidence table and generated documents.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { load, HEURISTICS, DSS, render } from "../scripts/render_issues.mjs";

const root = new URL("..", import.meta.url);
const { issues, evidence, sources } = load();
const results = JSON.parse(readFileSync(new URL("data/klm/results.json", root), "utf8"));
const trees = JSON.parse(readFileSync(new URL("evidence/selfhelp-trees.json", root), "utf8"));
const fmt = (n) => n.toLocaleString("en-SG");

test("issues: unique ids, valid severity, heuristics and DSS controls", () => {
  const ids = issues.map((i) => i.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const i of issues) {
    assert.match(i.id, /^[ABP]-\d\d$/, i.id);
    assert.ok(/^[0-4]$/.test(i.severity), `${i.id} severity ${i.severity}`);
    for (const h of i.heuristics.split(";").filter(Boolean)) assert.ok(h in HEURISTICS, `${i.id}: ${h}`);
    for (const d of i.dss.split(";").filter(Boolean)) assert.ok(d in DSS, `${i.id}: ${d}`);
    if (Number(i.severity) > 0) {
      assert.ok(i.heuristics || i.dss, `${i.id} needs a heuristic or DSS control`);
      for (const k of ["frequency", "impact", "persistence"]) assert.ok(["low", "medium", "high"].includes(i[k]), `${i.id} ${k}`);
      assert.ok(i.recommendation.length > 20, `${i.id} recommendation`);
    }
    assert.equal(i.id.startsWith("P-"), Number(i.severity) === 0, `${i.id}: strengths and only strengths have severity 0`);
  }
});

test("every issue has evidence, every evidence row cites a known source", () => {
  for (const i of issues) assert.ok(evidence.some((e) => e.issue_id === i.id), `${i.id} has no evidence`);
  for (const e of evidence) {
    assert.ok(issues.some((i) => i.id === e.issue_id), `evidence for unknown issue ${e.issue_id}`);
    assert.ok(["quote", "link", "html", "data"].includes(e.type), e.type);
    if (e.type !== "data") assert.ok(e.source_id in sources, `unknown source ${e.source_id}`);
    if (e.type === "link") assert.ok(e.evidence.length > 0);
  }
});

test("local quote verification passed for every row and is current", () => {
  const v = readFileSync(new URL("evidence/verification.txt", root), "utf8");
  const n = evidence.length;
  assert.match(v.split("\n")[0], new RegExp(`^${n}/${n} evidence rows verified`));
  assert.ok(!/^FAIL/m.test(v));
});

test("numbers quoted in the issue log match the computed results", () => {
  const byId = Object.fromEntries(issues.map((i) => [i.id, i]));
  const a = results.journeyA.asis;
  const a06 = byId["A-06"].finding;
  assert.ok(a06.includes(`${a.pageLoads} page loads`));
  assert.ok(a06.includes(`${a.distinctPages} pages or files`));
  assert.ok(a06.includes(`${a.deadEnds} dead ends`));
  assert.ok(a06.includes(`${a.decisions} points`));
  assert.ok(a06.includes(`${Math.round(a.klmSeconds)} s`));
  assert.ok(a06.includes(`${fmt(a.wordsRead)} words`));
  assert.ok(byId["A-06"].title.includes(`${a.distinctPages} pages and ${a.decisions} interpretive decisions`));
  const b = results.journeyB.dealerWordForm;
  const b02 = byId["B-02"].finding;
  const s = Math.round(b.klmSeconds);
  assert.ok(b02.includes(`${Math.floor(s / 60)} min ${s % 60} s`), "B-02 minutes");
  assert.ok(b02.includes(`${fmt(b.keystrokes)} keystrokes`));
  const a02 = byId["A-02"].finding;
  assert.ok(a02.includes(`${trees.S19.resultsLinkingToRequirementsTool} of ${trees.S19.results} risk-class results`));
  assert.ok(a02.includes(`${trees.S20.resultsLinkingToRequirementsTool} of ${trees.S20.results} grouping results`));
  assert.ok(a02.includes(`${trees.S18.resultsLinkingToRequirementsTool} of ${trees.S18.results} 'is it a medical device' results`));
  const a11 = byId["A-11"].finding;
  assert.ok(a11.includes(`Question 1 of ${trees.S18.progressTotalShown}`));
  assert.ok(a11.includes(`${trees.S18.questions} questions and ${trees.S18.results} result screens`));
  assert.ok(a11.includes(`longest path asks ${trees.S18.longestQuestionPath} questions`));
});

test("generated documents are up to date", () => {
  assert.equal(readFileSync(new URL("review/02-issue-log.md", root), "utf8"), render({ issues, evidence, sources }));
  const r = spawnSync(process.execPath, [fileURLToPath(new URL("scripts/klm.mjs", root)), "--check"], { encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
});

test("counts written into the task analysis and redesign docs match the computed results", () => {
  const a0 = results.journeyA.asis;
  const a1 = results.journeyA.prototypeP1;
  const ta = readFileSync(new URL("review/03-task-analysis.md", root), "utf8");
  for (const [label, x, y] of [["Steps", a0.steps, a1.steps], ["Page loads", a0.pageLoads, a1.pageLoads], ["Distinct pages or files", a0.distinctPages, a1.distinctPages], ["Dead ends", a0.deadEnds, a1.deadEnds]]) {
    assert.ok(ta.includes(`| ${label} | ${x} | ${y} |`), `03: ${label}`);
  }
  assert.ok(ta.includes(`| Interpretive decisions (rules or arithmetic) | ${a0.decisions} | 0 |`));
  assert.ok(ta.includes(`| Factual questions answered | 0 | ${a1.decisions} |`));
  assert.ok(ta.includes(`| ${results.documentsP1} | ${results.documentsP1} (listed on one page) |`));
  const rd = readFileSync(new URL("review/04-redesign.md", root), "utf8");
  assert.ok(rd.includes(`Steps: ${a0.steps} to ${a1.steps}.`));
  assert.ok(rd.includes(`Page loads: ${a0.pageLoads} to ${a1.pageLoads}; dead ends: ${a0.deadEnds} to ${a1.deadEnds}.`));
  assert.ok(rd.includes(`Interpretive decisions: ${a0.decisions} to 0, replaced by ${a1.decisions} factual questions.`));
  assert.ok(rd.includes(`${a0.distinctPages} pages or files and ${a0.decisions} interpretive decisions`));
});

test("README headline numbers match the computed results and the issue log", () => {
  const md = readFileSync(new URL("README.md", root), "utf8");
  const a0 = results.journeyA.asis;
  const a1 = results.journeyA.prototypeP1;
  const red = results.journeyA.reductionPercent;
  const mmss = (x) => { const s = Math.round(x); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };
  assert.ok(md.includes(`| Steps | ${a0.steps} | ${a1.steps} | -${red.steps}% |`));
  assert.ok(md.includes(`| Page loads | ${a0.pageLoads} | ${a1.pageLoads} | -${red.pageLoads}% |`));
  assert.ok(md.includes(`| Interpretive decisions | ${a0.decisions} | 0 | replaced by ${a1.decisions} factual questions |`));
  assert.ok(md.includes(`| KLM time | ${a0.klmSeconds} s | ${a1.klmSeconds} s | -${red.klmSeconds}% |`));
  assert.ok(md.includes(`| Reading, upper bound | ${mmss(a0.readingSeconds)} | ${mmss(a1.readingSeconds)} | -${red.readingSeconds}% |`));
  const [lo, hi] = results.sensitivity.klmReductionPercent;
  assert.ok(md.includes(`between ${lo}% and ${hi}%`));
  assert.ok(md.includes(`${a0.steps} steps, ${a0.pageLoads} page loads, ${a0.deadEnds} dead ends and ${a0.decisions} points`));
  const b = Math.round(results.journeyB.dealerWordForm.klmSeconds);
  assert.ok(md.includes(`${Math.floor(b / 60)} min ${b % 60} s before any IMDRF`));
  const u = Math.round(results.journeyB.userFormSG.klmSeconds);
  assert.ok(md.includes(`about ${Math.floor(u / 60)} min ${u % 60} s`));
  const sev = (n) => issues.filter((i) => Number(i.severity) === n).length;
  assert.ok(md.includes(`${issues.length - sev(0)} issues in all (${sev(3)} major, ${sev(2)} minor, ${sev(1)} cosmetic) plus ${sev(0)} strengths`));
  assert.equal(sev(4), 0, "README wording assumes no severity-4 issues");
});
