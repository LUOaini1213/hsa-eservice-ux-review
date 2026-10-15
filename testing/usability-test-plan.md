# Moderated usability test plan

Status: **ready to run, not yet run.** No participant data exists in this repository. Results will be added only after real sessions, in the format of `session-log-template.csv`.

## Purpose

Check, with people, what the expert review predicts:

1. Do people following HSA's current pages reach the right answer for licences, route, fees and documents, and where do they stop or go wrong? (Issues A-01 to A-09.)
2. Does the prototype let them reach the right answer faster, with fewer errors and more confidence?
3. Can people find the right adverse event reporting channel and deadline? (Issues B-01, B-04, B-08.)
4. Do participants agree with the severity ratings? (Independent re-rating after the sessions.)

## Hypotheses (written before any session)

- H1. Task success on the prototype is at least as high as on HSA's pages.
- H2. Median time on task is lower on the prototype than on HSA's pages.
- H3. The prototype's System Usability Scale (SUS) score is at least 68, the commonly used average.
- H4. At least 3 of 5 participants on HSA's pages try the "Check device's route" button or the tools-page link, and none of those reaches a requirements checker.

With five participants these are checked descriptively, not with significance tests.

## Participants

Five classmates, recruited by the candidate. They are proxies for first-time applicants: they know nothing about HSA licensing, which is the situation of a new small distributor's staff. They are not regulatory professionals; findings about expert workflows are out of scope.

Screener (exclude if yes to any): has worked in medical device regulatory affairs; has used SHARE; has read HSA's medical device pages in the past year.

## Design

Within-subjects. Each participant uses both interfaces, each with a different scenario so the second task is not a repeat:

| Participant | First | Second |
|---|---|---|
| P1 | HSA pages, scenario X | Prototype, scenario Y |
| P2 | Prototype, scenario X | HSA pages, scenario Y |
| P3 | HSA pages, scenario Y | Prototype, scenario X |
| P4 | Prototype, scenario Y | HSA pages, scenario X |
| P5 | HSA pages, scenario X | Prototype, scenario Y |

Order and scenario are counterbalanced as far as five people allow (3 start on HSA's pages, 2 on the prototype).

## Scenarios (printed cards)

**Scenario X.** "You work for a small Singapore company with a UEN. It will import a device and sell it to clinics and other distributors. HSA's risk classification tool says it is Class B. It has US FDA 510(k) clearance for the same use and has been sold in the US for five years with no deaths, serious injuries or recalls. No regulator has ever rejected it."

Correct answer: Importer's and Wholesaler's licences; GDPMDS, ISO 13485 or MDSAP certificate; Immediate Class B Registration (Condition 1); $560 application + $1,000 evaluation fee, immediate on submission; documents include proof of FDA clearance, proof of marketing history and a declaration of no safety issue.

**Scenario Y.** "Same company. Another device, Class C, approved by Japan's MHLW and by Health Canada for the same use, sold for two years. In the last three years there was one recall that is now closed. No regulator has rejected it. Your company will only import it; a partner does the selling."

Correct answer: Importer's licence only; expedited route ECR-2 (two approvals, no rejection; the three-year and safety conditions apply to ECR-1 only); $560 + $3,340, 120 working days.

Facilitators must check both answers against HSA's pages on the day of the test, because rules and fees may have changed.

## Tasks

| # | Task (read aloud) | Interface | Success criteria |
|---|---|---|---|
| T1 | "Using [interface], find out which licences your company needs, which registration route the device can use, what HSA will charge and how long it takes, and what documents you will need. Tell me when you are done." | HSA pages (start at hsa.gov.sg/medical-devices) or prototype | Full: licences, route, fees and at least 3 route-specific documents correct. Partial: licences and route correct. Fail: either wrong, or gives up |
| T2 | Same as T1 with the other scenario | The other interface | As T1 |
| T3 | "One of your devices was involved in an incident where a patient was seriously hurt. Find out how your company must report it to HSA and by when. Do not fill in or send anything." | HSA pages (start at hsa.gov.sg) | Finds the dealer form and states 10 calendar days |

Stop each task at 15 minutes (T1, T2) or 7 minutes (T3).

Nothing is submitted to HSA at any point. The moderator watches for any form submission or email and stops the task first.

## Measures

| Measure | How |
|---|---|
| Task success | Full / partial / fail against the criteria above |
| Time on task | From the end of the task reading to the participant saying "done" or giving up |
| Errors | Wrong licence, wrong route, wrong fee, wrong deadline (each counted) |
| Path | Pages visited and dead ends hit, noted live or from the screen recording |
| Single Ease Question (SEQ) | After each task: "Overall, how easy or difficult was this task?" 1 (very difficult) to 7 (very easy) |
| Confidence | After each task: "How confident are you in your answer?" 1 to 7 |
| SUS | After each interface, the 10-item SUS; score with `node testing/sus.mjs 3 2 4 ...` |
| Comments | Think-aloud quotes, tagged to issue IDs where they match |

## Session script (about 45 minutes)

1. Welcome and consent (`consent-script.md`), 5 min. Start recording only after consent.
2. Background questions, 2 min: course, prior use of government e-services, any regulatory work.
3. Think-aloud practice, 2 min: "Find today's weather on any website, and talk me through it."
4. T1, then SEQ, confidence, SUS for that interface, 15 to 20 min.
5. T2, then SEQ, confidence, SUS, 15 to 20 min.
6. T3 and SEQ, 7 min.
7. Debrief, 5 min: "What was most confusing? What would you change first?" Then show the issue log summary and ask them to rate the top 10 issues 0 to 4 independently.

Moderator rules: do not help with the task; answer "What would you do if I weren't here?"; prompt only "What are you thinking?" after 20 seconds of silence; note the time of every dead end.

## Analysis

- Report each participant's raw results in a table (anonymised P1 to P5), then medians and ranges per interface. No means or significance tests with n = 5.
- Task success with an adjusted-Wald 95% interval, to show how wide the uncertainty is.
- Compare observed paths with the modelled path in `review/klm-results.md`, and the observed times with the KLM estimates; report where the model was wrong.
- Re-rate issue severities: keep the reviewer's rating where at least 3 of 5 participants agree within one point; otherwise flag it as disputed.
- Update the issue log with what the test confirms, refutes or adds. Refuted findings stay in the log, marked as such.

## Pilot

Run one pilot session with a sixth classmate first. Fix the script, timings and scenario cards; do not include the pilot in the results.

## Data handling

- Participants are identified only as P1 to P5. The key linking codes to names is kept offline and deleted after analysis.
- Screen recordings are kept on the candidate's own device, are not uploaded, and are deleted within 30 days of analysis.
- Only anonymised results are committed to this repository.
- This is an informal usability evaluation with classmates. If the results will be published beyond a portfolio, check whether NUS ethics review is needed first.

## Materials

- `consent-script.md`: consent wording, read aloud.
- `session-log-template.csv`: one row per participant and task.
- `sus.mjs`: SUS scoring.
- Scenario cards: print the two scenarios above on separate cards.
