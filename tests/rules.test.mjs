// Tests for the prototype's eligibility logic (docs/rules.js).
// RULES_MODULE lets tests/mutate.mjs point the same suite at a mutated copy.
import test from "node:test";
import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";

const target = process.env.RULES_MODULE ? pathToFileURL(process.env.RULES_MODULE).href : new URL("../docs/rules.js", import.meta.url).href;
const R = await import(target);

// Persona P1 used throughout the task analysis.
const P1 = { activities: ["import", "wholesale"], acra: "yes", deviceClass: "B", special: "none", approvals: ["FDA"], marketed3y: "yes", safety: "no", rejection: "no" };
const keys = (a) => R.eligibleRoutes(a).map((r) => r.key);
const ids = (a) => R.visibleQuestions(a).map((q) => q.id);

test("fee tables match HSA fees page (S11, read 2026-10-15)", () => {
  assert.equal(R.APPLICATION_FEE, 560);
  assert.equal(R.LICENCE_FEE, 1110);
  assert.equal(R.LICENCE_TAT_DAYS, 10);
  assert.equal(R.REEXPORT_SAR_FEE, 280);
  assert.deepEqual(R.ROUTE_FEES, {
    B: { immediate: [1000, null], abridged: [2010, 100], full: [3900, 160] },
    C: { immediate: [3340, null], ecr1: [3340, 120], ecr2: [3340, 120], abridged: [3900, 160], full: [6250, 220] },
    D: { edr: [5930, 180], abridged: [6250, 220], full: [12000, 310] },
    Ddrug: { abridged: [10600, 220], full: [75600, 310] },
  });
});

test("approval counting: distinct agencies, 'none' ignored", () => {
  assert.equal(R.countApprovals({ deviceClass: "B", approvals: ["FDA"] }), 1);
  assert.equal(R.countApprovals({ deviceClass: "B", approvals: ["FDA", "HC", "FDA"] }), 2);
  assert.equal(R.countApprovals({ deviceClass: "C", approvals: ["none"] }), 0);
  assert.equal(R.countApprovals({ deviceClass: "C" }), 0);
});

test("Class B: EU + TGA count as one approval (S06)", () => {
  assert.equal(R.countApprovals({ deviceClass: "B", approvals: ["EU", "TGA"] }), 1);
  assert.equal(R.countApprovals({ deviceClass: "B", approvals: ["EU", "TGA"], mra: "no" }), 1);
  assert.equal(R.countApprovals({ deviceClass: "B", approvals: ["EU", "HC"] }), 2);
});

test("Class C/D: EU + TGA count as two only when neither relied on the MRA (S08, S10)", () => {
  assert.equal(R.countApprovals({ deviceClass: "C", approvals: ["EU", "TGA"], mra: "no" }), 2);
  assert.equal(R.countApprovals({ deviceClass: "C", approvals: ["EU", "TGA"], mra: "yes" }), 1);
  assert.equal(R.countApprovals({ deviceClass: "D", approvals: ["EU", "TGA"] }), 1, "unanswered MRA question is treated as 'not sure'");
  assert.equal(R.countApprovals({ deviceClass: "D", approvals: ["EU", "TGA", "FDA"], mra: "no" }), 3);
});

test("P1 (Class B, FDA 510(k), 3+ years, clean) gets IBR Condition 1 first", () => {
  assert.deepEqual(keys(P1), ["ibr1", "abridged", "full"]);
  const r = R.eligibleRoutes(P1)[0];
  assert.equal(r.evaluationFee, 1000);
  assert.equal(r.applicationFee, 560);
  assert.equal(r.tatDays, null);
  assert.equal(r.forfeitWarning, true);
  assert.equal(r.marketingHistory, true);
});

test("Class B without approvals can only use the full route", () => {
  assert.deepEqual(keys({ ...P1, approvals: ["none"] }), ["full"]);
});

test("Class B: each IBR Condition 1 criterion is required", () => {
  assert.deepEqual(keys({ ...P1, marketed3y: "no" }), ["abridged", "full"]);
  assert.deepEqual(keys({ ...P1, safety: "yes" }), ["abridged", "full"]);
  assert.deepEqual(keys({ ...P1, rejection: "yes" }), ["abridged", "full"]);
});

test("Class B: IBR Condition 2 needs two approvals, no safety issue, no rejection (stricter reading)", () => {
  const two = { ...P1, approvals: ["FDA", "HC"], marketed3y: "no" };
  assert.deepEqual(keys(two), ["ibr2", "abridged", "full"]);
  assert.match(R.eligibleRoutes(two)[0].sourcesDiffer, /S03/);
  assert.deepEqual(keys({ ...two, rejection: "yes" }), ["abridged", "full"]);
  assert.deepEqual(keys({ ...two, safety: "yes" }), ["abridged", "full"]);
  assert.deepEqual(keys({ ...two, marketed3y: "yes" }), ["ibr1", "ibr2", "abridged", "full"]);
});

test("Class B standalone mobile app: immediate with one approval, no marketing history needed", () => {
  const app = { ...P1, special: "mobileApp", marketed3y: "no" };
  assert.deepEqual(keys(app), ["ibrApp", "abridged", "full"]);
  assert.deepEqual(keys({ ...app, safety: "yes" }), ["abridged", "full"]);
  assert.deepEqual(keys({ ...app, rejection: "yes" }), ["abridged", "full"]);
  assert.deepEqual(keys({ ...app, approvals: ["none"] }), ["full"]);
});

test("Class C: ECR-1 and ECR-2", () => {
  const c1 = { ...P1, deviceClass: "C" };
  assert.deepEqual(keys(c1), ["ecr1", "abridged", "full"]);
  assert.deepEqual(keys({ ...c1, marketed3y: "no" }), ["abridged", "full"]);
  assert.deepEqual(keys({ ...c1, safety: "yes" }), ["abridged", "full"]);
  assert.deepEqual(keys({ ...c1, rejection: "yes" }), ["abridged", "full"]);
  const c2 = { ...c1, approvals: ["FDA", "MHLW"], marketed3y: "no", safety: "yes" };
  assert.deepEqual(keys(c2), ["ecr2", "abridged", "full"], "ECR-2 has no safety-history condition");
  assert.deepEqual(keys({ ...c2, rejection: "yes" }), ["abridged", "full"]);
  assert.equal(R.eligibleRoutes(c2)[0].tatDays, 120);
});

test("Class C: joint replacement implants cannot use ECR", () => {
  const c = { ...P1, deviceClass: "C", special: "excludedJoint", approvals: ["FDA", "HC"] };
  assert.deepEqual(keys(c), ["abridged", "full"]);
});

test("Class C: EU + TGA via MRA is one approval, so no ECR-2", () => {
  const c = { ...P1, deviceClass: "C", approvals: ["EU", "TGA"], mra: "yes", marketed3y: "no" };
  assert.deepEqual(keys(c), ["abridged", "full"]);
  assert.deepEqual(keys({ ...c, mra: "no" }), ["ecr2", "abridged", "full"]);
});

test("Class C standalone mobile app: immediate route", () => {
  const c = { ...P1, deviceClass: "C", special: "mobileApp", marketed3y: "no" };
  assert.deepEqual(keys(c), ["cImmediateApp", "abridged", "full"]);
  assert.equal(R.eligibleRoutes(c)[0].evaluationFee, 3340);
  assert.deepEqual(keys({ ...c, safety: "yes" }), ["abridged", "full"]);
  assert.deepEqual(keys({ ...c, rejection: "yes" }), ["abridged", "full"]);
});

test("Class D: EDR needs two approvals and no rejection; excluded categories go abridged/full", () => {
  const d = { ...P1, deviceClass: "D", approvals: ["FDA", "HC"] };
  assert.deepEqual(keys(d), ["edr", "abridged", "full"]);
  assert.equal(R.eligibleRoutes(d)[0].evaluationFee, 5930);
  assert.deepEqual(keys({ ...d, approvals: ["FDA"] }), ["abridged", "full"]);
  assert.deepEqual(keys({ ...d, rejection: "yes" }), ["abridged", "full"]);
  for (const s of ["excludedImplant", "excludedIvd", "excludedJoint"]) assert.deepEqual(keys({ ...d, special: s }), ["abridged", "full"], s);
});

test("Class D with a registrable drug in a secondary role uses its own fee table", () => {
  const d = { ...P1, deviceClass: "D", special: "drugSecondary", approvals: ["FDA", "HC"] };
  assert.deepEqual(keys(d), ["abridged", "full"]);
  assert.equal(R.eligibleRoutes(d)[0].evaluationFee, 10600);
  const none = R.eligibleRoutes({ ...d, approvals: ["none"] });
  assert.deepEqual(none.map((r) => [r.key, r.evaluationFee, r.tatDays]), [["full", 75600, 310]]);
  assert.deepEqual(keys({ ...d, approvals: ["FDA"] }), ["abridged", "full"], "one approval is enough for the abridged route");
});

test("routes are only computed for B/C/D devices placed on the market", () => {
  assert.deepEqual(keys({ ...P1, deviceClass: "A" }), []);
  assert.deepEqual(keys({ ...P1, deviceClass: "unsure" }), []);
  assert.deepEqual(keys({ ...P1, activities: ["retail"] }), []);
  assert.deepEqual(keys({ ...P1, activities: ["reexport"] }), []);
  assert.deepEqual(keys({ ...P1, activities: ["manufacture"] }), ["ibr1", "abridged", "full"]);
});

test("licences follow activities (S14)", () => {
  const names = (a) => R.licencesNeeded(a).map((l) => l.key);
  assert.deepEqual(names(P1), ["importer", "wholesaler"]);
  assert.deepEqual(names({ ...P1, activities: ["manufacture"] }), ["manufacturer"]);
  assert.deepEqual(names({ ...P1, activities: ["retail"] }), []);
  assert.deepEqual(names({ ...P1, activities: ["reexport"] }), ["importer", "wholesaler"]);
  const mw = R.licencesNeeded({ ...P1, activities: ["manufacture", "wholesale"] });
  assert.deepEqual(mw.map((l) => l.key), ["wholesaler", "manufacturer"]);
  assert.match(mw[0].note, /manufacture under your own/);
  assert.equal(R.licencesNeeded(P1)[1].note, undefined);
  for (const l of R.licencesNeeded(P1)) { assert.equal(l.fee, 1110); assert.equal(l.tatDays, 10); }
});

test("QMS evidence depends on licence type and class (S15, S17)", () => {
  const imp = R.qmsEvidence("importer", P1);
  assert.equal(imp.length, 3);
  assert.match(imp[0], /GDPMDS/);
  assert.ok(!imp.some((x) => /Declaration/.test(x)));
  const impA = R.qmsEvidence("importer", { ...P1, deviceClass: "A" });
  assert.ok(impA.some((x) => /Declaration of Conformity to ISO 13485 or GDPMDS/.test(x)));
  const man = R.qmsEvidence("manufacturer", P1);
  assert.equal(man.length, 2);
  assert.ok(!man.some((x) => /GDPMDS/.test(x)));
  assert.ok(R.qmsEvidence("manufacturer", { ...P1, deviceClass: "A" }).some((x) => /Declaration of Conformity to ISO 13485 \(Class A only\)/.test(x)));
  const rex = R.qmsEvidence("importer", { ...P1, activities: ["reexport"] });
  assert.ok(rex.some((x) => /solely for export or re-export/.test(x)));
  assert.ok(!R.qmsEvidence("importer", { ...P1, activities: ["reexport", "import"] }).some((x) => /re-export/.test(x)));
});

test("documents differ by route", () => {
  const ibr1 = R.documentsFor("ibr1", "B");
  assert.ok(ibr1.some((d) => /marketing history/.test(d)));
  assert.ok(ibr1.some((d) => /no safety issue/.test(d)));
  assert.ok(ibr1.some((d) => /Sterilisation validation \(sterile/.test(d)));
  assert.ok(!R.documentsFor("ibr2", "B").some((d) => /marketing history/.test(d)));
  assert.ok(!R.documentsFor("cImmediateApp", "C").some((d) => /Sterilisation validation \(sterile/.test(d)));
  assert.ok(R.documentsFor("ecr1", "C").some((d) => /marketing history/.test(d)));
  assert.ok(!R.documentsFor("ecr2", "C").some((d) => /marketing history/.test(d)));
  assert.ok(!R.documentsFor("abridged", "B").some((d) => /flow chart/.test(d)));
  assert.ok(R.documentsFor("abridged", "C").some((d) => /flow chart/.test(d)));
  assert.ok(R.documentsFor("abridged", "B").some((d) => /Clinical Evaluation Report \(if applicable\)/.test(d)));
  assert.ok(R.documentsFor("abridged", "C").includes("Clinical Evaluation Report"));
  assert.ok(R.documentsFor("abridged", "D").includes("Summary of Clinical Evaluation Report"));
  assert.ok(R.documentsFor("abridged", "D").some((d) => /Proof of approval/.test(d)));
  const full = R.documentsFor("full", "B");
  assert.ok(!full.some((d) => /Proof of approval/.test(d)));
  assert.ok(full.some((d) => /Full reports of preclinical/.test(d)));
  assert.ok(full.includes("Letter of Authorisation"));
});

test("visible questions: P1 sees 8, Class A sees 3, no-approval device skips history questions", () => {
  assert.deepEqual(ids(P1), ["activities", "acra", "deviceClass", "special", "approvals", "marketed3y", "safety", "rejection"]);
  assert.deepEqual(ids({ activities: ["import"], acra: "yes", deviceClass: "A" }), ["activities", "acra", "deviceClass"]);
  assert.deepEqual(ids({ ...P1, approvals: ["none"] }), ["activities", "acra", "deviceClass", "special", "approvals"]);
  assert.deepEqual(ids({ ...P1, deviceClass: "C", approvals: ["EU", "TGA"] }), ["activities", "acra", "deviceClass", "special", "approvals", "mra", "marketed3y", "safety", "rejection"]);
  assert.deepEqual(ids({ ...P1, deviceClass: "D", approvals: ["FDA"] }), ["activities", "acra", "deviceClass", "special", "approvals", "rejection"]);
  assert.deepEqual(ids({ ...P1, deviceClass: "D", special: "drugSecondary" }), ["activities", "acra", "deviceClass", "special", "approvals"]);
  assert.deepEqual(ids({ ...P1, activities: ["retail"] }), ["activities", "acra", "deviceClass"]);
  assert.ok(!ids({ ...P1, deviceClass: "C", approvals: ["TGA", "FDA"] }).includes("mra"), "MRA question needs both EU and TGA");
  assert.ok(!ids({ ...P1, deviceClass: "C", approvals: ["EU", "FDA"] }).includes("mra"));
  assert.ok(!ids({ ...P1, approvals: ["EU", "TGA"] }).includes("mra"), "Class B never asks about the MRA");
});

test("special-category options are filtered by class", () => {
  const q = R.QUESTIONS.find((x) => x.id === "special");
  const vals = (c) => R.optionsFor(q, { deviceClass: c }).map((o) => o.value);
  assert.deepEqual(vals("B"), ["none", "mobileApp"]);
  assert.deepEqual(vals("C"), ["none", "mobileApp", "excludedJoint"]);
  assert.deepEqual(vals("D"), ["none", "drugSecondary", "excludedJoint", "excludedImplant", "excludedIvd"]);
});

test("assess: P1 end to end", () => {
  const r = R.assess(P1);
  assert.deepEqual(r.blockers, []);
  assert.equal(r.product.kind, "registration");
  assert.equal(r.product.recommended.key, "ibr1");
  assert.deepEqual(r.product.documents, R.documentsFor("ibr1", "B"));
  assert.ok(r.warnings.some((w) => w.source === "S06" && /forfeits/.test(w.text)));
  assert.ok(r.warnings.some((w) => /eNETS/.test(w.text)));
  assert.equal(R.indicativeFees(r), 1110 * 2 + 560 + 1000);
  const t = R.resultText(r);
  assert.match(t, /Immediate Class B Registration \(IBR\), Condition 1/);
  assert.match(t, /\$1,000 evaluation/);
  assert.match(t, /Importer's licence: \$1,110/);
  assert.match(t, /Turnaround: immediate on submission\./);
  assert.match(t, /Other routes open to you: Abridged route; Full route \(Priority Review Scheme can be opted into\)\./);
  assert.match(R.resultText(R.assess({ ...P1, approvals: ["none"] })), /Turnaround: 160 working days\./);
});

test("next steps follow the result", () => {
  const p1 = R.assess(P1).nextSteps;
  assert.equal(p1.length, 4);
  assert.match(p1[0], /Corppass/);
  assert.match(p1[2], /registration documents/);
  assert.match(p1[3], /same time/);
  const blocked = R.assess({ ...P1, acra: "no" }).nextSteps;
  assert.match(blocked[0], /Do this first/);
  assert.equal(blocked.length, 5);
  const unsure = R.assess({ ...P1, deviceClass: "unsure" }).nextSteps;
  assert.ok(unsure.some((x) => /Apply in SHARE/.test(x)), "licences can be applied for before the class is known");
  const retail = R.assess({ activities: ["retail"], acra: "yes", deviceClass: "B" }).nextSteps;
  assert.deepEqual(retail.length, 1);
  const classA = R.assess({ activities: ["import"], acra: "yes", deviceClass: "A" }).nextSteps;
  assert.equal(classA.length, 3);
  assert.ok(!classA.some((x) => /registration documents/.test(x)));
  assert.match(R.resultText(R.assess(P1)), /^Your next steps:\n1\. Get Corppass/);
});

test("assess: blockers, Class A, retail-only and re-export paths", () => {
  assert.equal(R.assess({ ...P1, acra: "no" }).blockers.length, 1);
  const unsure = R.assess({ ...P1, deviceClass: "unsure" });
  assert.equal(unsure.blockers.length, 1);
  assert.equal(unsure.product.kind, "unknown");
  const a = R.assess({ activities: ["import"], acra: "yes", deviceClass: "A" });
  assert.equal(a.product.kind, "notification");
  assert.equal(R.indicativeFees(a), 1110);
  const retail = R.assess({ activities: ["retail"], acra: "yes", deviceClass: "B" });
  assert.equal(retail.product.kind, "retail-only");
  assert.equal(retail.licences.length, 0);
  assert.ok(retail.warnings.some((w) => w.source === "S14"));
  assert.ok(!R.assess(P1).warnings.some((w) => w.source === "S14"));
  const rex = R.assess({ activities: ["reexport"], acra: "yes", deviceClass: "C" });
  assert.equal(rex.product.kind, "sar-reexport");
  assert.equal(rex.product.tatDays, 14);
  assert.equal(rex.product.fee, 280);
  assert.equal(R.indicativeFees(rex), 1110 * 2 + 280);
  assert.match(R.resultText(rex), /No product registration|re-export/);
  assert.match(R.resultText(retail), /No dealer's licence/);
});

test("assess: Class C immediate warns about withdrawal, ECR warns that sources differ", () => {
  const app = R.assess({ ...P1, deviceClass: "C", special: "mobileApp", marketed3y: "no" });
  assert.ok(app.warnings.some((w) => w.source === "S28"));
  const ecr = R.assess({ ...P1, deviceClass: "C" });
  assert.ok(ecr.warnings.some((w) => /pages differ on this route/.test(w.text)));
  assert.ok(!R.assess({ ...P1, approvals: ["FDA"], marketed3y: "no" }).warnings.some((w) => /pages differ on this route/.test(w.text)));
  assert.ok(!ecr.warnings.some((w) => w.source === "S06" || w.source === "S28"));
  const full = R.assess({ ...P1, approvals: ["none"] });
  assert.equal(full.product.recommended.key, "full");
  assert.equal(R.indicativeFees(full), 1110 * 2 + 560 + 3900);
});

test("usability test scenarios have the answers the test plan states", () => {
  const x = { activities: ["import", "wholesale"], acra: "yes", deviceClass: "B", special: "none", approvals: ["FDA"], marketed3y: "yes", safety: "no", rejection: "no" };
  const rx = R.assess(x);
  assert.deepEqual(rx.licences.map((l) => l.key), ["importer", "wholesaler"]);
  assert.equal(rx.product.recommended.key, "ibr1");
  // Scenario Y: a closed recall is not an open field safety corrective action.
  const y = { activities: ["import"], acra: "yes", deviceClass: "C", special: "none", approvals: ["MHLW", "HC"], marketed3y: "no", safety: "no", rejection: "no" };
  const ry = R.assess(y);
  assert.deepEqual(ry.licences.map((l) => l.key), ["importer"]);
  assert.equal(ry.product.recommended.key, "ecr2");
  assert.equal(ry.product.recommended.evaluationFee, 3340);
  assert.equal(ry.product.recommended.tatDays, 120);
});
