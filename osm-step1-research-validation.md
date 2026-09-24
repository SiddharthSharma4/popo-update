# STEP 1 — Problem Research & Validation
## AI for On-Screen Marking (OSM) and Digital Evaluation — Indian University Context

**Input:** `osm-problem-deconstruction.md` (Step 0 output)
**Stage purpose:** Evidence-based research only. No solution selection, no tech stack, no PRD.
**Research date:** September 2026 (web research current to this date)

**Legend:** **FACT** = directly verifiable · **SOURCE-BACKED CLAIM** = reported by a credible source but not independently verifiable by us · **ANALYSIS** = our reasoning over evidence · **INFERENCE** = plausible but unconfirmed · **ASSUMPTION** = unvalidated, needs institutional confirmation

---

## 1. Executive Summary

The Step 0 hypothesis — that evaluation quality control is retrospective, marking is inconsistent, and delays cascade through results and revaluation — is **strongly validated**, and validated by a much bigger and more current event than we expected: CBSE's national rollout of On-Screen Marking (OSM) for the 2026 Class 12 board exams became a live, high-profile crisis. Roughly 98.7 lakh answer books were digitally processed for 17.7 lakh students, the pass percentage fell to 85.2% (a seven-year low), and complaints of blurred scans, mismatched answer sheets, and unreviewed pages reached the Delhi High Court and a Parliamentary Standing Committee **[SOURCE-BACKED CLAIM]**. This is not proof that *university-level* evaluation has the same failure modes, but it is very strong evidence that digitizing evaluation at scale in India is operationally hard, and that the specific failure modes Step 0 hypothesized (scan quality, mismatch, incomplete checking, weak audit trails, public trust collapse) are real and already happening in a closely related Indian examination context **[ANALYSIS]**.

At the university level specifically, evidence is older and more fragmented but consistent: recurring news reports (Delhi University, Panjab University, Punjabi University Patiala, University of Kashmir, Himachal Pradesh Technical University, University of Mumbai) document result delays, revaluation backlogs of months, and mark shifts after re-evaluation large enough to reverse pass/fail outcomes **[SOURCE-BACKED CLAIM]**. We could not find a single national dataset quantifying the scale of this problem — no evidence of a systematic, India-wide study of evaluation-related delay or inconsistency was found.

Existing commercial infrastructure for OSM already exists and is mature in parts (TCS iON Digital Marking Hub, MeritTrac, Dexit Global, and CBSE's own OnMark platform built by Coempt Eduteck) **[FACT]**. This matters for Step 0's "baseline unclear" flag: a base OSM layer is a known, buyable commodity in India, not something a hackathon team would build from scratch. The gap is not "does OSM exist" — it is quality assurance, real-time oversight, and trustworthy escalation *on top of* OSM, which is exactly where CBSE's system failed publicly.

Academic literature on LLM-based grading (49-study and 46-study systematic reviews from 2024–2026) is consistent: LLMs show moderate-to-promising correlation with human raters on essay scoring but are not considered reliable substitutes, and every major review flags interpretability, fairness, bias, and the need for human oversight as unresolved **[SOURCE-BACKED CLAIM]**. Handwriting OCR for Indic scripts remains a harder, less mature problem than English OCR — even Google Cloud Vision's handwriting recognition is explicitly labeled "Experimental" for Devanagari and other Indic scripts **[FACT]**, and academic Devanagari OCR accuracy figures found in literature (88–98% depending on task, script, and era of study) are not real-world classroom/exam-script benchmarks **[SOURCE-BACKED CLAIM, do not generalize]**.

On regulation: India's Digital Personal Data Protection Act, 2023 (DPDP Act) is now partially in force (Rules notified 14 Nov 2025, full enforcement 14 May 2027, penalties up to ₹250 crore) and treats anyone under 18 as a "child" requiring verifiable parental consent — which is directly relevant because many Class 12 / early-UG students are minors **[FACT]**. This is a real constraint on any prototype that would touch real student data.

---

## 2. Problem Validation

### Factual process map (generic — synthesized from OSM vendor documentation and CBSE's own FAQ)

```
EXAM → ANSWER SCRIPT → SCANNING/DIGITIZATION → ANONYMISATION → ALLOCATION
→ EVALUATION (on-screen) → MODERATION/L2 REVIEW → RECONCILIATION
→ RESULT PROCESSING → RESULT PUBLICATION → REVALUATION (on complaint)
```

| Stage | Current process | Stakeholder | Pain point | Evidence | Confidence |
|---|---|---|---|---|---|
| Scanning/digitization | Physical scripts scanned into high-resolution PDFs at regional centres | Scanning staff, exam body | Blurred scans, missing pages reported at national scale in CBSE 2026 rollout | **[SOURCE-BACKED CLAIM]** thesouthfirst.com, careers360.com | High (CBSE); Medium (generalizing to universities) |
| Anonymisation | Student identity digitally masked | Exam body | Alleged answer-sheet mix-ups (scripts not matching the student's own handwriting) reported and are subject of an ongoing dispute | **[SOURCE-BACKED CLAIM]** careers360.com, themooknayak.com | Medium — some claims disputed by the board itself |
| Allocation & evaluation | Evaluators mark on secure web portal; PTI reported ~13,000 CBSE scripts required manual (non-OSM) evaluation after OSM issues | Evaluators | Volume + workload pressure; DU faculty flagged "pressure from overlapping duties and centralised evaluation system" | **[FACT]** (13,000 figure attributed to government sources via PTI) / **[SOURCE-BACKED CLAIM]** (DU) | Medium |
| Moderation/reconciliation | Escalation mechanisms exist in commercial OSM tools (flagging scanning errors, missing pages) | Moderators | ~20 answer-sheet mix-up cases detected on CBSE's OSM portal | **[FACT]**, attributed to government sources via PTI | Medium |
| Result publication | Results published; pass rate is the visible outcome metric | Institution, students | CBSE Class 12 pass rate dropped from 88.39% (2025) to 85.20%/85.29% (2026), lowest in 7 years, coincident with OSM introduction — correlation, not proven causation | **[FACT: the percentages]** / **[ANALYSIS: causal link is disputed, not established]** | High on numbers; Low on causal attribution |
| Revaluation | Students request photocopies of evaluated scripts, then apply for verification/re-evaluation | Students, exam body | Delhi HC accepted a petition (NSUI) for an independent inquiry; Parliamentary Standing Committee summoned CBSE officials; a student presented an analysis alleging 15 discrepancies in the OSM tendering process | **[FACT]** (these events occurred) | High |
| University-level revaluation (older, separate evidence base) | Manual reconciliation of first/second marker marks; students reapply for verification | Exam cell, students | Multi-month delays: Univ. of Kashmir (~months, tied to admissions cycle), Panjab University (485 re-evaluation applications, 170 mark increases), HPTU (30–45 day official estimate but student-reported "snail's pace"), Univ. of Mumbai (RTI showed revaluation for Oct–Nov 2018 exams still pending in mid-2019) | **[SOURCE-BACKED CLAIM]**, multiple independent local/regional news sources across different states and years | Medium-High (consistent pattern across many independent local reports, but no national aggregate study found) |

**University-specific variation:** We found no evidence that a single standardized workflow exists across Indian universities. Some institutions (e.g., a college example found in search results) already do QR-code-based script identification, digitization, and OSM for UG courses and register with the National Academic Depository (NAD) DigiLocker **[FACT — single-institution example, not representative]**. Others visibly still rely on manual paper movement (HPTU's Controller referenced "sending papers for checking to the residences of evaluators") **[SOURCE-BACKED CLAIM]**. Confidence that this generalizes to "most" Indian universities: **Low** — evidence not found for a representative national survey.

---

## 3. Users & Stakeholders

| Stakeholder | Responsibility | Current workflow (evidence) | Pain points (evidence) | What they need (inference) |
|---|---|---|---|---|
| Students | Write and receive marks on scripts | Increasingly digital: scan → digital evaluation → digital results | Delayed/inconsistent marks; alleged script mismatches; multi-month revaluation waits; in the CBSE case, public distress and (per multiple news reports) a suicide was linked by family/community members to the OSM controversy — a serious, disputed, and sensitive claim that we report only as reported, not as verified causation **[SOURCE-BACKED CLAIM — sensitive, unverified causal link]** | Timely, explainable, verifiably-correct marks |
| Examiners/evaluators | Mark scripts on-screen | Web-based secure access, annotation tools, barcode-based script identification (per Dexit Global's OSM product description) | Volume pressure; ~13,000 CBSE scripts had to be pulled from OSM to manual evaluation, implying some scripts are not fit for digital marking as-is | Reliable scan quality; sane workload; tools that don't add friction |
| Moderators/Controllers of Examinations | Multi-level (L1/L2) review and reconciliation | Vendor tools advertise "real-time monitoring" of evaluator productivity and pending scripts | DU's Controller of Examinations was formally written to about recurring, unresolved examination-form and revaluation-delay issues by a sitting Academic Council member | Real, working real-time visibility (not just vendor claims of it) |
| Exam boards/institutions (CBSE as the most visible current case) | Own the OSM programme and vendor relationship | Outsourced to a vendor (Coempt Eduteck Pvt. Ltd., per reporting) for CBSE's "OnMark" platform | Facing a Parliamentary Standing Committee inquiry, a Delhi High Court case, and public allegations about irregularities in the tender process itself | Defensible, auditable vendor selection and operational transparency |
| Regulators (UGC, Parliament) | Set examination policy; oversight | UGC has issued evaluation-reform guidance historically (on-demand exams proposal, 2019; COVID-era exam guidelines, 2020); no evidence found of a specific UGC OSM/digital-evaluation mandate for universities | Confidence in the ecosystem's academic integrity | Evidence not found — requires validation: is there a current UGC digital-evaluation standard? |

### Conflicting needs (evidence-grounded, not hypothetical)
- CBSE's stated goal for OSM was transparency, fairness, step-wise accuracy, and reduced manual error **[SOURCE-BACKED CLAIM: CBSE's own clarification]** — but the visible short-term effect for many stakeholders was the opposite: reduced trust, legal challenges, and legislative scrutiny. This is a concrete, sourced example of Step 0's hypothesized tension between "faster/more standardized for the institution" and "trustworthy/transparent for the student," realized at national scale.

---

## 4. Existing Solutions / Competitor Landscape

| Solution | Organization | Target users | What it does | AI capabilities (as documented) | Workflow covered | Limitation/gap (evidence-based) | Source |
|---|---|---|---|---|---|---|---|
| OnMark | Coempt Eduteck Pvt. Ltd. (for CBSE) | National board exams | Scan → cloud upload → anonymize → on-screen evaluation | Evidence not found (no AI capability documented in sources found) | Digitization through evaluation | Publicly documented failures at scale in 2026: scan quality, alleged mismatches, tender-process controversy | thesouthfirst.com, moneylife.in, taxtmi.com |
| TCS iON Digital Marking Hub | Tata Consultancy Services | Boards, universities, global evaluators | Digitizes subjective answer-script evaluation; supports video/audio/paper-pen marking; location-independent evaluator network (incl. a 2019 partnership with EFLU to certify evaluators for foreign-language marking) | Evidence not found for AI-based scoring; positioned as a human-evaluator platform | Digitization through evaluation, evaluator training/certification | No public evidence found of built-in anomaly detection, oversight dashboards, or AI-assisted marking | tcs.com, exchange4media.com |
| MeritTrac (Manipal Global subsidiary) | MeritTrac Services | Government bodies, universities, corporates | End-to-end exam services: application processing, hall tickets, venue booking, biometric authentication, **digital evaluation/OSM**, result processing; ISO 9001/27001 and CERT-IN certified test engine; claims 34M+ exams delivered for 400+ customers | Automated proctoring (facial recognition, screen-tracking) for online tests; automatic grading for objective-type assessments; evidence not found for AI-assisted subjective marking | End-to-end exam lifecycle including OSM | Established operations player; no public evidence of examiner-analytics/anomaly-detection specifically for subjective marking | manipal.edu, egov.eletsonline.com, capterra.com |
| Dexit Global OSM Solution | Dexit Global Ltd. | Universities, government/recruitment bodies | Secure web-based evaluation, L1/L2/moderation/reconciliation workflow, real-time monitoring of evaluator productivity and pending scripts, barcode-based script management, escalation mechanism for scanning errors/missing pages, audit trails, role-based dashboards | Not described as AI-based; rule/workflow-based oversight features | Digitization through result reporting, with explicit moderation/reconciliation and audit trail features | This is the closest evidence we found of a product addressing the "oversight" bundle from Step 0 (six of ten features) — but it is presented as workflow/dashboard tooling, not AI | dexitglobal.com |
| Global reference point — Hong Kong HKEAA OSM | HKEAA | HKDSE board exam | OSM introduced 2007 to improve security, quality, reliability, efficiency of marking; now used for the vast majority of HKDSE scripts | Evidence not found | Full marking workflow | Demonstrates OSM can run stably at large scale over ~19 years — useful counter-evidence that OSM failure is not inevitable, but a different regulatory/operational context than India | hkeaa.edu.hk |

**Analysis:** None of the vendor tools found publicly document AI-assisted subjective marking, AI-based anomaly/malpractice detection, or AI examiner-performance analytics as shipped features. The "opportunity" bundle in the original ten-feature brief (AI-assisted evaluation, anomaly detection, examiner analytics) does **not** appear to be commoditized yet in the Indian OSM vendor landscape we found — the incumbents are strong on workflow/operations/security, not on AI. This is a meaningful, evidence-based finding, not an assumption.

---

## 5. Indian Government / Ecosystem

| Initiative | What it is | Relevance | Status/evidence |
|---|---|---|---|
| National Academic Depository (NAD) / DigiLocker | Digital repository for academic credentials | At least one institution (found via search) registers colleges on NAD DigiLocker and stores digital answer scripts on Google Classroom/cloud as backup | **[SOURCE-BACKED CLAIM, single institution]** — not evidence of a national OSM–NAD integration standard |
| UGC evaluation-reform guidance | Various UGC committee reports/guidelines over the years (e.g., 2019 "examination on demand" proposal; 2020 COVID exam guidelines) | Shows UGC is an active policy actor on evaluation reform generally | **[FACT]** these documents exist; **evidence not found** for a current, specific UGC standard mandating or governing OSM/AI-assisted evaluation |
| CBSE OSM programme | National on-screen marking rollout for Class 12, 2026 | Directly analogous failure-mode evidence (see §2) — CBSE is not a university, but the same category of institution-run, large-scale digital evaluation | **[FACT]**, extensively reported |
| DPDP Act, 2023 + DPDP Rules, 2025 | India's comprehensive data protection law | Directly governs any system processing student personal data, especially for under-18 students (verifiable parental consent required) | **[FACT]**: Assented 11 Aug 2023; Rules notified 14 Nov 2025; full enforcement from 14 May 2027; penalties up to ₹250 crore under Section 33 |

**Do not assume integration is available.** No evidence was found that university OSM systems have standardized, ready-made integration with NAD/DigiLocker or any national exam-data standard — the one example found is institution-specific.

---

## 6. Academic / Research Landscape

| Research area | Finding | Relevance | Limitation | Source |
|---|---|---|---|---|
| LLM-based automated essay scoring (systematic review, 49 studies, 2018–2024) | LLMs show growing capability in scalable, human-like assessment across essay scoring, feedback generation, item creation, and dialogue-based evaluation | Directly relevant to "AI-assisted evaluation" feature | Review also flags validity, fairness, interpretability, and pedagogical-alignment concerns as unresolved | arxiv.org/pdf/2508.02442 (Emirtekin, 2025, cited within) |
| GPT-based essay scoring + linguistic features | Combining LLM scores with traditional linguistic features improved scoring accuracy/reliability over LLM-alone | Suggests a hybrid, not pure-LLM, approach performs better | Single study context; not validated on Indian university exam answers | arxiv.org/pdf/2508.02442 |
| Argumentative-essay AES with LLMs (critical scoping review, 46 studies, 2022–2025, PRISMA) | Field is "fragmented and insufficiently grounded in argumentation theory" | Tempers expectations of plug-and-play AI grading for reasoning-heavy answers (common in university exams) | Scoping review of English-language, mostly Western-dataset studies | ellisalicante.org (Favero et al., 2026) |
| "Are LLMs good essay graders?" (ASAP dataset, ~13,000 essays) | LLMs (ChatGPT, Llama) contribute to scoring but currently cannot replace human raters; struggle with nuanced writing qualities | Direct evidence against "AI decides" framing; supports human-in-the-loop only | Single benchmark dataset (ASAP), not exam-script data, not Indian | themoonlight.io summary of Kundu & Barbosa |
| Cross-disciplinary survey of LLM auto-grading (BEA 2025 workshop) | LLMs applied across essay grading, sciences, CS/engineering, and mathematics grading; inconsistencies and need for human oversight highlighted across all subfields | Broadens relevance beyond essay/humanities answers to STEM answers | Survey-level synthesis, not new empirical data | aclanthology.org/2025.bea-1.35 |
| Handwriting OCR for Indic scripts (multiple sources) | Indic-script handwriting recognition remains materially harder than Latin-script OCR; Google Cloud Vision explicitly lists Devanagari, Bengali as "Experimental" support for handwriting (not general printed text); older academic Devanagari studies report character-level accuracy in the 88–98% range depending on dataset/era, with confusion increasing for degraded/varied handwriting | Central to the "handwriting recognition" feature and to whether OCR is exam-ready for regional-language scripts | Lab accuracy figures on curated datasets do not generalize to messy, real exam-script handwriting under time pressure — explicitly note this is not established for exam conditions | arxiv.org (PLATTER, Devanagari database papers), Google developer forum |
| Inter-rater/inter-examiner reliability (multiple studies incl. AQA/Ofqual research, Frontiers, medical-education studies) | Marker inconsistency is a long-documented, structural phenomenon (traced to Starch & Elliott 1912), not unique to India or to digital systems; training + rubrics + moderation measurably improve but do not eliminate it; double marking produces only small reliability gains (~0.6–1.2% of a mark in UK GCSE/GCE research) | Validates Step 0's H3 (weak calibration) as a genuine, long-standing, evidence-backed phenomenon rather than a novel hypothesis | Most rigorous studies are UK/Western; direct Indian-university inter-rater data not found | frontiersin.org, aqa.org.uk (Fearnley), taylorfrancis.com (Sadler) |

**Important calibration:** Do not overstate these findings as proof that AI can reliably grade Indian university exam answers. Every review found treats AI grading as promising-but-unproven and stresses human oversight — this is the dominant, consistent academic position across 2024–2026 literature, not a minority view.

---

## 7. User / Industry Evidence — Anecdotal vs Systematic

**Systematic-leaning evidence (repeated, independent, multi-year, multi-institution pattern):**
- Result/revaluation delay complaints recur across at least six different Indian universities/boards over multiple years (DU 2025, Kashmir undated, Panjab 2002, Punjabi University Patiala undated, HPTU undated, Mumbai 2019, CBSE 2026) **[SOURCE-BACKED CLAIM]** — the *pattern* is systematic even though each individual report is a discrete local news story, not survey data.
- Inter-rater unreliability in subjective marking is systematic and decades-deep in the international academic literature (§6).

**Anecdotal (single-incident, use with caution):**
- The specific CBSE Vedant Srivastava "answer sheet doesn't match my handwriting" case — disputed by CBSE, evolving, and reported as a live controversy, not a settled fact **[SOURCE-BACKED CLAIM, disputed]**.
- Reports connecting a student's suicide to distress over the OSM results — extremely sensitive, reported by regional outlets, not independently verified by us, and not something to generalize from. We flag this only to note the severity of the trust breakdown, not as a causal claim.

**Do not treat any single complaint as proof of systemic failure rate.** No source found gives an actual error rate (e.g., "% of scripts affected") for either CBSE's OSM or any Indian university's evaluation process. The ~20 mix-up cases and ~13,000 manually-evaluated CBSE scripts are the only concrete numbers found, out of 98.7 lakh scripts — useful anchors but not proof of overall system-wide error rate, since manual fallback ≠ error, and 20 confirmed mix-ups out of ~98.7 lakh scripts is objectively small in relative terms, even though the public reaction was large **[ANALYSIS]**.

---

## 8. Data Availability

| Data | Exists publicly? | Possible source | Format | Privacy concerns | Usefulness |
|---|---|---|---|---|---|
| Real student answer scripts (any university) | No — not publicly available | Institutional, gated | Scanned PDFs/images | High — DPDP Act treats under-18 student data as requiring verifiable parental consent; even adult students' academic records are personal data | Would be ideal but is very unlikely to be obtainable for a hackathon |
| CBSE/university aggregate result statistics (pass %, historical trend) | Partially — pass-percentage trend numbers are publicly reported in news coverage | News/RTI | Numbers embedded in articles, not structured datasets | Low (aggregate, non-identifying) | Useful for framing/motivation, not for training models |
| Devanagari/Indic handwritten character datasets | Yes, for research purposes | Academic datasets referenced in OCR literature (e.g., Devanagari numeral/character databases cited in arXiv papers) | Image datasets | Low (not real student PII, typically volunteer-contributed) | Usable for OCR prototyping, but not representative of real exam-script handwriting under exam stress, mixed math/text/diagrams, or subject-specific vocabulary |
| ASAP (Automated Student Assessment Prize) essay dataset | Yes, public | Academic/Kaggle | Text | Low | Useful for demonstrating an AES prototype conceptually, but it is English-language, non-Indian, non-exam-script data — a demo built on it should not be presented as "our system works on real Indian exam scripts" |
| Marking schemes/rubrics | Not publicly found for real universities | Institutional | N/A | Institution-owned/confidential | Evidence not found — requires validation with organizers/institutions |

**Do not assume real answer scripts are usable.** This is confirmed, not just cautious: DPDP Act treats under-18 data with a hard consent requirement, and no public dataset of real Indian university exam scripts was found.

---

## 9. API / Integration Landscape (possibilities only, not selection)

| Service category | Example services | Potential use | Cost/free tier | Limitations found |
|---|---|---|---|---|
| Cloud OCR/handwriting | Google Cloud Vision, AWS Textract, Azure AI Document Intelligence | Digitizing scanned handwritten text | Free tiers exist for all three (limits vary; evidence not found for exact current 2026 pricing — verify at time of build) | Google Cloud Vision's own documentation marks Devanagari and other Indic-script *handwriting* recognition as "Experimental," distinct from (better-supported) printed text |
| Math-specific OCR | Mathpix (referenced in general knowledge; not independently verified in this search pass) | Recognizing mathematical notation in STEM answers | Evidence not found in this research pass — requires validation | STEM answers with diagrams/equations are a known hard case for generic OCR |
| LLMs for scoring/feedback | Any general-purpose LLM API | Rubric-based suggested marks, evaluation summaries | Varies by provider | Academic consensus (§6) is uplift exists but reliability/fairness/interpretability are unresolved — do not present as decision-making |
| Identity/authentication | Aadhaar-based or institutional SSO (general knowledge, not verified in this pass) | Evaluator/exam-cell login | N/A | Evidence not found — requires validation of what a hackathon can legally integrate |

---

## 10. What AI Can and Cannot Reliably Do

| Capability | Potential usefulness | Current limitations (evidence-backed) | Human oversight needed? | Risk |
|---|---|---|---|---|
| Handwriting → text (OCR) | Makes scripts searchable/analyzable | Indic-script handwriting OCR is explicitly "Experimental" in major cloud APIs; lab accuracy figures (88–98%) are on curated datasets, not real exam scripts | Yes — always, for anything mark-affecting | High if used to auto-transcribe and then auto-score without review |
| Suggested/assistive marks (rubric matching) | Speed and consistency aid for evaluators | Reviews consistently find LLM scoring "moderate" correlation with humans, improved by hybrid (LLM + linguistic features) methods, but not a replacement | Yes, mandatory per literature consensus | Medium — bias/hallucination risk on partial credit, valid-alternative-answers, and mathematical/diagrammatic answers, none of which the reviewed literature claims are solved |
| Anomaly/outlier detection in mark patterns (e.g., flag evaluators whose scoring deviates from norms) | Could support "retrospective, sampled QC" → more real-time QC (Step 0's H1) | We found no published India-specific study of this being deployed for subjective exam marking; the concept is standard in statistical process control generally, but exam-specific validation was not found | Yes — flags should route to human moderators, not auto-adjust marks | Medium — false positives could unfairly flag legitimate strict/lenient (but internally consistent) markers, a distinction the literature (§6, inter-rater section) says matters |
| Evaluation summaries/explanations | Could support transparency demands (very salient given the CBSE trust crisis) | Evidence not found for this being validated at scale in an exam context | Yes | Low-medium |
| Full autonomous decision-making on final marks | Not supported by any source found | Every academic review found explicitly argues against this; high-stakes marks affect students' careers | Always | High — do not build toward this |

**We found no evidence supporting the claim that AI can replace examiners for subjective marking of Indian university exam answers.** This is a strong, source-backed limitation, not caution for its own sake.

---

## 11. Security, Privacy & Trust

- **Student privacy / PII:** DPDP Act, 2023 defines any entity processing personal data (including examination boards) as a "Data Fiduciary," and requires verifiable parental consent for anyone under 18 — a large fraction of the relevant student population (Class 12, and some early-UG students) **[FACT]**.
- **Penalties:** Up to ₹250 crore under Section 33 for non-compliance; full enforcement from 14 May 2027, with rules already notified from 14 Nov 2025 **[FACT]**.
- **Auditability/accountability:** The CBSE case shows what happens when audit trails and escalation are perceived as inadequate — Parliamentary and judicial scrutiny followed **[FACT — the scrutiny occurred]**. This is direct, current, high-stakes evidence for why audit/explainability requirements matter, not a generic assumption.
- **Tampering/mix-up integrity:** The disputed "answer sheet doesn't match my handwriting" claims (whatever their eventual resolution) show that script-identity integrity through the scan/anonymize/allocate pipeline is a live trust concern for the public, regardless of the true underlying error rate.

---

## 12. Regulatory / Policy Considerations (not legal advice)

- DPDP Act 2023 + Rules 2025 is the primary and now-active data protection framework relevant to any prototype touching real student data — full enforcement 14 May 2027, but rules already notified.
- We found evidence of UGC involvement in examination policy generally (on-demand exams, COVID-era exam mode guidance) but **no evidence of a specific, current UGC rule governing AI use in subjective marking** — this is a genuine unknown, not an inferred void; it may simply not have surfaced in our search, or may not yet exist. Flag as **CRITICAL, requires validation.**
- The CBSE case shows a live example of legislative (Parliamentary Standing Committee) and judicial (Delhi High Court) interest in digital-evaluation integrity — a signal that any AI-in-evaluation product operating in India should expect regulatory/political attention if things go wrong at scale.

---

## 13. Identified Gaps

| Current State | Desired State | Gap | Evidence |
|---|---|---|---|
| OSM/digital evaluation infrastructure is commercially available and used at scale (TCS iON, MeritTrac, Dexit Global, CBSE's OnMark) | Reliable, trusted, auditable evaluation at scale | Available tools do not appear to include AI-assisted quality assurance or anomaly detection as a documented, shipped feature | §4 (no AI capability found in vendor materials) |
| Quality control is retrospective (sampling, post-hoc revaluation) | Real-time or near-real-time quality signals during evaluation | Even the most feature-rich product found (Dexit Global) offers "real-time monitoring" of progress/productivity, but we found no evidence of real-time *quality* signals (as opposed to volume/throughput) | §4, §10 |
| Handwriting-heavy, Indic-script answer scripts | Reliably machine-readable scripts | Handwriting OCR for Indic scripts is explicitly labeled experimental by at least one major cloud vendor, and academic accuracy figures are lab-only | §6, §9 |
| Trust in digital evaluation (post-CBSE-2026) | Public/student trust in AI-assisted or heavily-digitized evaluation | A live, large-scale trust collapse has just occurred in the most visible Indian digital-evaluation deployment to date | §2, §7 |
| Data protection compliance obligations | A system usable with real (or realistic) student data | DPDP Act consent/processing requirements for minors are a hard constraint not yet solved by any evidence we found | §8, §11 |

**Underserved users:** Moderators/Controllers of Examinations appear to be underserved specifically on *real-time quality* visibility (as distinct from throughput/progress visibility, which vendor tools do offer).
**Unsolved pain points:** Trust and explainability after a digital evaluation error occurs — none of the vendor materials found describe a structured, evaluator-facing explanation/audit mechanism beyond generic "audit trails."
**Technology gaps:** AI-assisted anomaly/consistency detection for subjective marking at India-scale, validated on real or realistic exam-script data — not found in either commercial products or academic literature specific to this context.

---

## 14. Opportunity Areas (not ranked, not selected)

| Opportunity | Problem addressed | Evidence | Potential users | Technical feasibility | Data feasibility | Key risk |
|---|---|---|---|---|---|---|
| Real-time evaluation quality signals (vs. throughput-only monitoring) | Retrospective/sampled QC (Step 0 H1) | Existing tools show progress dashboards, not quality dashboards (§4) | Moderators, Controllers of Examinations | Medium — needs a proxy for "quality" without ground truth | Low — no real exam data available; would need synthetic/proxy data | Proxy metrics could be gamed or misleading if not carefully validated |
| Evaluator consistency/calibration support (rubric-anchored assistance, not auto-scoring) | Weak calibration between evaluators (Step 0 H3); backed by decades of inter-rater research (§6) | Strong academic base for "training + rubrics + exemplars improve reliability" | Evaluators, moderators | Medium-High — this is closer to what academic literature actually validates (assistive, rubric-anchored) than full auto-scoring | Medium — can prototype on public essay/rubric datasets, with clear caveat it's not exam-script data | Overclaiming reliability beyond what literature supports |
| Trust/explainability layer for evaluation decisions | Public trust collapse (CBSE 2026); revaluation opacity (university reports) | Directly evidenced by the CBSE crisis and its legal/political fallout | Students, exam cell, institution leadership | Medium | Low-Medium | May be seen as "just UI" without real evaluation-quality substance underneath |
| Anomaly detection on marking patterns (statistical, not necessarily AI-heavy) | Late-caught quality problems (Step 0 H1/H2) | No India-specific published validation found; general statistical process control is well established elsewhere | Moderators | Medium | Low — needs real or realistic marks-distribution data, hard to obtain | False positives penalizing legitimately strict/lenient but consistent markers |
| Handwriting/OCR assistance for Indic scripts | Handwriting readability friction (Step 0) | Confirmed as a harder, less mature problem than English OCR (§6) | Evaluators | Low-Medium for a hackathon timeframe — this is a genuinely hard, still-experimental capability | Medium — public Indic handwriting datasets exist, but not exam-script-specific | High risk of overpromising given "Experimental" status of the closest commercial equivalent |

---

## 15. Hackathon Feasibility

| Dimension | Real-time quality signals | Evaluator calibration support | Trust/explainability layer | Anomaly detection | Handwriting OCR (Indic) |
|---|---|---|---|---|---|
| Data feasibility | Low (no real data; would need synthetic) | Medium (public rubric/essay datasets exist, with caveats) | Low-Medium | Low (no real marks-distribution data) | Medium (public Indic handwriting datasets exist, not exam-specific) |
| Technical feasibility | Medium | Medium-High | Medium | Medium | Low-Medium (frontier of an active, unsolved research area) |
| Demo feasibility | Medium — can simulate a dashboard convincingly | High — clear before/after rubric-adherence demo is plausible | High — UI-led, easy to demo | Medium | Low — a partial/imperfect Indic OCR demo risks looking broken live |
| Deployment feasibility | Medium (would sit atop an existing OSM layer, which we cannot access) | Medium | Medium | Low-Medium | Low for production use; feasible only as an illustrative demo |
| Scalability (architectural) | Plausible if built as an add-on layer to existing OSM platforms rather than a replacement | Plausible | Plausible | Plausible with real data eventually | Long-term plausible, not short-term |
| Validation feasibility | Hard — no ground truth available to us | Medium — can validate against published rubric-adherence methodology, not real scripts | Hard to validate "trust" quantitatively in a hackathon | Hard — no real data | Hard — cannot validate against real exam scripts |
| Key failure risk | Looks like a generic dashboard without real underlying signal | Risk of overclaiming reliability the literature doesn't support | Risk of being "just UI" | High false-positive risk if demoed on synthetic data as if real | High risk of an unconvincing or embarrassing live OCR failure, given even Google's own system calls this "Experimental" |

No overall winner is being declared here, per instructions — this table is meant to inform Step 2 trade-off discussions.

---

## 16. Research-Backed Problem Map

```
                         UNIVERSITY / BOARD EXAMINATION
                                     │
        ┌────────────────┬──────────┴───────┬────────────────┐
        ↓                ↓                  ↓                ↓
    EXAMINER        CONTROLLER OF      STUDENT           REGULATOR /
   (evaluator)        EXAMINATIONS   (affected party)     COURTS (evidenced:
        │              (moderator)          │             Delhi HC, Parl.
        ↓                   ↓                ↓             Standing Cttee)
   On-screen marking   Throughput &      Delayed/disputed        │
   (OSM vendor tools    escalation       marks; revaluation ─────┘
    exist; AI-assist    dashboards       (evidenced: DU, KU,
    NOT found in them)  exist; real-     Panjab, Patiala, HPTU,
        │               time QUALITY     Mumbai, CBSE 2026)
        ↓               dashboards NOT
   Handwriting OCR      found
   (Indic: "Experi-
   mental" in major
   cloud APIs)
                                     ↓
                          CBSE 2026 OSM CRISIS
                    (scan quality, alleged mismatches,
                    ~20 confirmed mix-ups /13,000 manual
                    fallback / 98.7 lakh scripts total;
                    Parliament + Delhi HC involvement)
                                     ↓
                          IDENTIFIED GAPS (§13)
                                     ↓
                          OPPORTUNITY AREAS (§14)
```

---

## 17. Evidence Table (consolidated)

| Finding | Type | Confidence |
|---|---|---|
| CBSE processed ~98.7 lakh answer books digitally for ~17.7 lakh Class 12 students in 2026 | Official fact (widely reported, PTI-sourced figures) | High |
| CBSE Class 12 pass % fell to 85.20–85.29% in 2026 vs 88.39% in 2025 | Official fact | High |
| ~20 answer-sheet mix-up cases and ~13,000 scripts requiring manual evaluation were reported by government sources (PTI) | Official/government-sourced fact | Medium-High |
| Delhi HC sought CBSE's response to an NSUI petition; a Parliamentary Standing Committee reviewed the matter | Official fact (events occurred) | High |
| TCS iON, MeritTrac, Dexit Global, and CBSE's OnMark (via Coempt Eduteck) are real, operating OSM/digital-evaluation providers in India | Industry evidence | High |
| No AI-assisted subjective-marking or anomaly-detection feature is documented in any of the above vendors' public materials found | Industry evidence (absence of evidence) | Medium — absence in search results is not proof of absence in reality |
| LLM-based essay scoring shows moderate promise but is not considered reliable enough to replace human raters, across multiple 2024–2026 systematic reviews | Research finding | High (consistent across independent reviews) |
| Indic-script handwriting OCR is "Experimental" in Google Cloud Vision; lab accuracy figures (88–98%) exist for curated academic Devanagari datasets | Research finding / official product documentation | High (documentation) / Medium (generalizability of lab figures) |
| Marking inconsistency between examiners is a well-documented, decades-old phenomenon (since Starch & Elliott, 1912), improved but not eliminated by training/rubrics/moderation | Research finding | High |
| DPDP Act 2023 requires verifiable parental consent for under-18 student data, with rules notified Nov 2025 and full enforcement May 2027, penalties up to ₹250 crore | Official fact (statute) | High |
| Delays of weeks to months in Indian university revaluation are reported across at least six independent university/board cases over multiple years | User report (aggregated from multiple independent local news sources) | Medium-High (pattern) / Low (no formal national statistic found) |
| A specific, current UGC standard governing AI use in subjective evaluation | — | **Evidence not found — requires validation** |
| Market size, user counts, or precise accuracy/error rates for Indian university evaluation specifically | — | **Evidence not found — requires validation; do not invent** |

---

## 18. Remaining Unknowns

| Unknown | Why it matters | How to validate | Priority |
|---|---|---|---|
| Whether a specific target university already has a base OSM platform, and which vendor | Decides build-a-layer vs. build-a-system scope | Ask hackathon organizers; ask a real exam cell | CRITICAL |
| Whether the hackathon's real primary buyer/user is the Controller of Examinations, an evaluator, or something else | Determines whose workflow to design for | Interview 3–5 exam-cell staff/evaluators/moderators if at all possible | CRITICAL |
| What data (real, synthetic, or public-proxy) the hackathon will actually be allowed/able to use | Determines whether any evaluation-quality claim can be validated at all | Ask organizers directly; check for any provided/sanctioned dataset | CRITICAL |
| Whether AI-influenced marking is acceptable in the target institution's rules, or only assistive/advisory use | Determines feasible scope and avoids building something impermissible | Check specific institutional/UGC rules; ask organizers | CRITICAL |
| The true error/inconsistency rate in Indian university evaluation (baseline) | Needed to claim any improvement credibly | No national dataset found; would need institutional cooperation or a scoped small study | IMPORTANT |
| Whether the CBSE OSM crisis is being formally investigated with findings that will become public (e.g., Parliamentary Committee report) | Could become a major, very current source of validated failure-mode data | Track Parliamentary Standing Committee proceedings and any published findings | IMPORTANT |
| Real-world (non-lab) Indic handwriting OCR accuracy on actual exam-script handwriting | Determines whether OCR-based features are honestly demoable | Would require testing against real or realistic exam-script samples | IMPORTANT |
| Current, specific UGC/AICTE digital-evaluation standards, if any | Determines regulatory scope | Search UGC's current official circulars directly; evidence not found in this pass | IMPORTANT |
| API pricing/limits for OCR and LLM services as of the actual build date | Needed for a feasible hackathon architecture | Check current vendor pricing pages when the build actually starts | OPTIONAL |

---

## 19. Research Synthesis

### WHAT WE NOW KNOW
1. The core problem (slow, inconsistent, hard-to-trust evaluation at scale) is real and currently playing out publicly and dramatically in India via the CBSE 2026 OSM crisis — the strongest single piece of validating evidence available.
2. University-level delay/inconsistency is a recurring, independently-reported pattern across many institutions and years, even without a formal national study.
3. OSM/digital-evaluation infrastructure is a mature, commercially available layer in India (TCS iON, MeritTrac, Dexit Global, and CBSE's own vendor) — this is not something to reinvent.
4. None of the identified commercial OSM products document AI-assisted subjective marking or anomaly detection as a shipped feature — this is a genuine, evidence-based whitespace, not an assumption.
5. Academic consensus (multiple independent 2024–2026 reviews) is that LLM-based grading is promising but not reliable enough to replace humans, and flags fairness/interpretability as open problems.
6. Indic-script handwriting OCR is explicitly labeled experimental by at least one major cloud vendor — a real, documented technical constraint, not caution for its own sake.
7. Marking inconsistency between human examiners is a long-documented (110+ year), partially-but-not-fully solvable phenomenon even without any digital system involved.
8. DPDP Act 2023 creates a real, dated, penalized legal constraint on using real student data, especially for under-18 students.
9. The CBSE crisis has already triggered judicial and legislative scrutiny — a live signal of how seriously trust/audit failures are taken once evaluation goes wrong at scale.

### WHAT WE DON'T KNOW
1. Whether a specific target university already runs an OSM platform (and which one).
2. Who the real primary buyer/user is at that specific institution.
3. What data the hackathon can legitimately use.
4. Whether AI-influenced marking is institutionally/regulatorily acceptable, and to what degree.
5. The true baseline error/inconsistency rate at the university level (no national figure exists).
6. Whether findings from the CBSE Parliamentary inquiry will be published in time to inform design.
7. Real (non-lab) OCR accuracy on actual exam-script handwriting.
8. Current UGC/AICTE-specific rules on digital or AI-assisted evaluation, if any exist.

### WHAT CURRENT SOLUTIONS DO WELL
Workflow digitization, script logistics (barcoding, scanning, allocation), role-based access, basic escalation/audit trails, and — per the vendor claims found — real-time *throughput* monitoring.

### WHAT CURRENT SOLUTIONS DON'T SOLVE WELL (evidence-backed)
Real-time *quality* (not just throughput) visibility; AI-assisted consistency/anomaly support; and — most urgently and visibly — public trust and explainability when something goes wrong, as the CBSE case demonstrates at national scale.

### WHERE OPPORTUNITIES EXIST
Real-time quality signaling; evaluator calibration support grounded in the (extensive) inter-rater-reliability literature; trust/explainability tooling; anomaly detection on marking patterns; and Indic handwriting OCR assistance (acknowledged as the hardest, least mature of these).

### WHAT WOULD MAKE A SOLUTION DIFFERENT
Grounding in the specific, well-evidenced failure modes of the CBSE 2026 case (scan quality, script-identity integrity, escalation speed, public explainability) rather than the generic ten-feature list; being explicit and evidence-honest about where AI is assistive-only, matching the academic consensus rather than overclaiming; and treating trust/audit/explainability as a first-class feature rather than an afterthought, given the demonstrated real-world stakes.

---

## 20. Final Research Gate

**1. Do we understand the real user?**
PARTIAL. We have strong role-level detail from vendor materials and news reporting, but no direct interview data with an actual evaluator, moderator, or Controller of Examinations.

**2. Do we understand the current workflow?**
PARTIAL-to-YES for the generic OSM workflow (well documented by CBSE's own FAQ and vendor materials); PARTIAL for any *specific* target university, since we found evidence of real variation (some institutions QR-code/NAD-integrated, others still manual/postal) and no representative national survey.

**3. Do we understand existing solutions?**
YES for what exists and who the major India-specific OSM/evaluation vendors are (TCS iON, MeritTrac, Dexit Global, CBSE's OnMark/Coempt Eduteck). PARTIAL for their exact feature completeness, since we relied on public marketing/documentation, not hands-on product review.

**4. Do we have evidence for the major pain points?**
YES for the pattern (delay, inconsistency, trust breakdown) — evidenced by both the CBSE 2026 crisis and multiple independent university cases over many years. NO for precise magnitude/frequency (no national error-rate or delay-rate statistic found).

**5. Do we know what data is realistically available?**
PARTIAL. We know real student scripts are very unlikely to be available (DPDP constraints, no public dataset found) and know of some usable public proxy datasets (ASAP essays, academic Indic handwriting datasets) — but we do not know what the hackathon organizers will actually sanction.

**6. Do we understand the major AI limitations?**
YES. This is one of the strongest-evidenced sections — consistent, multi-source academic consensus on LLM-grading limitations and explicit vendor-documented limitations on Indic handwriting OCR.

**7. Do we understand the major privacy/security risks?**
YES for the legal framework (DPDP Act specifics are well documented and current) and for the reputational/trust risk (CBSE case is a live, ongoing demonstration). PARTIAL for institution-specific security requirements, which we have no direct access to.

**8. Do we have enough information to start solution ideation?**
**NOT YET — but close.** Before Step 2, we specifically need: (a) confirmation of whether a base OSM platform is assumed for the target institution, (b) clarity on who the primary user/buyer is meant to be, (c) confirmation of what data (if any) the hackathon will let us use, and (d) any position on the acceptability of AI-influenced marking. These four are the CRITICAL unknowns from §18 and were already flagged as critical in Step 0 — this research pass did not resolve them because they require organizer/institutional input, not more web research.

---

*Waiting for instruction before starting Step 2 — Solution Ideation & Concept Selection.*
