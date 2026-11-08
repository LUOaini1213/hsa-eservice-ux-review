// Computes all task-analysis numbers and writes data/klm/results.json and review/klm-results.md.
//   node scripts/klm.mjs           # write
//   node scripts/klm.mjs --check   # fail if the committed outputs are stale (used in CI)
import { readFileSync, writeFileSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { scoreJourney, formSteps, prototypeSteps, round } from "./klm-core.mjs";
import * as rules from "../docs/rules.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(root, p), "utf8");
const json = (p) => JSON.parse(read(p));

// --- measured inputs -------------------------------------------------------
function parseCsv(text) {
  const rows = [];
  let row = [], cell = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      if (ch === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') q = false;
      else cell += ch;
    } else if (ch === '"') q = true;
    else if (ch === ",") { row.push(cell); cell = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell); cell = "";
      if (row.length > 1 || row[0] !== "") rows.push(row);
      row = [];
    } else cell += ch;
  }
  if (cell !== "" || row.length) { row.push(cell); rows.push(row); }
  const [head, ...body] = rows;
  return body.map((r) => Object.fromEntries(head.map((h, i) => [h, r[i]])));
}

export const sources = parseCsv(read("evidence/sources.csv"));
const words = Object.fromEntries(sources.map((s) => [s.id, Number(s.words)]));
const r = Object.fromEntries(sources.map((s) => [s.id, Number(s.median_response_s)]));
const hsaR = sources.filter((s) => /^S\d+$/.test(s.id) && s.url.includes("hsa.gov.sg") && !s.url.includes("selfhelp")).map((s) => Number(s.median_response_s)).sort((a, b) => a - b);
const median = (xs) => (xs.length % 2 ? xs[(xs.length - 1) / 2] : (xs[xs.length / 2 - 1] + xs[xs.length / 2]) / 2);
r.dead = round(median(hsaR) * 1000) / 1000;
const measured = json("data/klm/measured.json");
r.PAGES = measured.pagesMedianResponseSeconds ?? r.dead;

const C = json("data/klm/operators.json");
const consts = (o = {}) => ({ K: C.K, P: C.P, B: C.B, H: C.H, M: C.M, readingWpm: C.readingWpm, ...o });

export const PERSONAS = {
  P1: { activities: ["import", "wholesale"], acra: "yes", deviceClass: "B", special: "none", approvals: ["FDA"], marketed3y: "yes", safety: "no", rejection: "no" },
  P2: { activities: ["import"], acra: "yes", deviceClass: "C", special: "none", approvals: ["EU", "TGA"], mra: "yes", marketed3y: "no", safety: "no", rejection: "no" },
};

// --- journeys --------------------------------------------------------------
const asis = json("data/klm/journey-a-asis.json");
const dealer = json("data/klm/journey-b-dealer-ae.json");
const user = json("data/klm/journey-b-user-ae.json");

function compute(c) {
  const A0 = scoreJourney(asis.steps, c, r, words);
  // "Links fixed" baseline: the current journey without the detours caused by A-01 and A-02.
  const A0f = scoreJourney(asis.steps.filter((x) => !x.detour), c, r, words);
  const A1 = scoreJourney(prototypeSteps(rules, PERSONAS.P1), c, r, words);
  const A1p2 = scoreJourney(prototypeSteps(rules, PERSONAS.P2), c, r, words);
  const B1 = scoreJourney(formSteps(dealer), c, r, words);
  const B1lo = scoreJourney(formSteps(dealer, { "Description of Event or Problem *": 300 }), c, r, words);
  const B1hi = scoreJourney(formSteps(dealer, { "Description of Event or Problem *": 1200 }), c, r, words);
  const B2 = scoreJourney(formSteps(user), c, r, words);
  return { A0, A0f, A1, A1p2, B1, B1lo, B1hi, B2 };
}

const pct = (a, b) => round((100 * (a - b)) / a);
const base = compute(consts());
const { A0, A0f, A1 } = base;
const reductionFromLinksFixed = {
  steps: pct(A0f.steps, A1.steps),
  pageLoads: pct(A0f.pageLoads, A1.pageLoads),
  klmSeconds: pct(A0f.klmSeconds, A1.klmSeconds),
  readingSeconds: pct(A0f.readingSeconds, A1.readingSeconds),
};
const reduction = {
  steps: pct(A0.steps, A1.steps),
  pageLoads: pct(A0.pageLoads, A1.pageLoads),
  clicks: pct(A0.clicks, A1.clicks),
  klmSeconds: pct(A0.klmSeconds, A1.klmSeconds),
  readingSeconds: pct(A0.readingSeconds, A1.readingSeconds),
  totalSeconds: pct(A0.klmSeconds + A0.readingSeconds, A1.klmSeconds + A1.readingSeconds),
};

const sensitivity = [];
for (const K of C.sensitivity.K) for (const M of C.sensitivity.M) for (const wpm of C.sensitivity.readingWpm) {
  const s = compute(consts({ K, M, readingWpm: wpm }));
  sensitivity.push({ K, M, wpm, klmReduction: pct(s.A0.klmSeconds, s.A1.klmSeconds), klmReductionFromLinksFixed: pct(s.A0f.klmSeconds, s.A1.klmSeconds), totalReduction: pct(s.A0.klmSeconds + s.A0.readingSeconds, s.A1.klmSeconds + s.A1.readingSeconds), dealerFormMinutes: round(s.B1.klmSeconds / 60) });
}
const range = (k) => [Math.min(...sensitivity.map((x) => x[k])), Math.max(...sensitivity.map((x) => x[k]))];

const results = {
  generatedFrom: ["data/klm/operators.json", "data/klm/measured.json", "evidence/sources.csv", "data/klm/journey-a-asis.json", "docs/rules.js", "data/klm/journey-b-dealer-ae.json", "data/klm/journey-b-user-ae.json"],
  responseSeconds: { hsaMedian: r.dead, prototype: r.PAGES, prototypeMeasured: measured.pagesMedianResponseSeconds !== null },
  journeyA: { asis: A0, asisLinksFixed: A0f, detourSteps: asis.steps.filter((x) => x.detour).map((x) => x.id), prototypeP1: A1, prototypeP2: base.A1p2, reductionPercent: reduction, reductionPercentFromLinksFixed: reductionFromLinksFixed },
  journeyB: { dealerWordForm: base.B1, dealerDescription300: base.B1lo, dealerDescription1200: base.B1hi, userFormSG: base.B2, statedMinutes: 15 },
  sensitivity: { cases: sensitivity.length, klmReductionPercent: range("klmReduction"), klmReductionFromLinksFixedPercent: range("klmReductionFromLinksFixed"), totalReductionPercent: range("totalReduction"), dealerFormMinutes: range("dealerFormMinutes") },
  documentsP1: rules.assess(PERSONAS.P1).product.documents.length,
};

// --- markdown ----------------------------------------------------------------
const mmss = (x) => { const s = Math.round(x); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; };
const row = (label, a, b) => `| ${label} | ${a} | ${b} |`;
const row3 = (label, a, f, b) => `| ${label} | ${a} | ${f} | ${b} |`;
const md = `<!-- Generated by scripts/klm.mjs. Do not edit by hand. -->
# Task analysis numbers

Operator times: K ${C.K} s, P ${C.P} s, B ${C.B} s, H ${C.H} s, M ${C.M} s (Card, Moran and Newell; Kieras 2001).
System response R is the median of three HTML requests per page (evidence/sources.csv): HSA pages median ${r.dead} s; prototype ${r.PAGES} s${measured.pagesMedianResponseSeconds === null ? " (not yet measured, HSA median used)" : " (measured on GitHub Pages)"}.
Reading time is outside KLM and is an upper bound: every word of each page visited, read once, at ${C.readingWpm} words per minute.

## Journey A: find licences, route, fees and documents (persona P1, Class B importer and wholesaler)

| Measure | Current HSA journey | Current, broken-link detours removed | Prototype |
|---|---:|---:|---:|
${row3("Steps", A0.steps, A0f.steps, A1.steps)}
${row3("Page loads", A0.pageLoads, A0f.pageLoads, A1.pageLoads)}
${row3("Distinct pages or files", A0.distinctPages, A0f.distinctPages, A1.distinctPages)}
${row3("Dead ends (HSA links to google.com or a 404)", A0.deadEnds, A0f.deadEnds, A1.deadEnds)}
${row3("Clicks", A0.clicks, A0f.clicks, A1.clicks)}
${row3("Keystrokes", A0.keystrokes, A0f.keystrokes, A1.keystrokes)}
${row3("Points where the user must interpret rules or do arithmetic", A0.decisions, A0f.decisions, 0)}
${row3("Factual questions answered", 0, 0, A1.decisions)}
${row3("Mental operators (M)", A0.mentalOps, A0f.mentalOps, A1.mentalOps)}
${row3("KLM time (operators + response)", `${A0.klmSeconds} s (${mmss(A0.klmSeconds)})`, `${A0f.klmSeconds} s (${mmss(A0f.klmSeconds)})`, `${A1.klmSeconds} s (${mmss(A1.klmSeconds)})`)}
${row3("Words on pages visited", A0.wordsRead, A0f.wordsRead, A1.wordsRead)}
${row3("Reading time, upper bound", `${A0.readingSeconds} s (${mmss(A0.readingSeconds)})`, `${A0f.readingSeconds} s (${mmss(A0f.readingSeconds)})`, `${A1.readingSeconds} s (${mmss(A1.readingSeconds)})`)}
${row3("KLM + reading", mmss(A0.klmSeconds + A0.readingSeconds), mmss(A0f.klmSeconds + A0f.readingSeconds), mmss(A1.klmSeconds + A1.readingSeconds))}

The middle column drops steps ${results.journeyA.detourSteps.join(", ")} of the current journey, which exist only because of the broken checker links (A-01, A-02): the user goes straight from the Registration overview to its route table. It separates what repairing the two links would save from what the redesign adds.

Reduction: steps ${reduction.steps}%, page loads ${reduction.pageLoads}%, clicks ${reduction.clicks}%, KLM time ${reduction.klmSeconds}%, reading ${reduction.readingSeconds}%, KLM + reading ${reduction.totalSeconds}%.
Across ${sensitivity.length} combinations of K (${C.sensitivity.K.join(", ")}), M (${C.sensitivity.M.join(", ")}) and reading speed (${C.sensitivity.readingWpm.join(", ")} wpm), the KLM reduction ranges ${results.sensitivity.klmReductionPercent[0]}% to ${results.sensitivity.klmReductionPercent[1]}% and KLM + reading ${results.sensitivity.totalReductionPercent[0]}% to ${results.sensitivity.totalReductionPercent[1]}%.
Against the detours-removed baseline: steps ${reductionFromLinksFixed.steps}%, page loads ${reductionFromLinksFixed.pageLoads}%, KLM time ${reductionFromLinksFixed.klmSeconds}% (sensitivity ${results.sensitivity.klmReductionFromLinksFixedPercent[0]}% to ${results.sensitivity.klmReductionFromLinksFixedPercent[1]}%), reading ${reductionFromLinksFixed.readingSeconds}%.

Persona P2 (Class C importer, EU and TGA approvals via the MRA): prototype ${base.A1p2.steps} steps, KLM ${base.A1p2.klmSeconds} s.
Documents P1 must prepare for the recommended route: ${results.documentsP1} (same list in both journeys; the prototype assembles it on one page).

## Journey B: adverse event reporting

| Measure | B1 dealer, Word form by email | B2 clinic user, FormSG |
|---|---:|---:|
${row("Form fields modelled", dealer.fields.reduce((n, f) => n + (f.repeat || 1), 0), user.fields.length)}
${row("Clicks", base.B1.clicks, base.B2.clicks)}
${row("Keystrokes", base.B1.keystrokes, base.B2.keystrokes)}
${row("KLM time", `${base.B1.klmSeconds} s (${mmss(base.B1.klmSeconds)})`, `${base.B2.klmSeconds} s (${mmss(base.B2.klmSeconds)})`)}
${row("Words on pages and form", base.B1.wordsRead, base.B2.wordsRead)}
${row("Reading time, upper bound", mmss(base.B1.readingSeconds), mmss(base.B2.readingSeconds))}

The dealer form states it "may take you 15 minutes to fill in". KLM execution time alone, with all facts at hand and no IMDRF or GMDN look-ups, is ${mmss(base.B1.klmSeconds)} (description 300 to 1,200 characters: ${mmss(base.B1lo.klmSeconds)} to ${mmss(base.B1hi.klmSeconds)}; across operator sensitivity ${results.sensitivity.dealerFormMinutes[0]} to ${results.sensitivity.dealerFormMinutes[1]} min).
`;

const cell = (x) => String(x).replace(/\|/g, "\\|");
const stepTable = (steps) => [
  "| # | Where | Action | Operators | Decision or dead end |",
  "|---|---|---|---|---|",
  ...steps.map((x, i) => `| ${i + 1} | ${x.at || "-"} | ${cell(x.action)} | \`${x.ops}\` | ${x.decision ? "Decision: " + cell(x.decision) : x.deadEnd ? "Dead end: " + cell(x.deadEnd) : ""}${x.detour ? (x.deadEnd ? "; " : "") + "detour (dropped in the links-fixed baseline)" : ""} |`),
].join("\n");
const protoP1 = prototypeSteps(rules, PERSONAS.P1).map((x) => ({ ...x, at: x.ops === "R:S01" ? "S01" : "prototype", decision: undefined }));
const mdAll = `${md}
## Step listings

### Journey A, current HSA journey (persona P1)

${asis.task}

Assumptions: ${asis.assumptions.join(" ")}

${stepTable(asis.steps)}

### Journey A, prototype (persona P1)

${stepTable(protoP1)}

### Journey B1, dealer Word form: fields modelled

${dealer.assumptions.join(" ")}

| Field | Kind | Characters typed |
|---|---|---:|
${dealer.fields.map((f) => `| ${cell(f.label)} | ${f.kind}${f.repeat ? " x" + f.repeat : ""} | ${f.chars ?? "-"} |`).join("\n")}
`;

const outJson = JSON.stringify(results, null, 2) + "\n";
if (process.argv.includes("--check")) {
  const stale = [];
  if (read("data/klm/results.json") !== outJson) stale.push("data/klm/results.json");
  if (read("review/klm-results.md") !== mdAll) stale.push("review/klm-results.md");
  if (stale.length) { console.error(`Stale generated files: ${stale.join(", ")}. Run node scripts/klm.mjs`); process.exit(1); }
  console.log("KLM outputs are up to date.");
} else {
  writeFileSync(join(root, "data/klm/results.json"), outJson);
  writeFileSync(join(root, "review/klm-results.md"), mdAll);
  console.log(md);
}
