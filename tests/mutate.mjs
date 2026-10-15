// Mutation check for docs/rules.js.
//
// Generates one mutant per mutation site, runs the test suite against each
// mutant (via RULES_MODULE) and fails if any mutant survives.
//
//   node tests/mutate.mjs                         # real suite, must kill every mutant
//   node tests/mutate.mjs --tests tests/fixtures/weak.test.mjs
//                                                 # negative control: must FAIL (survivors)
//   node tests/mutate.mjs --list                  # print mutants without running
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const testsArg = args.includes("--tests") ? args[args.indexOf("--tests") + 1] : "tests/rules.test.mjs";
const listOnly = args.includes("--list");
const source = readFileSync(join(root, "docs", "rules.js"), "utf8");
const lines = source.split("\n");

// Only mutate executable logic, not prose (labels, help text, comments).
function isLogicLine(line) {
  const t = line.trim();
  if (t.startsWith("//") || t.startsWith("*") || t.startsWith("/*")) return false;
  if (/^(prompt|help|label|text|title|url):/.test(t)) return false;
  if (/^S\d\d: \{ title:/.test(t)) return false; // citation table
  if (/^\{ value: "[^"]+", label:/.test(t) && !/classes:/.test(t)) return false;
  return true;
}

const OPERATORS = [
  { name: ">= n -> >= n+1", re: />= (\d+)/g, sub: (m, n) => `>= ${Number(n) + 1}` },
  { name: "&& -> ||", re: /&&/g, sub: () => "||" },
  { name: "|| -> &&", re: /(?<![|])\|\|(?![|])/g, sub: () => "&&" },
  { name: "=== -> !==", re: /===/g, sub: () => "!==" },
  { name: "!== -> ===", re: /!==/g, sub: () => "===" },
  { name: "drop negation", re: /!(?=[a-zA-Z(])/g, sub: () => "" },
  { name: "'no' <-> 'yes'", re: /"(no|yes)"/g, sub: (m, v) => (v === "no" ? '"yes"' : '"no"') },
  { name: "number +1", re: /(?<![\w.])(\d{2,6})(?![\w.])/g, sub: (m, n) => String(Number(n) + 1), codeOnly: true },
  { name: "null TAT -> 0", re: /, null\]/g, sub: () => ", 0]" },
  { name: "n -= 1 removed", re: /n -= 1;/g, sub: () => ";" },
  { name: "includes(x) -> includes(__none__)", re: /includes\("([a-zA-Z]+)"\)/g, sub: () => 'includes("__none__")' },
  { name: "push removed", re: /\b(out|blockers|warnings)\.push\(/g, sub: () => "void (" },
  { name: "class literal swap", re: /"([BCD])"(?=[,\]\)])/g, sub: (m, c) => ({ B: '"C"', C: '"D"', D: '"B"' })[c] },
  { name: "slice(1) -> slice(0)", re: /\.slice\(1\)/g, sub: () => ".slice(0)" },
  { name: "routes[0] -> routes[1]", re: /routes\[0\]/g, sub: () => "routes[1]" },
  { name: "sort order flip", re: /\(x\.tatDays \?\? -1\) - \(y\.tatDays \?\? -1\)/g, sub: () => "(y.tatDays ?? -1) - (x.tatDays ?? -1)" },
];

const mutants = [];
// Character ranges of string literals and of a trailing // comment on a line.
function literalSpans(line) {
  const spans = [];
  let q = null, start = 0;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (q) {
      if (c === "\\") i++;
      else if (c === q) { spans.push([start, i]); q = null; }
    } else if (c === '"' || c === "'" || c === "`") { q = c; start = i; }
    else if (c === "/" && line[i + 1] === "/") { spans.push([i, line.length]); break; }
  }
  return spans;
}

lines.forEach((line, i) => {
  if (!isLogicLine(line)) return;
  const spans = literalSpans(line);
  const inLiteral = (k) => spans.some(([a, b]) => k >= a && k <= b);
  for (const op of OPERATORS) {
    for (const m of line.matchAll(op.re)) {
      if (op.codeOnly && inLiteral(m.index)) continue;
      if (!op.codeOnly && spans.some(([a, b]) => line[a] === "/" && m.index >= a)) continue; // never mutate comments
      const replaced = line.slice(0, m.index) + m[0].replace(op.re, op.sub) + line.slice(m.index + m[0].length);
      if (replaced === line) continue;
      mutants.push({ line: i + 1, op: op.name, before: line.trim(), after: replaced.trim(), code: [...lines.slice(0, i), replaced, ...lines.slice(i + 1)].join("\n") });
    }
  }
});

if (listOnly) {
  for (const m of mutants) console.log(`L${m.line} [${m.op}] ${m.after}`);
  console.log(`${mutants.length} mutants`);
  process.exit(0);
}

// Sanity: the suite must pass on the unmutated code, otherwise "killed" means nothing.
const run = (modulePath) => spawnSync(process.execPath, ["--test", "--test-reporter=dot", join(root, testsArg)], {
  env: { ...process.env, RULES_MODULE: modulePath }, encoding: "utf8", timeout: 60000,
});
const baseline = run(join(root, "docs", "rules.js"));
if (baseline.status !== 0) {
  console.error("Baseline test run failed; fix the tests before mutation testing.\n" + baseline.stdout + baseline.stderr);
  process.exit(2);
}

const dir = mkdtempSync(join(tmpdir(), "rules-mut-"));
const survivors = [];
let killed = 0;
try {
  mutants.forEach((m, k) => {
    const file = join(dir, `m${k}.js`);
    writeFileSync(file, m.code);
    const r = run(file);
    if (r.status === 0) survivors.push(m);
    else killed += 1;
  });
} finally {
  rmSync(dir, { recursive: true, force: true });
}

console.log(`Mutation check on docs/rules.js with ${testsArg}: ${killed}/${mutants.length} mutants killed.`);
for (const s of survivors) console.log(`  SURVIVED L${s.line} [${s.op}]\n    - ${s.before}\n    + ${s.after}`);
process.exit(survivors.length === 0 && mutants.length > 0 ? 0 : 1);
