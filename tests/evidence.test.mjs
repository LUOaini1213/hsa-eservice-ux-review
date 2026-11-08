// Integrity checks for the issue log, evidence table and generated documents.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { load, HEURISTICS, DSS, render, parseCsv } from "../scripts/render_issues.mjs";

const root = new URL("..", import.meta.url);
const { issues, evidence, sources, archive } = load();
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

// This checks the recorded result of scripts/verify_evidence.py (run locally against page copies
// that are not redistributed); it does not re-verify the quotes. check_archives.py is the public re-check.
test("recorded local quote verification covers every evidence row and reports no failure", () => {
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
  assert.equal(readFileSync(new URL("review/02-issue-log.md", root), "utf8"), render({ issues, evidence, sources, archive }));
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

const readme = () => readFileSync(new URL("README.md", root), "utf8");
const doc = (p) => readFileSync(new URL(p, root), "utf8");

test("link-audit counts in the README, issue log and method doc match evidence/link-audit.csv", () => {
  const rows = parseCsv(doc("evidence/link-audit.csv"));
  const n = (st) => rows.filter((r) => r.status === st).length;
  const pages = new Set(rows.map((r) => r.source_id)).size;
  const checked = rows.length - n("skipped");
  assert.equal(n("skipped"), rows.filter((r) => r.href.startsWith("mailto:")).length, "only mailto links are skipped");
  const failures = rows.filter((r) => r.status !== "200" && r.status !== "skipped");
  const sentence = `${rows.length} links on ${pages} HSA web pages (${checked} checked over HTTP, ${n("skipped")} mailto links not checked) found ${failures.length} failures`;
  assert.ok(readme().includes(sentence), "README: " + sentence);
  assert.ok(issues.find((i) => i.id === "A-02").finding.includes(sentence), "A-02: " + sentence);
  assert.ok(doc("review/01-scope-and-method.md").includes(`audited ${rows.length} links on ${pages} HSA web pages (\`evidence/link-audit.csv\`: ${checked} checked over HTTP, ${n("skipped")} mailto links not checked)`), "01-scope-and-method");
  // "all pointing to this checker": every failure targets one of the two checker URLs.
  for (const f of failures) assert.match(f.href, /\/registration\/requirements$|\/hsa\/mdc\/medical-devices$/, f.href);
});

test("archived copies point at the right source, predate the review and match the record", () => {
  const rows = parseCsv(doc("evidence/archives.csv"));
  assert.ok(rows.length > 0);
  for (const a of rows) {
    const m = a.archive_url.match(/^https:\/\/web\.archive\.org\/web\/(\d{14})\/(.+)$/);
    assert.ok(m, a.archive_url);
    assert.equal(m[2], sources[a.source_id].url, `${a.source_id} archive points elsewhere`);
    assert.ok(m[1] <= "20261015235959", `${a.source_id} copy is after the review date`);
    const t = m[1];
    assert.equal(a.archived_utc, `${t.slice(0, 4)}-${t.slice(4, 6)}-${t.slice(6, 8)}T${t.slice(8, 10)}:${t.slice(10, 12)}:${t.slice(12, 14)}Z`);
  }
  // Every web evidence row of an archived source is in the record, with that source's archive URL.
  const url = Object.fromEntries(rows.map((a) => [a.source_id, a.archive_url]));
  const expected = evidence.map((e, k) => ({ ...e, line: k + 2 })).filter((e) => e.source_id in url && ["quote", "link", "html"].includes(e.type));
  assert.deepEqual(archive.map((r) => r.line), expected.map((e) => e.line));
  for (const r of archive) {
    const e = evidence[r.line - 2];
    assert.equal(r.issue_id, e.issue_id);
    assert.equal(r.source_id, e.source_id);
    assert.equal(r.type, e.type);
    assert.equal(r.archive_url, url[r.source_id]);
    assert.equal(typeof r.found, "boolean");
  }
  const found = archive.filter((r) => r.found).length;
  const md = readme();
  const kind = Object.fromEntries(JSON.parse(doc("evidence/sources.json")).map((x) => [x.id, x.kind]));
  const pages = new Set(evidence.filter((e) => ["quote", "link", "html"].includes(e.type) && kind[e.source_id] === "html").map((e) => e.source_id));
  const selfhelpMissing = [...pages].filter((x) => !(x in url) && sources[x].url.includes("selfhelp.hsa.gov.sg"));
  assert.equal(rows.length + selfhelpMissing.length, pages.size, "every web page without a copy is a self-help tool");
  assert.ok(md.includes(`${rows.length} of the ${pages.size} web pages cited as evidence have such a copy, and ${found} of their ${archive.length} quote and link rows are found in it`), "README archive count");
  assert.ok(md.includes(`The ${selfhelpMissing.length} self-help tools have no copy`), "README self-help count");
  assert.ok(doc("review/02-issue-log.md").includes(`${found} of the ${archive.length} quote and link rows`), "issue log archive count");
});

test("README first screen and links-fixed baseline match the computed results", () => {
  const md = readme();
  const a0 = results.journeyA.asis, f = results.journeyA.asisLinksFixed, a1 = results.journeyA.prototypeP1;
  const red = results.journeyA.reductionPercent, rf = results.journeyA.reductionPercentFromLinksFixed;
  const sev = (n) => issues.filter((i) => Number(i.severity) === n).length;
  assert.ok(md.includes(`Main results: ${issues.length - sev(0)} issues (${sev(3)} major)`), "first-screen issue count");
  assert.ok(md.includes(`from ${a0.klmSeconds} s to ${a1.klmSeconds} s (-${red.klmSeconds}%, or -${Math.round(rf.klmSeconds)}% against a baseline with the broken links fixed)`), "first-screen KLM");
  assert.equal(results.journeyA.detourSteps.length, a0.steps - f.steps);
  assert.equal(f.deadEnds, 0, "the links-fixed baseline has no dead ends");
  assert.ok(md.includes(`with the ${results.journeyA.detourSteps.length} detour steps they cause removed (a "links fixed" baseline of ${f.steps} steps and ${f.klmSeconds} s), the prototype still needs ${Math.round(rf.steps)}% fewer steps and ${Math.round(rf.klmSeconds)}% less KLM time`), "links-fixed sentence");
});

test("mutant count in the README matches the mutation harness", () => {
  const r = spawnSync(process.execPath, [fileURLToPath(new URL("tests/mutate.mjs", root)), "--list"], { encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
  const n = Number(r.stdout.trim().split("\n").at(-1).match(/^(\d+) mutants$/)[1]);
  assert.ok(readme().includes(`It currently makes ${n} mutants and the tests kill all ${n}`), `README should say ${n} mutants`);
});

test("README test command works without shell glob expansion and matches package.json", () => {
  const pkg = JSON.parse(doc("package.json"));
  assert.equal(pkg.scripts.test, 'node --test "tests/*.test.mjs"');
  assert.ok(readme().includes('node --test "tests/*.test.mjs"'));
  const major = Number(pkg.engines.node.match(/>=(\d+)/)[1]);
  assert.ok(major >= 22, "quoted test globs need Node 22 or later");
  assert.ok(readme().includes(`Node ${major} or later`));
});
