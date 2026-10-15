# Redesign: medical device market-entry checker

Live prototype: <https://luoaini1213.github.io/hsa-eservice-ux-review/> (source in `docs/`).

## Problem it addresses

HSA already intends applicants to answer "what do I need?" with a requirements checker, and links to it from five places. None of those links works (A-01, A-02). Without it, persona P1 needs 13 pages or files and 9 interpretive decisions (A-06), and can be misled by conditions that differ between pages (A-03).

## What the prototype does

One page, one question per screen, then a single result:

1. Activities in Singapore (import, wholesale, manufacture, retail only, re-export only).
2. ACRA registration.
3. Risk class, with "I don't know" sending the user to HSA's own self-help tools.
4. Special categories that change the route (standalone mobile app, drug in a secondary role, devices excluded from expedited routes), filtered by class.
5. Reference-agency approvals, with the EU/TGA counting rule asked only when it matters.
6. Marketing history, safety history and prior rejection, asked only when they can change the answer.

The result page shows, in order: next steps; anything to do first; the dealer's licences with fee, turnaround and acceptable QMS evidence; the fastest eligible registration route with application and evaluation fees, turnaround and the other open routes; the document checklist for that route; how to get SHARE access; and warnings where HSA's own pages disagree. Every block cites the HSA page it came from.

Persona P1 answers 8 questions; a Class A importer answers 3; a retailer answers 3.

## Design decisions

| Decision | Reason | Issue |
|---|---|---|
| Ask facts, compute the route | Users know their device's approvals and history; they should not have to interpret route conditions | A-03, A-06 |
| Stricter reading when pages disagree, with a visible warning | A wrong immediate-route choice is costly; the tool should never be more permissive than any HSA page | A-03, A-04 |
| Show fees as "application + evaluation" and an indicative first-year total | Removes arithmetic across tables | A-08 |
| Progress counter shows "of up to N" when later questions depend on answers | Avoids the overstated "of 15" pattern | A-11 |
| QMS evidence as a plain "one of these" list, documents as a checklist | A checkbox list implies "tick all"; QMS evidence is a choice of one | B-07 (same pattern) |
| Answers to questions that are no longer shown are discarded | Changing an earlier answer cannot leave a stale answer driving the result | WU-12 |
| Plain-language option labels; regulatory terms kept where users must recognise them later in SHARE | Matches users' words without hiding the terms they will meet next | BD-4, H2 |
| Patterns follow SGDS components (stepper-style progress, radio and checkbox groups, alerts) but the prototype does not use the government masthead or any HSA branding | It is not a government service and must not look like one | TL-3 |
| Keyboard operable, visible focus, 44 px targets, focus moved to each new question, errors announced | DSS WCAG controls | WO-1, WO-13, WO-18, WU-10 |
| Print or copy the result | The result becomes a working checklist for the applicant's team | |

## Where the rules come from

`docs/rules.js` holds every rule, fee and document list with the HSA source it was transcribed from (as read on 15 October 2026). The same module drives the page, the unit tests and the KLM calculation, so the measured journey is the real one. A mutation check (`tests/mutate.mjs`) changes the rules one operator or constant at a time and requires the tests to catch every change; a deliberately weak test suite is run in CI to prove the check can fail.

## Measured effect (persona P1)

From [klm-results.md](klm-results.md), starting both journeys on HSA's Medical devices page:

- Steps: 30 to 11.
- Page loads: 19 to 2; dead ends: 2 to 0.
- Interpretive decisions: 9 to 0, replaced by 8 factual questions.
- KLM execution time and reading-time upper bounds are reported with a 27-case sensitivity analysis in [klm-results.md](klm-results.md).

These are model estimates, not observed times. The usability test plan (`testing/`) is designed to check them with people.

## What it does not do

- It does not replace HSA's risk classification tool or grouping tool; it links to them.
- It does not cover Priority Review Scheme eligibility, change notifications, Special Access Routes other than import for re-export, or clinical trials.
- It is not regulatory advice and does not submit anything to HSA.

## If HSA built it

The rules would live in one maintained table that also renders the overview table and the route guides, so the pages and the checker could not drift apart (A-03). The result could pre-fill the SHARE application, and the same pattern would suit other HSA product groups that share the licence-plus-registration structure.
