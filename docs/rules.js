// Eligibility and checklist rules for the redesign prototype.
//
// Every rule below is transcribed from HSA's public pages as read on 2026-10-15
// (source IDs refer to evidence/sources.csv). This is an independent concept
// prototype, not an HSA service and not regulatory advice: where two HSA pages
// state a condition differently, the rule takes the stricter reading and the
// result carries a warning so the user can confirm with HSA.
//
// Pure functions only (no DOM), so the same module runs in the browser, in the
// Node test suite and in the KLM calculator.

export const AS_AT = "2026-10-15";

export const SOURCES = {
  S03: { title: "Registration overview of medical devices (evaluation routes)", url: "https://www.hsa.gov.sg/medical-devices/registration-of-medical-devices/register-your-device/overview/" },
  S06: { title: "Register Class B medical device via immediate route", url: "https://www.hsa.gov.sg/medical-devices/registration-of-medical-devices/register-your-device/guides/class-b-immediate-registration/" },
  S05: { title: "Registration guides (all classes and routes)", url: "https://www.hsa.gov.sg/medical-devices/registration-of-medical-devices/register-your-device/guides/" },
  S08: { title: "Register Class C medical device via expedited route", url: "https://www.hsa.gov.sg/medical-devices/registration-of-medical-devices/register-your-device/guides/class-c-expedited-registration/" },
  S10: { title: "Register Class D medical device via expedited route", url: "https://www.hsa.gov.sg/medical-devices/registration-of-medical-devices/register-your-device/guides/class-d-expedited-registration/" },
  S11: { title: "Fees and turnaround time for medical devices", url: "https://www.hsa.gov.sg/medical-devices/fees/" },
  S14: { title: "Apply for a medical device dealer's licence", url: "https://www.hsa.gov.sg/medical-devices/manufacturing-import-and-supply/dealers-licence/apply/" },
  S15: { title: "Quality Management System (QMS) for Medical Devices", url: "https://www.hsa.gov.sg/medical-devices/manufacturing-import-and-supply/dealers-licence/quality-management-system-(qms)-for-medical-devices/" },
  S16: { title: "SHARE (Medical Device) e-service", url: "https://www.hsa.gov.sg/e-services/share-medical-device/" },
  S17: { title: "Quick Guide to Medical Device Product Registration and Dealer Licensing, R9 (Apr 2026)", url: "https://go.gov.sg/quickguideapr2026" },
  S18: { title: "Is it a medical device (HSA self-help tool)", url: "https://selfhelp.hsa.gov.sg/hsa/mdc/is-medical-device" },
  S19: { title: "Medical device risk classification tool (HSA self-help tool)", url: "https://selfhelp.hsa.gov.sg/hsa/mdc/risk-classification" },
  S28: { title: "Register Class C medical device via immediate route", url: "https://www.hsa.gov.sg/medical-devices/registration-of-medical-devices/register-your-device/guides/class-c-immediate-registration/" },
  S27: { title: "GN-22 Guidance for Dealers on Class A Medical Devices (Jul 2025)", url: "https://isomer-user-content.by.gov.sg/409/8720aa0c-e069-4857-b7ce-dd67e3bb2040/gn-22-r8-guidance-for-dealers-on-class-a-medical-devices-(jul-2025)-pub.pdf" },
};

export const AGENCIES = [
  { value: "TGA", label: "Australia TGA (Device Registration Licence)" },
  { value: "EU", label: "EU Notified Body (qualifying EC/MDR/IVDR certificate)" },
  { value: "HC", label: "Health Canada" },
  { value: "MHLW", label: "Japan MHLW (Ninsho or Shonin)" },
  { value: "FDA", label: "US FDA (510(k), De Novo or PMA)" },
];

// S11, read 2026-10-15. Evaluation fee in SGD, turnaround in working days (null = immediate upon submission).
export const APPLICATION_FEE = 560;
export const ROUTE_FEES = {
  B: { immediate: [1000, null], abridged: [2010, 100], full: [3900, 160] },
  C: { immediate: [3340, null], ecr1: [3340, 120], ecr2: [3340, 120], abridged: [3900, 160], full: [6250, 220] },
  D: { edr: [5930, 180], abridged: [6250, 220], full: [12000, 310] },
  Ddrug: { abridged: [10600, 220], full: [75600, 310] },
};
export const LICENCE_FEE = 1110; // new or annual renewal, each licence, 10 working days (S11)
export const LICENCE_TAT_DAYS = 10;
export const REEXPORT_SAR_FEE = 280; // SAR: import for re-export of unregistered devices, 14 working days (S11)

const ROUTE_NAMES = {
  immediate: "Immediate route",
  ibr1: "Immediate Class B Registration (IBR), Condition 1",
  ibr2: "Immediate Class B Registration (IBR), Condition 2",
  ibrApp: "Immediate route for a standalone medical mobile application",
  cImmediateApp: "Immediate route for a standalone medical mobile application",
  ecr1: "Expedited Class C Registration (ECR-1)",
  ecr2: "Expedited Class C Registration (ECR-2)",
  edr: "Expedited Class D Registration (EDR)",
  abridged: "Abridged route",
  full: "Full route (Priority Review Scheme can be opted into)",
};

// ---------------------------------------------------------------------------
// Questions. `showIf` decides whether a screen is shown for the answers so far.
// The KLM calculator walks exactly this list, so the measured step count is the
// prototype's real step count.
// ---------------------------------------------------------------------------
export const QUESTIONS = [
  {
    id: "activities",
    type: "checkbox",
    prompt: "What will your company do with the device in Singapore?",
    help: "Choose all that apply.",
    options: [
      { value: "import", label: "Bring it into Singapore (import)" },
      { value: "wholesale", label: "Sell or supply it to other businesses, or export it (wholesale)" },
      { value: "manufacture", label: "Make, assemble, package or label it" },
      { value: "retail", label: "Sell it only to end users, such as patients or clinics" },
      { value: "reexport", label: "Import it only to re-export it, not for use in Singapore" },
    ],
    showIf: () => true,
  },
  {
    id: "acra",
    type: "radio",
    prompt: "Is your company registered with ACRA (does it have a UEN)?",
    options: [
      { value: "yes", label: "Yes" },
      { value: "no", label: "No, not yet" },
    ],
    showIf: () => true,
  },
  {
    id: "deviceClass",
    type: "radio",
    prompt: "What is the device's risk class in Singapore?",
    help: "If you have not checked, use HSA's self-help tools first (links on the result page).",
    options: [
      { value: "A", label: "Class A (low risk)" },
      { value: "B", label: "Class B" },
      { value: "C", label: "Class C" },
      { value: "D", label: "Class D (highest risk)" },
      { value: "unsure", label: "I don't know yet, or I'm not sure it is a medical device" },
    ],
    showIf: () => true,
  },
  {
    id: "special",
    type: "radio",
    prompt: "Does any of these describe the device?",
    options: [
      { value: "none", label: "None of these" },
      { value: "mobileApp", label: "It is solely a standalone medical mobile application", classes: ["B", "C"] },
      { value: "drugSecondary", label: "It contains a registrable drug in a secondary role", classes: ["D"] },
      { value: "excludedJoint", label: "Hip, knee or shoulder joint replacement implant", classes: ["C", "D"] },
      { value: "excludedImplant", label: "Active implantable device, or implant in contact with the central circulatory or nervous system", classes: ["D"] },
      { value: "excludedIvd", label: "IVD for HIV testing or blood/tissue donor compatibility testing", classes: ["D"] },
    ],
    showIf: (a) => needsRoute(a),
  },
  {
    id: "approvals",
    type: "checkbox",
    prompt: "Which overseas reference agencies have approved this device for the same labelled use you will sell in Singapore?",
    help: "Do not count approvals where the device was Class I or Class II-exempt in that jurisdiction.",
    options: AGENCIES.concat([{ value: "none", label: "None of these", exclusive: true }]),
    showIf: (a) => needsRoute(a),
  },
  {
    id: "mra",
    type: "radio",
    prompt: "Was the EU or the TGA approval granted on the basis of the other, under the EU-Australia Mutual Recognition Agreement?",
    options: [
      { value: "no", label: "No, each agency reviewed the device itself" },
      { value: "yes", label: "Yes, or I'm not sure" },
    ],
    showIf: (a) => needsRoute(a) && has(a.approvals, "EU") && has(a.approvals, "TGA") && a.deviceClass !== "B",
  },
  {
    id: "marketed3y",
    type: "radio",
    prompt: "Has the device been marketed for at least three years in the jurisdiction(s) of those approvals?",
    options: [
      { value: "yes", label: "Yes" },
      { value: "no", label: "No, or I'm not sure" },
    ],
    showIf: (a) => needsRoute(a) && countApprovals(a) >= 1 && ["B", "C"].includes(a.deviceClass) && a.special !== "drugSecondary",
  },
  {
    id: "safety",
    type: "radio",
    prompt: "In the last three years, has the device been linked anywhere in the world to a death, a serious deterioration in health, or an open field safety corrective action (including a recall)?",
    options: [
      { value: "no", label: "No" },
      { value: "yes", label: "Yes, or I'm not sure" },
    ],
    showIf: (a) => needsRoute(a) && countApprovals(a) >= 1 && ["B", "C"].includes(a.deviceClass) && a.special !== "drugSecondary",
  },
  {
    id: "rejection",
    type: "radio",
    prompt: "Has HSA or any of those agencies ever rejected the device, or has it been withdrawn?",
    options: [
      { value: "no", label: "No" },
      { value: "yes", label: "Yes, or I'm not sure" },
    ],
    showIf: (a) => needsRoute(a) && countApprovals(a) >= 1 && a.special !== "drugSecondary",
  },
];

export function optionsFor(question, answers) {
  return question.options.filter((o) => !o.classes || o.classes.includes(answers.deviceClass));
}

function has(list, v) {
  return Array.isArray(list) && list.includes(v);
}

// Placing the device on the Singapore market (as opposed to retail-only or re-export-only).
function supplies(a) {
  return Array.isArray(a.activities) && a.activities.some((x) => ["import", "wholesale", "manufacture"].includes(x));
}

function needsRoute(a) {
  return ["B", "C", "D"].includes(a.deviceClass) && supplies(a);
}

/** Number of qualifying reference-agency approvals (S03, S06, S08, S10). */
export function countApprovals(a) {
  const list = Array.isArray(a.approvals) ? a.approvals.filter((x) => AGENCIES.some((g) => g.value === x)) : [];
  let n = new Set(list).size;
  if (has(list, "EU") && has(list, "TGA")) {
    // Class B: "approved by both EU and TGA ... only be considered one approval" (S06).
    // Class C/D: MRA-based EU/TGA approvals do not qualify (S08, S10).
    if (a.deviceClass === "B" || a.mra !== "no") n -= 1;
  }
  return n;
}

/** Visible questions for the answers so far, in order. */
export function visibleQuestions(answers) {
  return QUESTIONS.filter((q) => q.showIf(answers));
}

/** Routes the device appears eligible for, fastest/cheapest first. */
export function eligibleRoutes(a) {
  if (!needsRoute(a)) return [];
  const n = countApprovals(a);
  const clean = a.safety === "no";
  const neverRejected = a.rejection === "no";
  const marketed = a.marketed3y === "yes";
  const app = a.special === "mobileApp";
  const excluded = typeof a.special === "string" && a.special.startsWith("excluded");
  const out = [];
  const add = (key, feeKey, table, extra = {}) => {
    const [fee, tat] = table[feeKey];
    out.push({ key, name: ROUTE_NAMES[key], evaluationFee: fee, applicationFee: APPLICATION_FEE, tatDays: tat, ...extra });
  };

  if (a.deviceClass === "B") {
    const t = ROUTE_FEES.B;
    if (app && n >= 1 && clean && neverRejected) add("ibrApp", "immediate", t, { forfeitWarning: true });
    if (n >= 1 && marketed && clean && neverRejected) add("ibr1", "immediate", t, { forfeitWarning: true, marketingHistory: true });
    if (n >= 2 && clean && neverRejected) add("ibr2", "immediate", t, { forfeitWarning: true, sourcesDiffer: "S03 lists 'no prior rejection/withdrawal' for IBR Condition 2; the Class B immediate guide (S06) does not." });
    if (n >= 1) add("abridged", "abridged", t);
    add("full", "full", t);
  } else if (a.deviceClass === "C") {
    const t = ROUTE_FEES.C;
    if (app && n >= 1 && clean && neverRejected) add("cImmediateApp", "immediate", t, { forfeitWarning: true });
    if (!excluded && n >= 1 && marketed && clean && neverRejected) add("ecr1", "ecr1", t, { marketingHistory: true, sourcesDiffer: "S03 lists 'no prior rejection/withdrawal' for ECR-1; the Class C expedited guide (S08) does not." });
    if (!excluded && n >= 2 && neverRejected) add("ecr2", "ecr2", t, { sourcesDiffer: "S03 lists 'no prior rejection/withdrawal' for ECR-2; the Class C expedited guide (S08) does not." });
    if (n >= 1) add("abridged", "abridged", t);
    add("full", "full", t);
  } else if (a.deviceClass === "D") {
    if (a.special === "drugSecondary") {
      const t = ROUTE_FEES.Ddrug;
      if (n >= 1) add("abridged", "abridged", t);
      add("full", "full", t);
    } else {
      const t = ROUTE_FEES.D;
      if (!excluded && n >= 2 && neverRejected) add("edr", "edr", t, { sourcesDiffer: "S03 lists 'no prior rejection/withdrawal' for EDR; the Class D expedited guide (S10) does not." });
      if (n >= 1) add("abridged", "abridged", t);
      add("full", "full", t);
    }
  }
  // Order by turnaround: immediate (null) first, then shortest TAT. Within a class,
  // a faster route is never more expensive, and Array.sort is stable for ties.
  out.sort((x, y) => (x.tatDays ?? -1) - (y.tatDays ?? -1));
  return out;
}

/** Dealer's licences needed (S14, S17). */
export function licencesNeeded(a) {
  const acts = Array.isArray(a.activities) ? a.activities : [];
  const out = [];
  if (acts.includes("import") || acts.includes("reexport")) out.push({ key: "importer", name: "Importer's licence" });
  if (acts.includes("wholesale") || acts.includes("reexport")) {
    out.push({
      key: "wholesaler",
      name: "Wholesaler's licence",
      note: acts.includes("manufacture") ? "Not needed for devices you manufacture under your own Manufacturer's licence." : undefined,
    });
  }
  if (acts.includes("manufacture")) out.push({ key: "manufacturer", name: "Manufacturer's licence" });
  for (const l of out) {
    l.fee = LICENCE_FEE;
    l.tatDays = LICENCE_TAT_DAYS;
    l.qms = qmsEvidence(l.key, a);
  }
  return out;
}

/** Acceptable QMS evidence for one licence (S14, S15, S17). */
export function qmsEvidence(licence, a) {
  const classAOnly = a.deviceClass === "A";
  const reexportOnly = Array.isArray(a.activities) && a.activities.length > 0 && a.activities.every((x) => x === "reexport");
  const cert = "issued by a certification body accredited by the Singapore Accreditation Council (SAC), with the audit report";
  if (licence === "manufacturer") {
    const opts = [`ISO 13485 certificate ${cert}`, "MDSAP certificate with the audit report"];
    if (classAOnly) opts.push("Declaration of Conformity to ISO 13485 (Class A only)");
    return opts;
  }
  const opts = [`GDPMDS (SS 620) certificate ${cert}`, `ISO 13485 certificate ${cert}`, "MDSAP certificate with the audit report"];
  if (classAOnly) opts.push("Declaration of Conformity to ISO 13485 or GDPMDS (Class A only)");
  if (reexportOnly) opts.push("Declaration for dealing with medical devices solely for export or re-export");
  return opts;
}

/** Documents for one registration route (S05 guides, read 2026-10-15). */
export function documentsFor(routeKey, deviceClass) {
  const base = [
    "Executive summary",
    "Device description",
    "Device labels",
    "Name and address of the manufacturing and sterilisation sites",
    "Proof of a QMS: ISO 13485, MDSAP, US FDA Quality System Regulations or Japan MHLW Ordinance 169",
    "Letter of Authorisation",
    "List of configurations of the medical device",
  ];
  const ep = ["Essential Principles Checklist", "Declaration of Conformity", "Risk analysis"];
  const approval = ["Proof of approval by the reference agency or agencies (approval letters or certificates)"];
  const history = ["Proof of marketing history in the same jurisdiction(s): dated invoice, proof of sale, declaration on marketing history"];
  const noSafety = ["Declaration of no safety issue globally"];
  const flow = deviceClass === "B" ? [] : ["Manufacturing process flow chart"];
  switch (routeKey) {
    case "ibr1":
    case "ibr2":
    case "ibrApp":
    case "cImmediateApp":
      return [
        ...base,
        "Summary of preclinical studies",
        ...(deviceClass === "B" ? ["Sterilisation validation (sterile devices only)"] : []),
        "Software verification and validation (standalone medical mobile applications only)",
        "Evidence supporting the cybersecurity of connected medical devices",
        ...approval,
        ...(routeKey === "ibr1" ? history : []),
        ...noSafety,
      ];
    case "ecr1":
      return [...base, ...ep, "Summary of design verification and validation, including preclinical, sterilisation and shelf-life studies (if applicable)", "Clinical Evaluation Report", ...flow, ...approval, ...history, ...noSafety];
    case "ecr2":
    case "edr":
    case "abridged":
      return [
        ...base,
        ...ep,
        "Summary of design verification and validation, including preclinical, sterilisation and shelf-life studies (if applicable)",
        deviceClass === "B" ? "Clinical Evaluation Report (if applicable)" : deviceClass === "C" ? "Clinical Evaluation Report" : "Summary of Clinical Evaluation Report",
        ...flow,
        ...approval,
      ];
    case "full":
    default:
      return [
        ...base,
        ...ep,
        "Full reports of preclinical studies (e.g. physical tests, biocompatibility, animal studies, software verification and validation)",
        "Sterilisation validation (if applicable)",
        "Shelf-life studies and projected useful life",
        "Clinical Evaluation Report, including publications and full reports of referenced studies",
        "Manufacturing process flow chart",
      ];
  }
}

/** The whole assessment, in the order the result page shows it. */
export function assess(a) {
  const blockers = [];
  const warnings = [];
  if (a.acra === "no") blockers.push({ text: "Register a business entity with ACRA first: medical device dealers must be ACRA-registered (S17), and HSA licences cannot be transferred from one UEN to another (S16).", source: "S17" });
  if (a.deviceClass === "unsure") blockers.push({ text: "Confirm the device is a medical device and find its risk class with HSA's self-help tools before choosing a registration route.", source: "S19" });

  const licences = licencesNeeded(a);
  const acts = Array.isArray(a.activities) ? a.activities : [];
  const retailOnly = acts.length > 0 && acts.every((x) => x === "retail");
  if (retailOnly) {
    warnings.push({ text: "A wholesaler's licence is not required for supply to end users, such as in a retail store. The devices you sell must still be registered (Class B, C, D) or notified (Class A) by a licensed dealer.", source: "S14" });
  }

  let product;
  const reexportOnly = acts.length > 0 && acts.every((x) => x === "reexport");
  if (retailOnly) {
    product = { kind: "retail-only", text: "No product registration application from you: buy from licensed dealers and check that Class B, C and D devices are listed on the Singapore Medical Device Register.", source: "S16" };
  } else if (reexportOnly) {
    product = { kind: "sar-reexport", text: "Product registration is not mandatory for import solely for re-export. Apply under the Special Access Route for import for re-export.", fee: REEXPORT_SAR_FEE, tatDays: 14, source: "S17" };
  } else if (a.deviceClass === "A") {
    product = { kind: "notification", text: "Class A devices are exempt from product registration. Manufacturers and importers submit a Product Notification in SHARE before import and keep it up to date.", source: "S27" };
  } else if (["B", "C", "D"].includes(a.deviceClass)) {
    const routes = eligibleRoutes(a);
    product = { kind: "registration", routes, recommended: routes[0], documents: documentsFor(routes[0].key, a.deviceClass), source: "S03" };
    if (routes[0].forfeitWarning) {
      warnings.push(a.deviceClass === "B"
        ? { text: "Immediate routes list the device on the register at submission. HSA states that an error in eligibility forfeits the registration and you re-apply through another route, with fees. Check every condition first.", source: "S06" }
        : { text: "If the application does not qualify for the immediate route, HSA requires you to withdraw it and submit a new one, and fees already paid are not refunded. Check every condition first.", source: "S28" });
    }
    for (const r of routes) if (r.sourcesDiffer) warnings.push({ text: `HSA pages differ on this route's conditions: ${r.sourcesDiffer} This tool applies the stricter reading; confirm with HSA.`, source: "S03" });
  } else {
    product = { kind: "unknown", text: "Route depends on the risk class.", source: "S19" };
  }

  const access = [
    { text: "Your Corppass administrator adds 'HSA E-Services: SHARE' to your company's e-services and gives you access.", source: "S17" },
    { text: "Product registration, product notification and dealer's licence applications are all made in SHARE, and can be made at the same time.", source: "S17" },
  ];
  warnings.push({ text: "HSA pages list payment methods differently (fees page: GIRO or eNETS; Quick Guide R9: GIRO or online card/PayNow, no cheques). Check before paying.", source: "S11" });

  const nextSteps = [];
  if (blockers.length) nextSteps.push("Clear the items under 'Do this first'.");
  nextSteps.push("Get Corppass access to SHARE for the person who will apply.");
  if (licences.length) nextSteps.push("Have your quality management system certified (or prepare the declaration that applies).");
  if (product.kind === "registration") nextSteps.push("Prepare the registration documents for the recommended route.");
  if (licences.length || ["registration", "notification", "sar-reexport"].includes(product.kind)) nextSteps.push("Apply in SHARE: licence and product applications can go in at the same time.");
  return { blockers, licences, product, access, warnings, nextSteps };
}

/** Indicative first-year HSA fees in SGD for the recommended path (excludes retention and certification body costs). */
export function indicativeFees(result) {
  let total = result.licences.reduce((s, l) => s + l.fee, 0);
  const p = result.product;
  if (p.kind === "registration") total += p.recommended.applicationFee + p.recommended.evaluationFee;
  if (p.kind === "sar-reexport") total += p.fee;
  return total;
}

/** Plain-text rendering of the result page; used by the UI and to count words for the KLM reading estimate. */
export function resultText(result) {
  const lines = ["Your next steps:", ...result.nextSteps.map((x, i) => `${i + 1}. ${x}`)];
  for (const b of result.blockers) lines.push(`Before you start: ${b.text}`);
  lines.push("Licences you need:");
  if (result.licences.length === 0) lines.push("No dealer's licence.");
  for (const l of result.licences) {
    lines.push(`${l.name}: $${l.fee.toLocaleString("en-SG")} a year, about ${l.tatDays} working days.${l.note ? " " + l.note : ""}`);
    lines.push(`Quality system evidence, one of: ${l.qms.join("; ")}.`);
  }
  const p = result.product;
  if (p.kind === "registration") {
    const r = p.recommended;
    lines.push(`Product registration route: ${r.name}. Fees: $${r.applicationFee} application + $${r.evaluationFee.toLocaleString("en-SG")} evaluation. Turnaround: ${r.tatDays === null ? "immediate on submission" : r.tatDays + " working days"}.`);
    if (p.routes.length > 1) lines.push(`Other routes open to you: ${p.routes.slice(1).map((x) => x.name).join("; ")}.`);
    lines.push("Documents to prepare:");
    for (const d of p.documents) lines.push(`- ${d}`);
  } else {
    lines.push(p.text);
  }
  lines.push("Getting access:");
  for (const x of result.access) lines.push(x.text);
  for (const w of result.warnings) lines.push(`Check: ${w.text}`);
  return lines.join("\n");
}
