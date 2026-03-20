Product Requirements Document

NyaySetu AI

Wage Justice Infrastructure for India's Migrant Workforce

Document Version
1.0 — Initial Release	Prepared For
AWS GenAI Hackathon, IIT Kanpur
Status
Draft — For Review	Category
Legal Tech / Social Impact AI
 
1. Product Overview
1.1 Product Name & Tagline

NyaySetu AI
Nyay (न्याय) = Justice  ·  Setu (सेतु) = Bridge
"Bridging the gap between workers and the justice they are legally owed"

1.2 One-Line Summary
NyaySetu AI is a WhatsApp-native, voice-first AI application that enables India's 10 crore inter-state migrant workers to identify wage theft, determine correct legal jurisdiction, generate a formal complaint under the Inter-State Migrant Workmen Act 1979, and track it to resolution — in their own language, in under 10 minutes, at zero cost.
1.3 Problem Being Solved
The Inter-State Migrant Workmen Act (ISMWA) 1979 legally entitles every inter-state migrant worker to equal wages, a 50% displacement allowance, journey allowance, and suitable accommodation. Despite 46 years on the books, enforcement is near zero because workers face three compounding barriers:

•	Legal invisibility — workers are unaware that ISMWA exists or applies to them.
•	Jurisdictional confusion — workers approach the wrong authority (home state vs. work state), are turned away, and give up.
•	Documentation and language barriers — complaints require English legal formats; workers have WhatsApp screenshots and handwritten receipts in regional languages.

10 Cr
Circular migrants	₹3,500
Avg. monthly underpayment	46 yrs
ISMWA unenforced	0
Existing AI solutions
1.4 Target Users

Primary — Migrant worker
Male or female, 18–45, from Bihar/Jharkhand/UP/Odisha. Working in Gujarat/Maharashtra/Delhi NCR. Feature-phone or low-end Android. Communicates via WhatsApp voice in Hindi, Bhojpuri, Maithili, Odia, Bengali, or Santali.	Secondary — NGO field worker
Frontline workers at Aajeevika Bureau, Jan Sahas, or Shramik Sahayata Kendra using NyaySetu to process multiple worker cases and generate bulk complaints.
Tertiary — Union representative
AITUC/INTUC representatives filing group complaints on behalf of workers from the same worksite using the multi-complainant feature.	Administrative — Labour Commissioner
Destination-state Labour Commissioner offices receiving standardized NyaySetu-generated complaint PDFs, reducing intake back-and-forth.
 
2. Goals & Success Metrics
2.1 Product Goals
1.	Accessibility — Enable any migrant worker with a WhatsApp-capable phone to file a legally valid complaint without external help.
2.	Accuracy — Achieve correct jurisdiction identification in 100% of cases — eliminating the primary reason complaints are rejected.
3.	Speed — Reduce complaint preparation time from weeks (with NGO help) to under 10 minutes.
4.	Language coverage — Support 6 major migrant source-language groups at launch, expanding to 12 within 6 months.
5.	Traceability — Give workers full visibility into case status so they never have to follow up manually.
2.2 Key Metrics

Objective	Hackathon (48 hr demo)	6-month post-launch
Jurisdiction accuracy	100% on test cases	≥98% on live cases
Complaint generation time	<10 min demo	<8 min avg.
Language support	6 languages	12 Indian languages
Worker activation	Live test persona	10,000 workers onboarded
Complaint filing rate	3 demo complaints	≥70% of flows complete
Wage recovery potential	₹3,500Cr projected at 1% TAM	₹50Cr tracked (pilot)
NGO partner integrations	1 pitch deck ready	3 NGO partners live
 
3. Features & Requirements
3.1 Feature Descriptions
F1 — Multilingual Voice Intake
Workers initiate via WhatsApp voice message in their native language. Supported: Hindi, Bhojpuri, Maithili, Odia, Bengali, Santali, Tamil, Gujarati, Marathi, Punjabi. Text fallback available. AI extracts: home state, work state, sector, contractor name, agreed wage, actual wage, duration of underpayment.
•	Voice messages up to 120 seconds per turn
•	Follow-up questions in the same language as input
•	Session memory across 20 turns within 24 hours
F2 — Jurisdiction Engine
Determines the correct Labour Commissioner office (state + district) under ISMWA, covering all 36 states and union territories. Rule-based Lambda — not LLM-generated — ensuring deterministic accuracy.
•	Work state has primary ISMWA jurisdiction (not home state)
•	District-level routing based on workplace city
•	Secondary jurisdiction check for Construction Workers Act, Minimum Wages Act
F3 — Evidence Documentation
Workers photograph any available evidence. Textract extracts structured data from low-quality phone photographs of handwritten receipts, wage slips, and WhatsApp screenshots. Oral testimony affidavit generated if no evidence is available.
F4 — Complaint Auto-Generation
Generates a legally formatted complaint for the specific receiving authority — ISMWA Section 16 complaint, Labour Court petition (day 30), or RTI application (day 45). Calculates exact arrears: wage gap + displacement allowance (50% per month) + journey allowance. Output in English + worker's language.
F5 — Case Tracking & Escalation
Day 0: Complaint filed, case number issued. Day 7/14: Status pings. Day 30: Auto-generate Labour Court petition. Day 45: Auto-generate RTI to Chief Labour Commissioner. All messages in worker's language.
F6 — Entitlement Discovery
Checks additional rights the worker qualifies for: e-Shram accident insurance (Rs 2 lakh), Building & Construction Workers welfare board, state minimum wage compliance, PMJAY health insurance eligibility.
F7 — Group Complaint Mode
For NGOs and unions: single complaint naming up to 50 complainants, shared evidence pool, bulk PDF generation, NGO admin dashboard (QuickSight) for case tracking across all filed complaints.

3.2 Functional Requirements

ID	Feature	Requirement	Priority	Status
FR-01	Voice Intake	Accept WhatsApp voice up to 120s; transcribe >90% accuracy across 10 languages	P0	Open
FR-02	Lang Detection	Auto-detect input language without user specification	P0	Open
FR-03	Jurisdiction	Correctly identify work-state jurisdiction in 100% of ISMWA cases	P0	Open
FR-04	Arrears Calc	Calculate wage gap, displacement allowance, journey allowance per ISMWA	P0	Open
FR-05	Complaint PDF	Generate authority-specific complaint PDF within 10 min of intake completion	P0	Open
FR-06	OCR	Extract monetary figures and dates from phone camera images >85% accuracy	P0	Open
FR-07	WhatsApp Delivery	Deliver complaint PDF via WhatsApp within 2 minutes of generation	P0	Open
FR-08	Follow-up Pings	Automated WhatsApp status check at day 7, 14, 30	P1	Open
FR-09	Day-30 Escalation	Auto-generate Labour Court petition at day 30 if unresolved	P1	Open
FR-10	e-Shram Check	Check e-Shram registration and initiate insurance claim if eligible	P1	Open
FR-11	Group Complaint	Support up to 50 complainants per filing	P2	Open
FR-12	Min Wage Check	Cross-reference wages against applicable state minimum wage schedule	P1	Open
FR-13	IVR Fallback	Amazon Connect IVR fallback for zero-data users	P2	Open
FR-14	Oral Testimony	Generate structured affidavit when no documentary evidence available	P1	Open
 
4. Technical Architecture
4.1 Architecture Overview
NyaySetu AI is a serverless, event-driven system built entirely on AWS managed services. Entry point: WhatsApp Business API. Compute: Lambda. AI reasoning: Amazon Bedrock (Claude). Knowledge retrieval: Amazon Kendra (RAG). No servers, no infrastructure management — fully auto-scaling.

4.2 AWS Services

Service	Role	Configuration Notes
Amazon Bedrock	Legal reasoning + complaint drafting	Claude 3.5 Sonnet. System prompt includes ISMWA full text, jurisdiction tree, and state-specific complaint format specs.
Amazon Transcribe	Speech-to-text across 10 languages	Custom vocabulary: contractor terms, wage terminology, district names in vernacular. Streaming transcription.
Amazon Kendra	RAG for legal knowledge	Indexed: ISMWA 1979, 36 state minimum wage schedules, Labour Court formats, e-Shram API docs. Updated quarterly.
Amazon Translate	Cross-lingual responses	Auto-detect language. Custom terminology for legal accuracy. English + worker language parallel output.
Amazon Textract	Evidence OCR	Analyze Expense API for wage slips. Forms analysis for contracts. Queries API for amounts and dates.
Amazon S3	Storage for evidence + PDFs	Encrypted worker evidence buckets. Generated PDFs with 7-year retention. Signed URLs for WhatsApp delivery.
Amazon DynamoDB	Session state + case tracking	Worker sessions (TTL 24h). Case records (no TTL). Indexed by phone number hash for privacy.
Amazon SNS	WhatsApp notification pipeline	Day 7/14/30/45 follow-up triggers. Escalation events. Case resolution confirmations.
Amazon Lambda	All application logic	Stateless functions: intake, jurisdiction engine, Bedrock orchestrator, Textract handler, PDF assembler, scheduler.
Amazon Connect	IVR fallback for zero-data users	Voice call pathway replicating WhatsApp flow. For workers with no mobile data connectivity.
AWS API Gateway	WhatsApp webhook receiver	Receives incoming messages, routes to intake Lambda. Rate limiting + auth.
Amazon QuickSight	NGO + admin analytics	Case volume by state, resolution rates, time-to-resolution, wages recovered. Daily refresh.

4.3 Primary Data Flow

Step 1 — Intake
Worker sends WhatsApp voice message. API Gateway webhook → Lambda downloads audio → S3 upload → Transcribe job → transcript returned to session processor.

Step 2 — Entity extraction
Bedrock extracts: home_state, work_state, sector, contractor_name, agreed_wage, actual_wage, duration_months. Stored in DynamoDB. Missing entities trigger follow-up questions in worker's language.

Step 3 — Jurisdiction determination
Jurisdiction Lambda (rule-based, not LLM) queries Kendra with work_state + sector. Returns: authority name, address, designation, complaint form ID, legal basis (ISMWA section).

Step 4 — Evidence processing
Worker sends photo. Lambda → Textract Analyze Expense → structured extraction (amounts, dates, names) → appended to DynamoDB case record. Low-confidence flags prompt worker to retake photo.

Step 5 — Complaint generation
Bedrock prompt: worker entities + jurisdiction + evidence + ISMWA text (Kendra) + authority-specific template. Output: English complaint. Parallel Translate call generates worker-language copy. PDF assembled. S3 storage. Signed URL delivered via WhatsApp.

Step 6 — Tracking
Case record created in DynamoDB (status=FILED). EventBridge rules at day 7/14/30/45. Each triggers SNS → Lambda → WhatsApp message in worker's language.
 
5. User Flows
5.1 Primary Flow — Individual Worker
6.	Trigger — Worker sends voice note: 'Mera contractor 3 mahine se pura paisa nahi de raha.'
7.	Intake — AI responds in Hindi, asks: home state? Work state? Agreed vs. actual wage?
8.	Confirmation — Worker answers. AI confirms extracted details and asks for evidence.
9.	Evidence — Worker photographs wage slip. Textract extracts Rs 8,000. AI calculates Rs 10,500 wage arrears + Rs 5,250 displacement allowance.
10.	Generation — AI generates complaint PDF to Gujarat Labour Commissioner (Surat district) — work-state jurisdiction correctly applied.
11.	Delivery — Worker receives PDF on WhatsApp within 2 minutes with filing instructions in Hindi.
12.	Follow-up — Day 7: Status ping. Worker confirms no response. System logs.
13.	Escalation — Day 30: Labour Court petition auto-generated and delivered.

5.2 Edge Case Handling

No evidence available
Generates sworn oral testimony affidavit template. Notes that oral complaints are legally valid under ISMWA but evidenced complaints are stronger.	Worker doesn't know work state
AI asks for city name. Geocoding Lambda resolves to state automatically. 'Surat' → Gujarat.
Bonded labour indicators detected
Routes to Bonded Labour System Act pathway with police complaint generation and NGO alert escalation.	Contractor is unregistered
Switches to ISMWA Section 14 (unregistered contractor penalty) with simultaneous filing to DLC and State Labour Commissioner.
 
6. Legal & Regulatory Framework
6.1 Primary Legal Basis

Inter-State Migrant Workmen (RECS) Act, 1979
Section 12: Equal wages as paid to local workers for identical work. Section 14: Displacement allowance — 50% of monthly wages per month of employment away from home state. Section 15: Journey allowance — employer bears travel cost to and from home state. Section 16: Complaints filed with Inspector of the work state (not home state). Section 23: Criminal liability — up to one year imprisonment and/or fine for contractor violations.

6.2 Additional Frameworks
•	Minimum Wages Act, 1948 — all 36 state schedules indexed in Kendra
•	Building & Construction Workers (RECS) Act, 1996 — welfare board registration and benefits
•	Bonded Labour System (Abolition) Act, 1976 — debt bondage and movement restriction cases
•	e-Shram Portal — Rs 2 lakh accident insurance, welfare scheme eligibility
•	Contract Labour (Regulation & Abolition) Act, 1970 — intermediary contractor cases

6.3 Mandatory Disclaimer
Required on first interaction and all generated documents
NyaySetu AI generates legal documents based on user-provided information and publicly available laws. It does not constitute legal advice. Generated complaints are a starting point; users are encouraged to seek additional legal counsel for complex cases. NyaySetu AI is not liable for outcomes of filed complaints.
 
7. Risks & Mitigations

Risk	Severity	Description	Mitigation
Hallucinated jurisdiction	Critical	Bedrock misidentifies authority; worker files with wrong office	Jurisdiction logic is rule-based Lambda — not LLM. Bedrock drafts complaint text only. Deterministic rules engine.
Incorrect arrears calculation	High	AI underestimates owed amount; worker accepts less	Arithmetic is Lambda-computed, not LLM. Zero tolerance for underestimation — system rounds in worker's favor.
Worker retaliation	High	Contractor discovers complaint and retaliates	Complaint filed to authority, not contractor. Worker home address excluded from PDF by default.
Low-quality OCR	Medium	Textract fails on very blurry documents	Confidence threshold at 70%. Below threshold: retake guidance given. Oral testimony fallback always available.
Legal template errors	Medium	Bedrock generates incorrect complaint language	Structural legal language is hardcoded. Bedrock fills variable fields only. Templates pre-validated by legal team.
WhatsApp API changes	Low	Meta policy changes or rate limits	Amazon Connect IVR fallback. SMS via SNS. Web form fallback via shared URL.
 
8. Product Roadmap

Phase	Timeline	Deliverables
Phase 0	Hackathon (48 hrs)	Working WhatsApp demo, 6 language support, ISMWA complaint generation, jurisdiction engine for 5 destination states, live demo with test worker persona
Phase 1	Month 1–2	Full 36-state jurisdiction coverage, 10 language support, Textract evidence pipeline, PDF generation, SNS tracking
Phase 2	Month 3–4	e-Shram integration, Construction Workers Act module, group complaint mode, NGO dashboard, 3 pilot NGO partnerships
Phase 3	Month 5–6	Amazon Connect IVR fallback, RTI auto-generation, Labour Court petition module, public case tracker, wage recovery analytics
Phase 4	Month 7–12	Bonded Labour pathway, mobile app, API for NGO integration, credit history product from resolved cases, state government MOU negotiations

8.1 Future Expansion
•	Employer compliance registry — contractors with filed complaints listed on a public, searchable database.
•	Credit history product — resolved complaints create verifiable financial history enabling NBFC credit access for workers.
•	Pan-India wage theft heatmap — anonymized case data generating district-level visualization of underpayment concentration.
•	State portal integration — direct API filing with Labour Commissioner digital portals, eliminating physical submission.
 
9. Appendix
9.1 Glossary

ISMWA — Inter-State Migrant Workmen (Regulation of Employment and Conditions of Service) Act, 1979 — the primary legal framework entitling migrant workers to equal wages, displacement allowance, and journey allowance.
RAG — Retrieval-Augmented Generation — technique of grounding LLM responses in specific retrieved documents (here: ISMWA text, state wage schedules, court formats via Amazon Kendra).
DLC — District Labour Commissioner — district-level authority under the state Labour Commissioner who receives and processes ISMWA complaints in the work state.
e-Shram — Government of India national database of unorganised workers. Registration provides Rs 2 lakh accident insurance and access to social security schemes.
Displacement Allowance — Under ISMWA Section 14, a worker employed away from home state is entitled to 50% of monthly wages per month of employment as compensation for displacement.
Work-state jurisdiction — The work state — not the home state — has primary jurisdiction to hear ISMWA complaints. The most commonly misunderstood and most impactful legal fact in this domain.
NyaySetu — Nyay (न्याय) = Justice, Setu (सेतु) = Bridge. A bridge between workers and the justice they are legally owed.

9.2 References
•	Inter-State Migrant Workmen (RECS) Act, 1979 — Ministry of Labour & Employment, Government of India
•	NITI Aayog: India's Booming Gig and Platform Economy, 2022
•	Census of India 2011 — Internal Migration Data
•	National Commission for Enterprises in the Unorganised Sector (NCEUS) Report, 2009
•	e-Shram Portal: Unorganised Workers Registration Data — Ministry of Labour & Employment
•	Amazon Bedrock, Transcribe, Kendra, Textract — AWS Official Documentation, 2024

NyaySetu AI  ·  PRD v1.0  ·  AWS GenAI Hackathon, IIT Kanpur 2025  ·  Confidential