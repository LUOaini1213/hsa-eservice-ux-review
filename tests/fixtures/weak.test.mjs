// Deliberately weak suite: the negative control for tests/mutate.mjs.
// It only checks that the module loads, so most mutants survive and the
// mutation check must exit non-zero. CI asserts that it does.
import test from "node:test";
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";

const target = process.env.RULES_MODULE ? pathToFileURL(process.env.RULES_MODULE).href : new URL("../../docs/rules.js", import.meta.url).href;
const R = await import(target);

test("module exports the assessment function", () => {
  assert.equal(typeof R.assess, "function");
});
