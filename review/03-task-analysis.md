# Task analysis

All numbers here come from `scripts/klm.mjs`; the generated tables, operator constants and full step listings are in [klm-results.md](klm-results.md). If a number here and there ever disagree, `klm-results.md` is right (CI fails if it is stale).

## Journey A: "What do I need to bring this device to market?"

### Goal hierarchy (current state)

```
0. Find out what is needed to import and wholesale a Class B device
   1. Find out which product registration route applies
      1.1 Find the evaluation-route conditions          (Registration overview)
      1.2 Try the route checker                         (dead end: google.com)
      1.3 Try the requirements tool                      (dead end: HTTP 404)
      1.4 Interpret the route table against the device   decision
      1.5 Confirm the route's detailed conditions         decision  (route guide)
      1.6 Note the documents for the route                decision  (route guide)
   2. Find out what registration costs and takes          decision  (fees page, add two rows)
   3. Find out which dealer's licences are needed          decision  (licence pages, 3 levels down)
      3.1 Work out acceptable QMS evidence                  decision  (licence page + QMS page)
      3.2 Find the licence fee and multiply                  decision  (fees page again)
   4. Find out how to get access to apply                  decision  (SHARE page, Quick Guide PDF)
```

### Measures (persona P1)

| | Current | Prototype |
|---|---:|---:|
| Steps | 30 | 11 |
| Page loads | 19 | 2 |
| Distinct pages or files | 13 | 2 |
| Dead ends | 2 | 0 |
| Interpretive decisions (rules or arithmetic) | 9 | 0 |
| Factual questions answered | 0 | 8 |
| Documents the applicant must prepare for the route | 14 | 14 (listed on one page) |

KLM execution time, operator sensitivity and reading-time bounds are in [klm-results.md](klm-results.md).

The document count is the same in both journeys by design: the prototype does not reduce what HSA requires, only the effort of finding out.

### Decision points and what each one needs

| # | Decision | Where the answer is | What makes it hard |
|---|---|---|---|
| 1 | Which evaluation route? | Registration overview table | Conditions in nested lists in one table; the EU approvals cell alone is 282 words (A-16) |
| 2 | Does the device meet every immediate-route condition? | Route guide | Conditions differ from the overview (A-03); the forfeiture warning comes last (A-04) |
| 3 | Which documents? | Route guide | Document names link to a generic index (A-09) |
| 4 | Cost and time of registration? | Fees page | Application fee and route fee on separate rows; no total (A-08) |
| 5 | Which licences? | Licence application page | Rules spread across prose about importers, wholesalers, manufacturers and end users (A-06) |
| 6 | Which QMS evidence? | Licence page, QMS page, Quick Guide | Class-dependent; Class A exception stated three slightly different ways |
| 7 | Is a declaration enough? | QMS page | Must combine class and licence type |
| 8 | Licence cost? | Fees page, another section | Per-licence fee, user multiplies |
| 9 | Access to apply? | SHARE page, Quick Guide | Corppass steps are only in the PDF |

### Drop-off risks

Points where a user is likely to stop, phone or email HSA, or proceed on a wrong assumption:

1. **The route checker button (A-01).** The page's only call to action leaves HSA's site. Users who assume HSA's tool is down may stop or turn to consultants.
2. **The 404 from the tools page and every self-help result (A-02).** The self-help journey that HSA built (is it a device, then risk class, then requirements) breaks at its last step, after the user has already invested 2 to 21 questions.
3. **Choosing an immediate route (A-03, A-04).** This is the riskiest step: the page a user relies on may omit a condition, and HSA states that a wrong choice forfeits the registration or the fees.
4. **Access prerequisites.** Applying needs a Corppass administrator to add SHARE as an e-service. That step appears in the Quick Guide PDF, not on the licence or registration guide pages, so a user can prepare documents and then be blocked by their own company's Corppass set-up.
5. **The 25.8 MB SHARE manual (A-09).** Large on mobile data and slow to search.

## Journey B: adverse event reporting

### B1. Dealer, mandatory initial report (persona P3)

```
0. File an initial mandatory report within the deadline (48 h, 10 or 30 days)
   1. Find the dealer form              Report adverse events > For medical device companies
   2. Download and open a Word file
   3. Complete 49 labelled fields (77 entries counting table cells and IMDRF codes)
      3.1 Look up IMDRF codes on imdrf.org (not modelled)
      3.2 Gather 3 years of global and Singapore frequency data (not modelled)
   4. Save, attach to an email, keep it under 2 MB, send
   5. Wait for HSA's reference number by email (no tracking)
```

The form says it "may take you 15 minutes to fill in". The KLM execution estimate with every fact at hand is in [klm-results.md](klm-results.md) and already approaches that figure before any look-up (B-02).

Drop-off and error risks: wrong category or deadline because the form's categories differ from the web page (B-04); bounced email over 2 MB; no confirmation that HSA received the report (B-01); a dealer filing the users' e-form instead (B-08).

### B2. User at a GP clinic, FormSG (persona P4)

A short form (9 entries with the photo option) that keeps typing low (P-03). Two problems: a required hospital drop-down that does not fit clinics or home users (B-06), and a consent question where both Yes and No can be ticked (B-07).

## Why Journey A was chosen for the redesign

Journey A has four of the five issues rated 3 (A-01, A-02, A-03, A-06), the largest step and page counts, two dead ends, and a direct financial consequence for a wrong decision. Its fix is also the most self-contained: HSA already publishes every rule needed, and already intends users to have a requirements checker.
