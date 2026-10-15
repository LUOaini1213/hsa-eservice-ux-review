import test from "node:test";
import assert from "node:assert/strict";
import { susScore } from "../testing/sus.mjs";

test("SUS scoring follows Brooke (1996)", () => {
  assert.equal(susScore([3, 3, 3, 3, 3, 3, 3, 3, 3, 3]), 50);
  assert.equal(susScore([5, 1, 5, 1, 5, 1, 5, 1, 5, 1]), 100);
  assert.equal(susScore([1, 5, 1, 5, 1, 5, 1, 5, 1, 5]), 0);
  assert.equal(susScore([4, 2, 4, 2, 4, 2, 4, 2, 4, 2]), 75);
  assert.equal(susScore([5, 3, 3, 3, 3, 3, 3, 3, 3, 3]), 55, "item 1 is positive");
  assert.equal(susScore([3, 1, 3, 3, 3, 3, 3, 3, 3, 3]), 55, "item 2 is negative");
});

test("SUS rejects malformed input", () => {
  assert.throws(() => susScore([3, 3, 3]), /exactly 10/);
  assert.throws(() => susScore([3, 3, 3, 3, 3, 3, 3, 3, 3, 6]), /1 to 5/);
  assert.throws(() => susScore([3, 3, 3, 3, 3, 3, 3, 3, 3, 2.5]), /1 to 5/);
});
