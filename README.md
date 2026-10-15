# HSA e-service UX review

An independent usability review of two public Health Sciences Authority (HSA) e-service journeys for medical devices, carried out on 15 October 2026 from public pages, forms and guides only. It contains a severity-rated issue log, a task analysis with Keystroke-Level Model (KLM) estimates, an interactive redesign prototype for the worst-rated flow, and a moderated usability test plan ready to run.

**Prototype:** <https://luoaini1213.github.io/hsa-eservice-ux-review/>

> This is an outside review. It is not commissioned by, affiliated with or endorsed by HSA. No account was created, nobody logged in, and nothing was submitted. Rules in the prototype are transcribed from HSA's public pages for prototyping and are not regulatory advice.

## Journeys

- **A. Medical device market entry.** A company works out which dealer's licences, registration route, fees and documents apply before applying in SHARE.
- **B. Adverse event reporting.** B1: a licensed dealer files a mandatory report with HSA's Word form. B2: a device user or clinic reports through HSA's FormSG e-form.

## Headline findings

1. **The requirements checker that HSA links to cannot be reached.** The Registration overview's "Check device's route" button links to google.com (A-01). The tools page and the result screens of all three self-help tools link to the checker at two URLs that both return 404 (A-02): 51 of 52 risk-classification results, 12 of 18 grouping results and 1 of 3 "is it a medical device" results. A link audit of 552 links on 24 HSA web pages found 6 failures, all pointing to this checker.
2. **Route conditions differ between pages, and a wrong choice is costly.** The Registration overview lists "no prior rejection/withdrawal" for IBR Condition 2, ECR-1, ECR-2 and EDR; the route guides omit it, and rules on counting EU and TGA approvals appear only in the guides (A-03). HSA states that an eligibility error on an immediate route forfeits the registration or the fees (A-04).
3. **Answering "what do I need?" takes 13 pages.** For a Class B importer and wholesaler (persona P1), the current journey needs 30 steps, 19 page loads, 2 dead ends and 9 points of rule interpretation or arithmetic (A-06).
4. **Dealers report adverse events by emailing a Word form** with a 2 MB limit and no acknowledgement or tracking at submission (B-01). KLM execution time for an initial report is 12 min 36 s before any IMDRF or GMDN look-up, against the form's own "15 minutes" (B-02). The users' FormSG form, by contrast, takes about 2 min 25 s and offers a photo-of-label option (P-03).

26 issues in all (5 major, 11 minor, 10 cosmetic) plus 4 strengths: see the [issue log](review/02-issue-log.md).

## Redesign result (persona P1, model estimates)

| | Current | Prototype | Change |
|---|---:|---:|---:|
| Steps | 30 | 11 | -63.3% |
| Page loads | 19 | 2 | -89.5% |
| Interpretive decisions | 9 | 0 | replaced by 8 factual questions |
| KLM time | 97 s | 42.7 s | -56% |
| Reading, upper bound | 28:45 | 4:13 | -85.4% |

Across 27 combinations of operator times and reading speeds the KLM reduction stays between 55.6% and 56.7%. These are model estimates; the [test plan](testing/usability-test-plan.md) is designed to check them with people. Full numbers: [klm-results.md](review/klm-results.md).

## Contents

| Path | What |
|---|---|
| [review/01-scope-and-method.md](review/01-scope-and-method.md) | Scope, personas, method, limitations |
| [review/02-issue-log.md](review/02-issue-log.md) | Severity-rated issues with evidence and recommendations (generated from `data/issues.csv` and `data/evidence.csv`) |
| [review/03-task-analysis.md](review/03-task-analysis.md) | Goal hierarchies, decision points, drop-off risks |
| [review/klm-results.md](review/klm-results.md) | KLM tables, sensitivity analysis, full step listings (generated) |
| [review/04-redesign.md](review/04-redesign.md) | Prototype rationale and measured effect |
| [testing/](testing/) | Moderated test plan, consent script, session log template, SUS scorer |
| [docs/](docs/) | The prototype (static HTML/CSS/JS, published with GitHub Pages) |
| [evidence/](evidence/) | Source list with hashes and response times, link audit, quote verification, self-help tree summary, screenshots |
| [scripts/](scripts/) | Evidence capture (Python, local only) and KLM and report generation (Node) |
| [tests/](tests/) | Unit tests, integrity tests and the mutation check |

## Reproducing

Node 20 or later, no dependencies.

```sh
node --test tests/*.test.mjs        # unit and integrity tests
node scripts/klm.mjs                # recompute task-analysis numbers
node scripts/render_issues.mjs      # rebuild the issue log
node tests/mutate.mjs               # mutation check on the prototype's rules
```

Re-capturing evidence needs Python 3 with `requests` and `beautifulsoup4`, and network access:

```sh
python scripts/fetch_sources.py     # fetch sources, hash them, audit links
python scripts/selfhelp_tree.py     # summarise the self-help decision trees
python scripts/verify_evidence.py   # check every quote and link in data/evidence.csv
```

Page copies are kept out of the repository (`evidence/snapshots/` is git-ignored), so the scripts re-fetch the live pages; results will differ once HSA updates them.

## Engineering checks

- The prototype's rules (`docs/rules.js`) are pure functions shared by the page, the tests and the KLM calculator, so the measured journey is the real one.
- The mutation check changes the rules one operator or constant at a time and fails if any change goes unnoticed. Its first run let 19 of 171 mutants survive; the tests were strengthened until every mutant was killed. CI also runs it against a deliberately weak test suite and requires that run to fail.
- CI fails if a generated report is stale or if a number quoted in the issue log or the docs no longer matches the computed results.

## Licence

MIT. HSA and GovTech content quoted as evidence remains theirs; quotes are kept short and cited.
