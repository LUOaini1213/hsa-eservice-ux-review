# Scope and method

## What this is

An independent, outside review of two public-facing HSA regulatory e-service journeys, carried out on 15 October 2026 from public information only. It is not commissioned by, affiliated with or endorsed by the Health Sciences Authority. No account was created, nobody logged in, and no form was submitted. Interactive self-help tools were inspected through their public page data rather than by stepping through them, and the FormSG form was read through its public form definition.

HSA runs a large and mostly well-organised site. The findings below are offered as specific, checkable observations, each with its source, so that they can be confirmed or corrected quickly.

## Journeys reviewed

| Journey | Who | Goal | Why chosen |
|---|---|---|---|
| A. Medical device market entry | A company placing a medical device on the Singapore market | Find out which dealer's licences, product registration route, fees and documents apply, and how to get access to SHARE | It is the first regulatory journey a new dealer meets, it spans the most pages and tools, and an error has a cost: HSA states that a wrong immediate-route choice forfeits the registration or the fees. |
| B. Adverse event reporting for medical devices | B1: a licensed dealer (mandatory report). B2: a device user or healthcare institution (voluntary report) | Report an adverse event in the required format and time | It runs under statutory deadlines (48 hours to 30 days) and HSA offers two very different channels for it, which makes a useful comparison. |

Both journeys can be examined without logging in: the guidance pages, fee tables, the Quick Guide, the self-help tools, the dealer's Word form and the users' FormSG form are all public. The parts behind Corppass (SHARE itself) were out of scope.

## Personas used for task analysis

These are planning personas, not research participants. Nothing about them was collected from real people.

- **P1**: regulatory executive at a Singapore distributor (ACRA-registered). Will import and wholesale a Class B device that has US FDA 510(k) clearance, has been sold in the US for over three years, has no safety issues and was never rejected.
- **P2**: as P1, but importing a Class C device whose EU and TGA approvals came via the EU-Australia Mutual Recognition Agreement, marketed for under three years.
- **P3**: regulatory executive at a licensed importer filing the initial mandatory report for a serious deterioration in health.
- **P4**: nurse at a GP clinic reporting a device problem with the users' e-form.

## Methods

1. **Evidence capture.** `scripts/fetch_sources.py` fetched 37 public sources (29 HSA pages, forms and guides, 8 GovTech standards pages), recorded HTTP status, SHA-256, word count and median response time over three requests (`evidence/sources.csv`), and audited 560 links on 24 HSA web pages (`evidence/link-audit.csv`). Page copies stay local (`evidence/snapshots/`, git-ignored) so HSA content is not redistributed; short quotes are kept as evidence.
2. **Self-help tool inspection.** `scripts/selfhelp_tree.py` read the decision trees embedded in the three public self-help tools and counted questions, results, path lengths and link targets (`evidence/selfhelp-trees.json`).
3. **Heuristic evaluation.** Each page in the journeys was reviewed against Nielsen's ten usability heuristics and the GovTech Digital Service Standards (DSS) control catalogue, with the Singapore Government Design System (SGDS) as the reference for patterns. Severity uses Nielsen's 0 to 4 scale, judged on frequency, impact and persistence. Every issue cites at least one evidence row.
4. **Evidence verification.** `scripts/verify_evidence.py` checks every quote against the page text and every link against the link audit (`evidence/verification.txt`; every row passed). It was itself checked by altering two quotes and confirming both were reported as failures.
5. **Screenshots.** Annotated screenshots of the key issues are in `evidence/screenshots/`. Annotations are marked as reviewer annotations.
6. **Task analysis.** Step counts, decision points, documents and a Keystroke-Level Model (KLM) estimate for each journey (`review/03-task-analysis.md`, numbers in `review/klm-results.md`).
7. **Redesign prototype** for the worst-rated flow, measured with the same KLM method (`review/04-redesign.md`).
8. **Usability test plan** for the candidate to run with five classmates (`testing/`). No participant data exists yet, and none is reported.

## Limitations

- **One evaluator.** Nielsen's own data suggests a single evaluator finds about a third of the problems that three to five evaluators find. The test plan includes an independent severity re-rating by classmates.
- **Expert review, not user evidence.** Severity ratings are judgements. They become evidence only when the usability test is run.
- **A snapshot.** Pages change after the review date, so some findings may already be fixed. The reviewed pages show page-level update dates from 13 March to 13 July 2026, and every evidence row records when its source was fetched.
- **KLM models skilled, error-free execution.** It leaves out searching, reading, thinking about the rules and gathering information, so the times are lower bounds. Reading time is reported separately as an upper bound.
- **Rules in the prototype are transcriptions.** They were copied from HSA's public pages for prototyping and are not regulatory advice. Where pages disagree, the prototype takes the stricter reading and says so.
