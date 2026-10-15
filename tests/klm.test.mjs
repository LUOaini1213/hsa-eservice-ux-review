import test from "node:test";
import assert from "node:assert/strict";
import { parseOps, fieldOps, score, scoreJourney, formSteps, prototypeSteps, wordCount } from "../scripts/klm-core.mjs";
import * as rules from "../docs/rules.js";

const C = { K: 0.28, P: 1.1, B: 0.1, H: 0.4, M: 1.35, readingWpm: 238 };

test("parseOps expands repeats and rejects unknown operators", () => {
  assert.deepEqual(parseOps("M P B B K*3 R:S01"), ["M", "P", "B", "B", "K", "K", "K", "R:S01"]);
  assert.deepEqual(parseOps("  "), []);
  assert.throws(() => parseOps("M X"), /Unknown KLM operator/);
});

test("score sums operator and response times", () => {
  const s = score(parseOps("M P B B H K*10 H R:x"), C, { x: 0.5 });
  assert.deepEqual(s.counts, { K: 10, P: 1, B: 2, H: 2, M: 1, R: 1 });
  assert.equal(Math.round(s.operatorSeconds * 100) / 100, 1.35 + 1.1 + 0.2 + 0.8 + 2.8);
  assert.equal(s.responseSeconds, 0.5);
  assert.throws(() => score(["R:missing"], C, {}), /No response time/);
});

test("fieldOps per kind, with repeats", () => {
  assert.equal(fieldOps({ kind: "text", chars: 3 }), "M P B B H K*3 H");
  assert.equal(fieldOps({ kind: "check" }), "M P B B");
  assert.equal(fieldOps({ kind: "dropdown" }), "M P B B P B B");
  assert.equal(fieldOps({ kind: "upload" }), "M P B B P B B B B");
  assert.equal(fieldOps({ kind: "text", chars: 1, repeat: 2 }), "M P B B H K*1 H M P B B H K*1 H");
  assert.throws(() => fieldOps({ kind: "radio" }), /Unknown field kind/);
});

test("scoreJourney counts pages once for reading and tracks dead ends and decisions", () => {
  const steps = [
    { ops: "R:a", read: ["a"] },
    { ops: "M P B B R:dead", deadEnd: "x" },
    { ops: "M P B B R:a", read: ["a"], decision: "d" },
    { ops: "M", words: 10 },
  ];
  const j = scoreJourney(steps, C, { a: 1, dead: 2 }, { a: 238 });
  assert.equal(j.pageLoads, 3);
  assert.equal(j.distinctPages, 1);
  assert.equal(j.deadEnds, 1);
  assert.equal(j.decisions, 1);
  assert.equal(j.clicks, 2);
  assert.equal(j.wordsRead, 248);
  assert.equal(j.readingSeconds, 62.5);
  assert.equal(j.responseSeconds, 4);
});

test("formSteps applies overrides", () => {
  const journey = { navigation: [{ ops: "R:a" }], fields: [{ label: "x", kind: "text", chars: 5 }], finish: [{ ops: "M" }] };
  assert.equal(formSteps(journey).length, 3);
  assert.match(formSteps(journey, { x: 9 })[1].ops, /K\*9/);
});

test("prototypeSteps follows the prototype's own visible questions", () => {
  const P1 = { activities: ["import", "wholesale"], acra: "yes", deviceClass: "B", special: "none", approvals: ["FDA"], marketed3y: "yes", safety: "no", rejection: "no" };
  const steps = prototypeSteps(rules, P1);
  assert.equal(steps.length, 2 + rules.visibleQuestions(P1).length + 1);
  assert.equal(steps[0].ops, "R:S01");
  assert.equal(steps[2].ops, "M P B B P B B P B B", "two activities ticked, then Continue");
  assert.equal(steps[3].ops, "M P B B P B B");
  assert.equal(steps.at(-1).words, wordCount(rules.resultText(rules.assess(P1))));
});
