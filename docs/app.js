import { QUESTIONS, SOURCES, AS_AT, visibleQuestions, optionsFor, assess, indicativeFees, resultText } from "./rules.js";

const app = document.getElementById("app");
const state = { answers: {}, step: 0 };

function progressTotal(answers) {
  // Upper bound on how many questions this user can still see, so the counter never overstates the length.
  const guess = { activities: ["import"], deviceClass: "C", approvals: ["EU", "TGA", "FDA"], ...answers };
  const now = visibleQuestions(answers).length;
  const upper = Math.max(now, visibleQuestions(guess).length);
  return { now, upper };
}

function el(tag, attrs = {}, ...kids) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") n.className = v;
    else if (k.startsWith("on")) n.addEventListener(k.slice(2), v);
    else if (v !== undefined && v !== null && v !== false) n.setAttribute(k, v === true ? "" : v);
  }
  for (const k of kids.flat()) if (k !== null && k !== undefined && k !== false) n.append(k.nodeType ? k : document.createTextNode(String(k)));
  return n;
}

function sourceLink(id) {
  const s = SOURCES[id];
  if (!s) return null;
  return el("a", { href: s.url, class: "src", target: "_blank", rel: "noopener" }, `Source: ${s.title} (opens in new tab)`);
}

function renderQuestion() {
  const qs = visibleQuestions(state.answers);
  const q = qs[state.step];
  const { now, upper } = progressTotal(state.answers);
  const counter = upper > now ? `Question ${state.step + 1} of up to ${upper}` : `Question ${state.step + 1} of ${now}`;
  const opts = optionsFor(q, state.answers);
  const current = state.answers[q.id];
  const error = el("p", { class: "error", id: "err", role: "alert", hidden: true });

  const fs = el("fieldset", { "aria-describedby": q.help ? "help" : undefined },
    el("legend", {}, el("h2", { tabindex: "-1", id: "qh" }, q.prompt)),
    q.help ? el("p", { class: "help", id: "help" }, q.help) : null,
    error,
    ...opts.map((o, i) => {
      const id = `${q.id}-${i}`;
      const checked = q.type === "checkbox" ? Array.isArray(current) && current.includes(o.value) : current === o.value;
      const input = el("input", { type: q.type, name: q.id, id, value: o.value, checked, "data-exclusive": o.exclusive ? "1" : undefined });
      input.addEventListener("change", () => {
        if (q.type !== "checkbox" || !input.checked) return;
        // "None of these" clears the others, and any agency clears "None of these".
        for (const other of fs.querySelectorAll(`input[name="${q.id}"]`)) {
          if (other !== input && (input.dataset.exclusive || other.dataset.exclusive)) other.checked = false;
        }
      });
      return el("div", { class: "opt" }, input, el("label", { for: id }, o.label));
    }),
  );

  const form = el("form", { novalidate: true, onsubmit: (e) => {
    e.preventDefault();
    const picked = [...form.querySelectorAll(`input[name="${q.id}"]:checked`)].map((x) => x.value);
    if (picked.length === 0) {
      error.textContent = q.type === "checkbox" ? "Choose at least one option." : "Choose an option.";
      error.hidden = false;
      form.querySelector("input").focus();
      return;
    }
    state.answers[q.id] = q.type === "checkbox" ? [...new Set(picked)] : picked[0];
    // Answers to questions that are no longer shown must not influence the result.
    const shown = new Set(visibleQuestions(state.answers).map((x) => x.id));
    for (const k of Object.keys(state.answers)) if (!shown.has(k)) delete state.answers[k];
    state.step += 1;
    render();
  } },
    fs,
    el("div", { class: "actions" },
      state.step > 0 ? el("button", { type: "button", class: "secondary", onclick: () => { state.step -= 1; render(); } }, "Back") : null,
      el("button", { type: "submit" }, "Continue"),
    ),
  );

  app.replaceChildren(
    el("p", { class: "counter" }, counter),
    el("div", { class: "bar", role: "progressbar", "aria-valuemin": 0, "aria-valuemax": upper, "aria-valuenow": state.step, "aria-label": "Progress" },
      el("span", { style: `width:${Math.round((100 * state.step) / upper)}%` })),
    form,
  );
  document.getElementById("qh").focus();
}

function renderResult() {
  const r = assess(state.answers);
  const sections = [];
  sections.push(el("section", { class: "card" }, el("h3", {}, "Your next steps"),
    el("ol", {}, r.nextSteps.map((x) => el("li", {}, x)))));
  if (r.blockers.length) {
    sections.push(el("section", { class: "card blocker" }, el("h3", {}, "Do this first"),
      el("ul", {}, r.blockers.map((b) => el("li", {}, b.text, " ", sourceLink(b.source))))));
  }
  sections.push(el("section", { class: "card" }, el("h3", {}, "1. Dealer's licences"),
    r.licences.length === 0 ? el("p", {}, "No dealer's licence for these activities.") : null,
    ...r.licences.map((l) => el("div", { class: "item" },
      el("p", { class: "strong" }, `${l.name}: $${l.fee.toLocaleString("en-SG")} (new or annual renewal), about ${l.tatDays} working days`),
      l.note ? el("p", { class: "note" }, l.note) : null,
      el("p", {}, "Quality management system evidence: upload one of these"),
      el("ul", {}, l.qms.map((x) => el("li", {}, x))),
    )),
    sourceLink("S14"), sourceLink("S15"),
  ));

  const p = r.product;
  if (p.kind === "registration") {
    const rec = p.recommended;
    sections.push(el("section", { class: "card" }, el("h3", {}, "2. Product registration"),
      el("p", { class: "strong" }, `Fastest route you appear to qualify for: ${rec.name}`),
      el("p", {}, `HSA fees: $${rec.applicationFee} application + $${rec.evaluationFee.toLocaleString("en-SG")} evaluation. Turnaround: ${rec.tatDays === null ? "immediate on submission" : `${rec.tatDays} working days`}, excluding time you take to answer HSA's questions.`),
      p.routes.length > 1 ? el("details", {}, el("summary", {}, `Other routes open to you (${p.routes.length - 1})`),
        el("ul", {}, p.routes.slice(1).map((x) => el("li", {}, `${x.name}: $${x.applicationFee} + $${x.evaluationFee.toLocaleString("en-SG")}, ${x.tatDays === null ? "immediate" : x.tatDays + " working days"}`)))) : null,
      el("h4", {}, "Documents to prepare (all in English)"),
      el("ul", { class: "check" }, p.documents.map((d) => el("li", {}, el("label", {}, el("input", { type: "checkbox" }), " ", d)))),
      sourceLink("S03"), sourceLink("S05"), sourceLink("S11"),
    ));
  } else {
    sections.push(el("section", { class: "card" }, el("h3", {}, "2. Product registration"), el("p", {}, p.text), sourceLink(p.source),
      p.kind === "unknown" ? el("p", {}, el("a", { href: SOURCES.S18.url, target: "_blank", rel: "noopener" }, "Is it a medical device? (HSA tool)"), " · ",
        el("a", { href: SOURCES.S19.url, target: "_blank", rel: "noopener" }, "Risk classification tool (HSA)")) : null));
  }

  sections.push(el("section", { class: "card" }, el("h3", {}, "3. Getting access to SHARE"),
    el("ol", {}, r.access.map((x) => el("li", {}, x.text))), sourceLink("S17"), sourceLink("S16")));

  if (r.warnings.length) {
    sections.push(el("section", { class: "card warn" }, el("h3", {}, "Check before you apply"),
      el("ul", {}, r.warnings.map((w) => el("li", {}, w.text, " ", sourceLink(w.source))))));
  }

  const total = indicativeFees(r);
  const text = resultText(r);
  app.replaceChildren(
    el("h2", { tabindex: "-1", id: "rh" }, "What applies to you"),
    el("p", { class: "summary" }, `Indicative first-year HSA fees for this path: $${total.toLocaleString("en-SG")} `,
      el("span", { class: "muted" }, "(excludes annual register retention fees and certification body costs)")),
    ...sections,
    el("div", { class: "actions" },
      el("button", { type: "button", class: "secondary", onclick: () => { state.step = 0; render(); } }, "Change answers"),
      el("button", { type: "button", onclick: () => window.print() }, "Print or save as PDF"),
      el("button", { type: "button", class: "secondary", onclick: async (e) => {
        try { await navigator.clipboard.writeText(text); e.target.textContent = "Copied"; } catch { e.target.textContent = "Copy failed - use Print"; }
      } }, "Copy as text"),
    ),
  );
  document.getElementById("rh").focus();
}

function render() {
  const qs = visibleQuestions(state.answers);
  if (state.step >= qs.length) renderResult();
  else renderQuestion();
  window.scrollTo(0, 0);
}

document.getElementById("asat").textContent = AS_AT;
render();
