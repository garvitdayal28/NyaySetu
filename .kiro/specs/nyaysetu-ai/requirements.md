# Requirements Document

## Introduction

NyaySetu AI is a WhatsApp-native, voice-first legal aid platform for India's migrant workers. It enables workers to report wage theft, determine the correct legal jurisdiction under the Inter-State Migrant Workmen Act 1979 (ISMWA), auto-generate formal complaints, and track cases to resolution — entirely through WhatsApp voice/text messages in 10+ regional languages. A React + Tailwind web dashboard serves NGOs and case managers. The system is grounded in statutory text via a RAG pipeline and uses a deterministic jurisdiction engine to map worker origin/destination state pairs to the correct Labour Commissioner office.

## Glossary

- **System**: The NyaySetu AI platform as a whole
- **WhatsApp_Handler**: The Flask webhook endpoint that receives and routes inbound WhatsApp messages
- **Voice_Pipeline**: The service that transcribes audio to text and synthesises TTS responses using Gemini API
- **RAG_Pipeline**: The retrieval-augmented generation service that grounds Gemini responses in statutory law documents
- **Jurisdiction_Engine**: The deterministic rule engine that maps state pairs to Labour Commissioner offices under ISMWA 1979
- **OCR_Service**: The service that extracts structured wage data from images using Gemini Vision
- **Complaint_Generator**: The service that produces legally formatted PDF complaints under ISMWA 1979
- **Case_Tracker**: The service that manages case lifecycle and triggers time-based escalations
- **Escalation_Scheduler**: The APScheduler job that runs every 6 hours to process due escalation tasks
- **Entitlement_Discoverer**: The service that checks worker eligibility for government welfare schemes
- **NGO_Dashboard**: The React + Tailwind web interface for NGOs and case managers
- **Worker**: An inter-state migrant worker using the platform via WhatsApp
- **NGO**: A non-governmental organisation using the web dashboard to manage group complaints
- **Case**: A wage theft complaint record in Firebase Firestore
- **ConversationSession**: A per-phone-number stateful session tracking intake progress
- **GroupComplaint**: A combined complaint linking multiple workers against the same employer
- **ISMWA**: Inter-State Migrant Workmen Act 1979
- **BOCW**: Building and Other Construction Workers Act
- **RTI**: Right to Information Act
- **BCP-47**: IETF language tag standard (e.g., "hi" for Hindi, "bho" for Bhojpuri)
- **E.164**: International telephone number format (e.g., +919876543210)
- **WageData**: Structured data extracted from a wage slip image
- **JurisdictionResult**: The output of the Jurisdiction_Engine containing the primary and alternate Labour Commissioner offices
- **EscalationStatus**: Enum of escalation stages: DAY_7_FOLLOWUP, DAY_14_FOLLOWUP, DAY_30_LABOUR_COURT, DAY_45_RTI
- **CaseStatus**: Enum of case states: INTAKE, COMPLAINT_READY, FILED, ESCALATED, RESOLVED

---

## Requirements

### Requirement 1: WhatsApp Message Ingestion and Routing

**User Story:** As a migrant worker, I want to send voice notes, text messages, and images via WhatsApp, so that I can report wage theft without installing any app.

#### Acceptance Criteria

1. WHEN an inbound webhook POST arrives at `/webhook/whatsapp`, THE WhatsApp_Handler SHALL validate the `x-hub-signature-256` header using HMAC-SHA256 before processing the message.
2. IF the HMAC-SHA256 signature is invalid or absent, THEN THE WhatsApp_Handler SHALL reject the request with HTTP 403 and log the attempt.
3. WHEN a validated inbound message has type `audio`, THE WhatsApp_Handler SHALL route it to the Voice_Pipeline for transcription.
4. WHEN a validated inbound message has type `text` or `interactive`, THE WhatsApp_Handler SHALL route it to the RAG_Pipeline for response generation.
5. WHEN a validated inbound message has type `image`, THE WhatsApp_Handler SHALL route it to the OCR_Service for wage data extraction.
6. THE WhatsApp_Handler SHALL return HTTP 200 to Meta's servers within 5 seconds of receiving any webhook event.
7. THE WhatsApp_Handler SHALL maintain a ConversationSession per worker phone number in Firebase Firestore, creating one if it does not exist.
8. THE WhatsApp_Handler SHALL send outbound messages to workers via the Meta WhatsApp Business API, supporting text messages, document links, and interactive button messages.

---

### Requirement 2: Voice-First Multilingual Intake

**User Story:** As a migrant worker, I want to speak in my native language (Hindi, Bhojpuri, Odia, etc.) and have the system understand me, so that I can report my case without needing to read or write.

#### Acceptance Criteria

1. WHEN audio bytes in OGG/Opus format are received, THE Voice_Pipeline SHALL convert them to WAV format before sending to the Gemini STT API.
2. WHEN audio is transcribed, THE Voice_Pipeline SHALL return a `TranscriptResult` containing a non-empty `text`, a BCP-47 `detected_language` code, and a `confidence` score in the range [0.0, 1.0].
3. THE Voice_Pipeline SHALL support transcription in the following languages: Hindi (hi), Bhojpuri (bho), Maithili (mai), Odia (or), Bengali (bn), Santali (sat), Tamil (ta), Gujarati (gu), Marathi (mr), Punjabi (pa).
4. WHEN `detected_language` is identified with `confidence >= 0.6`, THE Voice_Pipeline SHALL persist that language to the ConversationSession and use it for all subsequent responses.
5. IF `lang_hint` is provided and transcription `confidence < 0.6`, THEN THE Voice_Pipeline SHALL re-attempt transcription using `lang_hint` as the forced language.
6. WHEN a TTS response is requested, THE Voice_Pipeline SHALL synthesise audio in the worker's persisted session language and return valid MP3 bytes.
7. IF the detected language is not in the supported language set, THEN THE WhatsApp_Handler SHALL send the worker an interactive button message listing the 10 supported languages and request them to choose one.
8. IF the worker does not respond to a language selection prompt within 5 minutes, THEN THE System SHALL default the session language to Hindi (hi).

---

### Requirement 3: RAG Pipeline — Statutory Law Retrieval

**User Story:** As a legal aid worker, I want the system's answers to be grounded in actual statutory text (ISMWA 1979, state wage schedules, BOCW rules), so that the legal guidance is accurate and citable.

#### Acceptance Criteria

1. THE RAG_Pipeline SHALL ingest law documents (ISMWA 1979, state minimum wage schedules, BOCW rules) into the vector store at system startup, storing each chunk with metadata including `state`, `act_name`, `section_number`, and `effective_date`.
2. WHEN a user query is received, THE RAG_Pipeline SHALL embed the query using Gemini `text-embedding-004` and perform cosine similarity search against the vector store, retrieving the top-k chunks (default k=5, range [1, 20]).
3. WHEN generating a legal response, THE RAG_Pipeline SHALL construct a system prompt containing only the retrieved law chunks and instruct Gemini to answer solely from that context, citing section numbers.
4. THE RAG_Pipeline SHALL use Gemini temperature = 0.1 for all legal response generation to ensure conservative, deterministic answers.
5. WHEN a RAGResult is returned, THE RAG_Pipeline SHALL ensure every citation in `result.citations` references a document present in `result.source_chunks`.
6. THE RAG_Pipeline SHALL accept user queries of maximum 2000 characters.
7. WHEN the vector store contains fewer documents than `top_k`, THE RAG_Pipeline SHALL return all available documents without error.
8. THE RAG_Pipeline SHALL support a round-trip ingestion and retrieval property: for any ingested law document, querying with a phrase from that document SHALL return that document among the top-k results.

---

### Requirement 4: Deterministic Jurisdiction Engine

**User Story:** As a migrant worker, I want to know exactly which Labour Commissioner office to file my complaint with, so that my case is not dismissed on jurisdictional grounds.

#### Acceptance Criteria

1. WHEN `determine(origin_state, dest_state, employer_state)` is called, THE Jurisdiction_Engine SHALL return a `JurisdictionResult` without making any external API call.
2. THE Jurisdiction_Engine SHALL set `primary_office` to the Labour Commissioner office of `dest_state` in accordance with ISMWA 1979 §13.
3. WHEN `origin_state` differs from `dest_state`, THE Jurisdiction_Engine SHALL include the `origin_state` Labour Commissioner office in `alternate_offices`.
4. WHEN `employer_state` is not None and differs from both `origin_state` and `dest_state`, THE Jurisdiction_Engine SHALL include the `employer_state` Labour Commissioner office in `alternate_offices`.
5. THE Jurisdiction_Engine SHALL always return a `JurisdictionResult` with at least one valid office in `valid_offices`.
6. THE Jurisdiction_Engine SHALL produce identical results for identical inputs across multiple invocations (pure deterministic function).
7. THE Jurisdiction_Engine SHALL load the Labour Commissioner office directory from Firebase Firestore at startup and refresh it daily.
8. IF `lookup_labour_office(state)` returns None for a given state, THEN THE Jurisdiction_Engine SHALL return a fallback `JurisdictionResult` containing the Ministry of Labour helpline number and generic ISMWA §13 guidance.
9. THE Jurisdiction_Engine SHALL accept only valid ISO 3166-2:IN state codes for `origin_state` and `dest_state`; IF an invalid code is provided, THEN THE Jurisdiction_Engine SHALL raise a validation error.

---

### Requirement 5: OCR Wage Slip Extraction

**User Story:** As a migrant worker, I want to photograph my wage slip and have the system read it automatically, so that I do not have to manually type all the numbers.

#### Acceptance Criteria

1. WHEN an image in JPEG, PNG, or HEIC format is received, THE OCR_Service SHALL use Gemini Vision to extract structured `WageData` including employer name, worker name, period start/end, wages paid, wages due, and itemised deductions.
2. THE OCR_Service SHALL store the original image in Firebase Storage and include the storage reference in the case record.
3. WHEN `WageData.confidence < 0.7`, THE System SHALL send the worker a WhatsApp confirmation message displaying the extracted values and asking them to confirm or correct each low-confidence field.
4. THE OCR_Service SHALL include a `raw_text` field in `WageData` containing the full unstructured text extracted from the image.
5. WHEN the worker provides a manual correction to an OCR-extracted field, THE System SHALL store both the original OCR value and the corrected value in the case record.

---

### Requirement 6: Automated Complaint PDF Generation

**User Story:** As a migrant worker, I want a formally formatted complaint document generated automatically, so that I can submit it to the Labour Commissioner without needing a lawyer.

#### Acceptance Criteria

1. WHEN `generate(case, jurisdiction)` is called with a valid `Case` and `JurisdictionResult`, THE Complaint_Generator SHALL produce a `ComplaintDocument` whose `pdf_bytes` begin with the magic bytes `%PDF-`.
2. THE Complaint_Generator SHALL populate the complaint PDF using a Jinja2 HTML template rendered to PDF via WeasyPrint, including: worker details, employer details, wage calculation, ISMWA sections violated, relief sought, and a jurisdiction statement.
3. THE Complaint_Generator SHALL assign each complaint a unique `complaint_number` (UUID-based).
4. THE Complaint_Generator SHALL upload the generated PDF to Firebase Storage and return a publicly accessible signed URL with a 7-day expiry as `storage_url`.
5. THE Complaint_Generator SHALL include at least one ISMWA section number in `complaint.sections`.
6. WHEN `case.wages_owed <= 0` or `case.period_start >= case.period_end`, THEN THE Complaint_Generator SHALL raise a validation error and not generate a PDF.
7. THE Complaint_Generator SHALL complete PDF generation within 5 seconds per complaint.

---

### Requirement 7: Conversational Intake State Machine

**User Story:** As a migrant worker, I want the system to guide me through providing my case details step by step, so that I do not miss any important information.

#### Acceptance Criteria

1. THE System SHALL manage each worker's intake through a ConversationSession with states: GREETING → INTAKE → CLARIFICATION → REVIEW → COMPLETE.
2. WHEN a new worker sends their first message, THE System SHALL transition the session to INTAKE state and begin collecting required fields.
3. WHILE in INTAKE state, THE System SHALL ask for one missing required field at a time in the worker's session language.
4. WHEN all required fields are collected, THE System SHALL transition to CLARIFICATION state and ask follow-up questions to resolve ambiguities.
5. WHEN all clarifications are complete, THE System SHALL invoke the Jurisdiction_Engine and Complaint_Generator, then transition to REVIEW state and send the worker a complaint summary.
6. WHEN the worker confirms the complaint summary, THE System SHALL transition to COMPLETE state, update the case status to COMPLAINT_READY, and send the PDF link via WhatsApp.
7. WHEN the worker rejects the complaint summary, THE System SHALL transition back to INTAKE state and ask what needs to be changed.
8. THE System SHALL ensure that `session.collected_fields` only grows during a session; fields SHALL NOT be removed once set.
9. WHEN a ConversationSession has had no activity for 24 hours, THE System SHALL mark it as expired.
10. WHEN a worker resumes a conversation after session expiry, THE System SHALL send a context summary message and allow the worker to confirm continuation or restart.
11. THE System SHALL persist the ConversationSession to Firebase Firestore before sending each outbound response.

---

### Requirement 8: Case Tracking and Escalation

**User Story:** As a migrant worker, I want to be automatically reminded and escalated through the legal process if my employer does not respond, so that my case does not stall.

#### Acceptance Criteria

1. WHEN a case is created, THE Case_Tracker SHALL schedule four escalation checkpoints: Day 7 follow-up, Day 14 follow-up, Day 30 Labour Court petition, and Day 45 RTI application.
2. THE Escalation_Scheduler SHALL run every 6 hours and query Firebase for cases where `next_followup_date <= today` AND `status != RESOLVED`.
3. WHEN a Day 7 or Day 14 escalation is due, THE System SHALL send the worker a WhatsApp status update in their session language.
4. WHEN a Day 30 escalation is due, THE System SHALL generate a Labour Court petition PDF and send it to the worker via WhatsApp.
5. WHEN a Day 45 escalation is due, THE System SHALL generate an RTI application PDF and send it to the worker via WhatsApp.
6. THE Case_Tracker SHALL record each escalation event in `case.escalation_history` with a timestamp.
7. THE Case_Tracker SHALL ensure `escalation_history` timestamps are monotonically increasing.
8. THE Case_Tracker SHALL update `next_followup_date` and `escalation_stage` in Firebase after each escalation is triggered.
9. THE Case_Tracker SHALL return only cases where `status != RESOLVED` from `get_due_escalations()`, ensuring no case appears twice in a single scheduler run.

---

### Requirement 9: Group Complaint Mode (NGO Dashboard)

**User Story:** As an NGO case manager, I want to file a combined complaint on behalf of multiple workers against the same employer, so that collective action is more effective.

#### Acceptance Criteria

1. WHEN a POST request is made to `/api/group-complaints` with a `lead_case_id`, a list of `member_case_ids`, and an `ngo_id`, THE System SHALL create a `GroupComplaint` record in Firebase.
2. THE System SHALL enforce a maximum of 50 member cases per `GroupComplaint`; IF `member_case_ids` contains more than 50 entries, THEN THE System SHALL reject the request with a validation error.
3. WHEN a `GroupComplaint` is created, THE Complaint_Generator SHALL produce a combined PDF complaint covering all member workers and store it as `combined_complaint_url`.
4. THE NGO_Dashboard SHALL display all cases linked to the authenticated NGO's `ngo_id` and SHALL NOT display cases linked to other NGOs.
5. WHEN a Labour office is not found for a case linked to an NGO, THE System SHALL send an alert to the NGO_Dashboard for that case.

---

### Requirement 10: Entitlement Discovery

**User Story:** As a migrant worker, I want to know which government welfare schemes I am eligible for, so that I can access benefits I may not know about.

#### Acceptance Criteria

1. WHEN a worker's profile is complete, THE Entitlement_Discoverer SHALL check eligibility for e-Shram registration, PMJAY health insurance, and BOCW welfare fund registration.
2. THE Entitlement_Discoverer SHALL return an eligibility result for each scheme indicating whether the worker is eligible, already registered, or ineligible.
3. WHEN a worker is found eligible for one or more schemes, THE System SHALL send them a WhatsApp message listing the eligible schemes with brief descriptions in their session language.

---

### Requirement 11: Security and Access Control

**User Story:** As a system administrator, I want all worker data to be protected and access to be role-restricted, so that worker PII is not exposed.

#### Acceptance Criteria

1. THE System SHALL validate the HMAC-SHA256 signature on every inbound WhatsApp webhook request and reject unsigned or incorrectly signed requests with HTTP 403.
2. THE System SHALL store all Gemini API keys and other secrets in environment variables or Firebase Secret Manager and SHALL NOT include them in source code.
3. THE System SHALL enforce a rate limit of 20 messages per minute per phone number; IF the limit is exceeded, THEN THE System SHALL reject additional messages with HTTP 429.
4. THE NGO_Dashboard SHALL use Firebase Authentication with role-based access control, ensuring NGO users can only read and write cases associated with their own `ngo_id`.
5. THE System SHALL generate Firebase Storage complaint PDF URLs as signed URLs with a maximum expiry of 7 days; the PDFs SHALL NOT be publicly listable.
6. THE System SHALL apply OWASP Top 10 mitigations on the Flask API, including input validation and security response headers.

---

### Requirement 12: Performance

**User Story:** As a migrant worker, I want the system to respond quickly so that the conversation feels natural and I do not give up.

#### Acceptance Criteria

1. THE Voice_Pipeline SHALL complete transcription of a 30-second audio clip within 3 seconds under normal operating conditions.
2. THE RAG_Pipeline SHALL complete a full query (embedding + vector search + Gemini generation) within 2 seconds under normal operating conditions.
3. THE WhatsApp_Handler SHALL return HTTP 200 to Meta's servers within 5 seconds of receiving any webhook event; long-running processing SHALL be handled asynchronously.
4. THE Complaint_Generator SHALL complete PDF generation within 5 seconds per complaint.

---

### Requirement 13: Error Handling and Resilience

**User Story:** As a migrant worker, I want the system to handle failures gracefully so that my case data is not lost if something goes wrong.

#### Acceptance Criteria

1. IF the Gemini API returns a 5xx error or times out, THEN THE System SHALL retry the request with exponential backoff (1s, 2s, 4s delays, maximum 3 retries) before returning an error.
2. IF all Gemini API retries are exhausted, THEN THE System SHALL send the worker a WhatsApp message in their session language informing them the system is temporarily unavailable and to try again in a few minutes.
3. IF the Gemini API is unavailable and a cached response exists for the same query, THEN THE System SHALL return the cached response.
4. IF a WhatsApp outbound message delivery fails with a 4xx or 5xx response from Meta, THEN THE System SHALL retry up to 3 times with exponential backoff.
5. IF all WhatsApp delivery retries fail, THEN THE System SHALL mark the case with `delivery_failed=True` and display an alert on the NGO_Dashboard.
6. IF `lookup_labour_office(state)` returns None, THEN THE Jurisdiction_Engine SHALL return a fallback result containing the Ministry of Labour helpline number and generic ISMWA §13 guidance, and SHALL flag the case for admin review.
7. THE System SHALL log all errors and retry attempts to Firebase and SHALL emit alerts via Cloud Monitoring for critical failures.

---

### Requirement 14: Law Document Parsing and Ingestion

**User Story:** As a system administrator, I want law documents (ISMWA 1979, state wage schedules) to be correctly parsed and ingested into the vector store, so that the RAG pipeline has accurate statutory content.

#### Acceptance Criteria

1. WHEN a law document is ingested, THE RAG_Pipeline SHALL parse it into chunks with metadata fields: `doc_id`, `title`, `content`, `state`, `act_name`, `section_number`, and `effective_date`.
2. THE RAG_Pipeline SHALL store parsed law chunks in the vector store (ChromaDB for development, Pinecone for production).
3. THE RAG_Pipeline SHALL support a pretty-print operation that formats a `LawDocument` back into a human-readable string preserving section structure.
4. FOR ALL valid `LawDocument` objects, parsing then pretty-printing then parsing SHALL produce an equivalent object (round-trip property).
