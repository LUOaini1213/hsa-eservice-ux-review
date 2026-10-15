// Keystroke-Level Model calculator (pure functions; see scripts/klm.mjs for the CLI).

/** "M P B B K*3 R:S01" -> ["M","P","B","B","K","K","K","R:S01"] */
export function parseOps(str) {
  const out = [];
  for (const tok of String(str).trim().split(/\s+/).filter(Boolean)) {
    const m = tok.match(/^([KPBHM])\*(\d+)$/);
    if (m) {
      for (let i = 0; i < Number(m[2]); i++) out.push(m[1]);
    } else if (/^[KPBHM]$/.test(tok) || /^R:[A-Za-z0-9]+$/.test(tok)) {
      out.push(tok);
    } else {
      throw new Error(`Unknown KLM operator '${tok}'`);
    }
  }
  return out;
}

/** Operator string for one form field. */
export function fieldOps(field, chars = field.chars) {
  const one = {
    text: `M P B B H K*${chars} H`,
    check: "M P B B",
    dropdown: "M P B B P B B",
    upload: "M P B B P B B B B",
  }[field.kind];
  if (!one) throw new Error(`Unknown field kind '${field.kind}'`);
  return Array(field.repeat || 1).fill(one).join(" ");
}

/** Time and counts for a list of operator tokens. `r` maps R ids to seconds. */
export function score(tokens, c, r) {
  const counts = { K: 0, P: 0, B: 0, H: 0, M: 0, R: 0 };
  let operator = 0;
  let response = 0;
  for (const t of tokens) {
    if (t.startsWith("R:")) {
      const id = t.slice(2);
      if (!(id in r)) throw new Error(`No response time for ${id}`);
      counts.R += 1;
      response += r[id];
    } else {
      counts[t] += 1;
      operator += c[t];
    }
  }
  return { counts, operatorSeconds: operator, responseSeconds: response };
}

/**
 * Score a journey of steps: [{ops, read?, decision?, deadEnd?}].
 * words: map source id -> word count; each source's words are counted once.
 */
export function scoreJourney(steps, c, r, words) {
  const tokens = steps.flatMap((s) => parseOps(s.ops));
  const s = score(tokens, c, r);
  const readIds = [...new Set(steps.flatMap((x) => x.read || []))];
  const extraWords = steps.reduce((n, x) => n + (x.words || 0), 0);
  const wordsRead = readIds.reduce((n, id) => {
    if (!(id in words)) throw new Error(`No word count for ${id}`);
    return n + words[id];
  }, 0) + extraWords;
  const pageLoads = tokens.filter((t) => t.startsWith("R:")).length;
  const deadEnds = steps.filter((x) => x.deadEnd).length;
  return {
    steps: steps.length,
    pageLoads,
    distinctPages: new Set(tokens.filter((t) => t.startsWith("R:") && t !== "R:dead").map((t) => t.slice(2))).size,
    deadEnds,
    decisions: steps.filter((x) => x.decision).length,
    clicks: s.counts.B / 2,
    keystrokes: s.counts.K,
    mentalOps: s.counts.M,
    counts: s.counts,
    operatorSeconds: round(s.operatorSeconds),
    responseSeconds: round(s.responseSeconds),
    klmSeconds: round(s.operatorSeconds + s.responseSeconds),
    wordsRead,
    readingSeconds: round((wordsRead / c.readingWpm) * 60),
  };
}

/** Turn a form journey (navigation + fields + finish) into steps. */
export function formSteps(journey, overrides = {}) {
  const steps = [...journey.navigation];
  for (const f of journey.fields) {
    const chars = overrides[f.label] ?? f.chars;
    steps.push({ action: `Fill: ${f.label}`, ops: fieldOps(f, chars), field: true });
  }
  return steps.concat(journey.finish);
}

export function wordCount(text) {
  return String(text).split(/\s+/).filter(Boolean).length;
}

/**
 * Redesigned journey generated from the prototype's own question model.
 * rules: the docs/rules.js module; answers: persona answers.
 */
export function prototypeSteps(rules, answers, loadId = "PAGES", entryId = "S01") {
  const qs = rules.visibleQuestions(answers);
  // Same starting point as the current journey: HSA's Medical devices page, which in the
  // redesign would link to the checker.
  const steps = [
    { action: "Open HSA Medical devices page (from a search result)", ops: `R:${entryId}`, read: [entryId] },
    { action: "Choose the checker link", ops: `M P B B R:${loadId}`, words: wordCount("Independent concept prototype, not an HSA service. Medical device market-entry checker. Answer a few questions to see which dealer's licences, product registration route, fees and documents apply to you, on one page.") },
  ];
  qs.forEach((q, i) => {
    const opts = rules.optionsFor(q, answers);
    const ans = answers[q.id];
    const picks = Array.isArray(ans) ? ans.length : 1;
    const text = [`Question ${i + 1} of ${qs.length}`, q.prompt, q.help || "", ...opts.map((o) => o.label), "Continue"].join(" ");
    steps.push({
      action: `Answer: ${q.prompt}`,
      ops: ["M", ...Array(picks).fill("P B B"), "P B B"].join(" "),
      words: wordCount(text),
      decision: q.prompt,
    });
  });
  const result = rules.assess(answers);
  steps.push({ action: "Read the result page (licences, route and fees, documents, access, checks)", ops: "M M M M", words: wordCount(rules.resultText(result)) });
  return steps;
}

export function round(x) {
  return Math.round(x * 10) / 10;
}
