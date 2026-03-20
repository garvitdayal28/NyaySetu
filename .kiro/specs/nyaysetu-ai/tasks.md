# Implementation Plan: NyaySetu AI

## Overview

Incremental implementation following priority order: Data Models → Voice Pipeline → RAG Pipeline → WhatsApp Webhook Handler → Jurisdiction Engine → OCR → Complaint PDF → Conversation State Machine → Case Tracking → Entitlement Discovery → NGO Dashboard → Security/Performance → Integration. Each task builds on the previous, ending with full wiring. All backend code is Python/Flask; frontend is React 18 + Tailwind CSS.

## Tasks

- [ ] 1. Set up backend project structure and shared data models
  - Create `backend/` directory layout: `app/`, `services/`, `models/`, `tests/`, `templates/`
  - Define all dataclasses in `backend/app/models.py`: `Case`, `Worker`, `ConversationSession`, `GroupComplaint`, `WageData`, `JurisdictionResult`, `LabourOffice`, `TranscriptResult`, `RAGResult`, `LawDocument`, `LawChunk`, `ComplaintDocument`, `EscalationTask`, `EscalationEvent`
  - Define enums: `CaseStatus`, `EscalationStatus`, `ConversationState`
  - Create `backend/requirements.txt` with all dependencies: Flask, google-generativeai, chromadb, firebase-admin, WeasyPrint, Jinja2, APScheduler, hypothesis, pytest, pydub, requests
  - Create `backend/app/__init__.py` Flask app factory with config loading from environment variables (no secrets in source code)
  - Create `backend/app/firebase_init.py` to initialise Firebase Admin SDK from environment credentials
  - _Requirements: 1.7, 2.2, 4.7, 6.3, 7.1, 8.1, 11.2_

- [ ] 2. Implement Voice Pipeline (STT + TTS)
  - [ ] 2.1 Implement `VoicePipeline` class in `backend/services/voice_pipeline.py`
    - OGG/Opus → WAV conversion using pydub/ffmpeg before sending to Gemini STT
    - Gemini STT transcription returning `TranscriptResult` with non-empty `text`, BCP-47 `detected_language`, and `confidence` in [0.0, 1.0]
    - Language detection: persist to session when `confidence >= 0.6`; re-attempt with `lang_hint` when `confidence < 0.6`
    - TTS synthesis returning valid MP3 bytes in worker's session language
    - Exponential backoff retry (1s, 2s, 4s, max 3 retries) on Gemini 5xx errors
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 13.1_

  - [ ]* 2.2 Write property test for session language persistence
    - **Property 9: Session Language Persists Once Detected** — for any session where `detected_language` was set with `confidence >= 0.6`, the session language must not change for the remainder of that session
    - **Validates: Requirements 2.4**

  - [ ]* 2.3 Write unit tests for VoicePipeline
    - Test OGG→WAV conversion produces valid WAV bytes
    - Test `lang_hint` fallback triggered when confidence < 0.6
    - Test unsupported language triggers interactive button message listing 10 supported languages
    - Test 5-minute inactivity defaults session language to Hindi (hi)
    - _Requirements: 2.5, 2.7, 2.8_

- [ ] 3. Implement RAG Pipeline (ChromaDB + Gemini)
  - [ ] 3.1 Implement `LawDocument` ingestion and chunking in `backend/services/rag_pipeline.py`
    - Parse law documents into chunks with metadata: `doc_id`, `title`, `content`, `state`, `act_name`, `section_number`, `effective_date`
    - Embed chunks using Gemini `text-embedding-004` and store in ChromaDB with metadata
    - Implement `pretty_print(doc)` that formats a `LawDocument` back to human-readable string preserving section structure
    - _Requirements: 3.1, 14.1, 14.2, 14.3_

  - [ ] 3.2 Implement `RAGPipeline.query()` with grounded Gemini generation
    - Embed query using Gemini `text-embedding-004`; enforce max 2000 character input
    - Cosine similarity search, default `top_k=5`, valid range [1, 20]; return all available docs without error when store has fewer than `top_k`
    - Build system prompt: `[LEGAL CONTEXT]\n{chunks}\n[END CONTEXT]`; instruct Gemini to cite section numbers and answer only from context
    - Gemini generation at temperature = 0.1
    - Extract citations and validate each references a `doc_id` present in `source_chunks`
    - _Requirements: 3.2, 3.3, 3.4, 3.5, 3.6, 3.7_

  - [ ]* 3.3 Write property test for RAG citation grounding
    - **Property 4: RAG Citations Are Grounded in Retrieved Chunks** — for any user query, every citation string in `RAGResult.citations` must reference a `doc_id` present in `RAGResult.source_chunks`
    - **Validates: Requirements 3.5**

  - [ ]* 3.4 Write property test for law document round-trip
    - **Property 5: Law Document Ingestion Round-Trip** — for any valid `LawDocument`, parse → pretty-print → parse must produce an object equivalent to the original
    - **Validates: Requirements 14.4**

  - [ ]* 3.5 Write unit tests for RAGPipeline
    - Test query with fewer docs than `top_k` returns all available without error
    - Test query exceeding 2000 characters is rejected with a validation error
    - Test round-trip: ingest an ISMWA section → query a phrase from it → assert it appears in top-k results
    - _Requirements: 3.6, 3.7, 3.8_

- [ ] 4. Checkpoint — Ensure Voice Pipeline and RAG Pipeline tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. Implement WhatsApp Webhook Handler
  - [ ] 5.1 Implement `WhatsAppClient` in `backend/services/whatsapp_client.py`
    - `send_text(to, body)`, `send_document(to, doc_url, caption)`, `send_interactive_buttons(to, body, buttons)`, `download_media(media_id)` methods
    - Exponential backoff retry (1s, 2s, 4s, max 3 retries) on Meta API 4xx/5xx errors
    - Mark case `delivery_failed=True` and update Firestore when all retries exhausted
    - _Requirements: 1.8, 13.4, 13.5_

  - [ ] 5.2 Implement `/webhook/whatsapp` POST route in `backend/app/routes/webhook.py`
    - Validate `x-hub-signature-256` header using HMAC-SHA256; reject with HTTP 403 if invalid or absent
    - Parse message type: audio → VoicePipeline, text/interactive → RAGPipeline, image → OCRService
    - Get-or-create `ConversationSession` in Firestore per phone number
    - Return HTTP 200 within 5 seconds; dispatch processing asynchronously (background thread)
    - Rate limiting: 20 messages/minute per phone number; reject with HTTP 429 if exceeded
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 11.1, 11.3, 12.3_

  - [ ]* 5.3 Write property test for webhook signature rejection
    - **Property 12: Webhook Signature Rejection** — any POST with absent or incorrect HMAC-SHA256 must return HTTP 403 and not process the payload
    - **Validates: Requirements 1.1, 1.2, 11.1**

  - [ ]* 5.4 Write property test for rate limit enforcement
    - **Property 13: Rate Limit Enforcement** — for any phone number, messages beyond the 20th in a 60-second window must be rejected with HTTP 429
    - **Validates: Requirements 11.3**

  - [ ]* 5.5 Write unit tests for WhatsApp webhook handler
    - Test audio routing to VoicePipeline
    - Test text routing to RAGPipeline
    - Test image routing to OCRService
    - Test session creation on first message
    - _Requirements: 1.3, 1.4, 1.5, 1.7_

- [ ] 6. Implement Jurisdiction Engine
  - [ ] 6.1 Implement `JurisdictionEngine` in `backend/services/jurisdiction_engine.py`
    - Load Labour Commissioner office directory from Firestore at startup; schedule daily refresh
    - `determine(origin_state, dest_state, employer_state)` — pure deterministic function, no external API calls
    - ISMWA §13 rule: `primary_office` = dest_state office
    - Include origin_state office in `alternate_offices` when it differs from dest_state
    - Include employer_state office in `alternate_offices` when it differs from both origin and dest states
    - Validate ISO 3166-2:IN state codes for `origin_state` and `dest_state`; raise `ValidationError` on invalid input
    - Return fallback `JurisdictionResult` with Ministry of Labour helpline when `lookup_labour_office()` returns None; flag case for admin review
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 4.8, 4.9, 13.6_

  - [ ]* 6.2 Write property test for jurisdiction determinism
    - **Property 1: Jurisdiction Determinism** — calling `determine()` twice with identical inputs returns identical results
    - **Validates: Requirements 4.1, 4.6**

  - [ ]* 6.3 Write property test for jurisdiction primary office
    - **Property 2: Jurisdiction Primary Office is Destination State** — `result.primary_office.state` must equal `dest_state` for any valid input
    - **Validates: Requirements 4.2**

  - [ ]* 6.4 Write property test for no external API calls
    - **Property 3: Jurisdiction Engine Makes No External API Calls** — mock all HTTP clients and assert zero invocations during `determine()`
    - **Validates: Requirements 4.1**

  - [ ]* 6.5 Write unit tests for JurisdictionEngine
    - Test fallback result when office not found
    - Test invalid state code raises ValidationError
    - Test employer_state = None does not add alternate office
    - _Requirements: 4.8, 4.9_

- [ ] 7. Implement OCR Wage Slip Extraction
  - [ ] 7.1 Implement `OCRService` in `backend/services/ocr_service.py`
    - Accept JPEG/PNG/HEIC image bytes; use Gemini Vision for structured `WageData` extraction
    - Store original image in Firebase Storage; include storage reference in case record
    - Return `WageData` with `raw_text` and `confidence` fields
    - When `confidence < 0.7`, trigger WhatsApp confirmation message for low-confidence fields
    - Store both OCR value and worker-corrected value in case record
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [ ]* 7.2 Write property test for OCR low-confidence confirmation
    - **Property 15: OCR Low-Confidence Confirmation** — for any `WageData` with `confidence < 0.7`, the system must send a WhatsApp confirmation before accepting values
    - **Validates: Requirements 5.3**

  - [ ]* 7.3 Write unit tests for OCRService
    - Test structured extraction returns all WageData fields
    - Test `raw_text` is always populated
    - Test Firebase Storage upload and reference stored in case
    - _Requirements: 5.1, 5.2, 5.4_

- [ ] 8. Implement Complaint PDF Generator
  - [ ] 8.1 Create Jinja2 HTML complaint template in `backend/templates/complaint.html`
    - Include: worker details, employer details, wage calculation table, ISMWA sections violated, relief sought, jurisdiction statement
    - _Requirements: 6.2_

  - [ ] 8.2 Implement `ComplaintGenerator` in `backend/services/complaint_generator.py`
    - Validate `case.wages_owed > 0` and `case.period_start < case.period_end`; raise `ValidationError` otherwise
    - Render Jinja2 template → WeasyPrint PDF
    - Assign UUID-based `complaint_number`
    - Upload PDF to Firebase Storage; return signed URL with 7-day expiry
    - Ensure at least one ISMWA section in `complaint.sections`
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 11.5_

  - [ ]* 8.3 Write property test for complaint PDF validity
    - **Property 6: Complaint PDF Validity** — for any valid `Case` and `JurisdictionResult`, `pdf_bytes` starts with `%PDF-`, `complaint_number` is non-None, and `sections` is non-empty
    - **Validates: Requirements 6.1, 6.3, 6.5**

  - [ ]* 8.4 Write unit tests for ComplaintGenerator
    - Test `wages_owed <= 0` raises ValidationError
    - Test `period_start >= period_end` raises ValidationError
    - Test PDF generation completes within 5 seconds
    - _Requirements: 6.6, 6.7_

- [ ] 9. Checkpoint — Ensure Jurisdiction, OCR, and Complaint Generator tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 10. Implement Conversational Intake State Machine
  - [ ] 10.1 Implement `ConversationStateMachine` in `backend/services/conversation.py`
    - States: GREETING → INTAKE → CLARIFICATION → REVIEW → COMPLETE
    - Ask one missing required field at a time in worker's session language
    - `collected_fields` only grows; never remove a set key
    - Transition to CLARIFICATION when all required fields collected
    - Invoke JurisdictionEngine + ComplaintGenerator on CLARIFICATION complete; transition to REVIEW
    - On worker confirmation → COMPLETE, update case to COMPLAINT_READY, send PDF link
    - On worker rejection → back to INTAKE
    - Mark session expired after 24h inactivity; send context summary on resume
    - Persist session to Firestore before each outbound response
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 7.9, 7.10, 7.11_

  - [ ]* 10.2 Write property test for collected fields monotonic growth
    - **Property 10: Collected Fields Are Monotonically Growing** — the set of keys in `collected_fields` must only grow over the lifetime of a session; no key may be removed once set
    - **Validates: Requirements 7.8**

  - [ ]* 10.3 Write unit tests for ConversationStateMachine
    - Test full GREETING → INTAKE → CLARIFICATION → REVIEW → COMPLETE happy path
    - Test rejection at REVIEW transitions back to INTAKE
    - Test session expiry after 24h and context summary on resume
    - _Requirements: 7.1, 7.7, 7.9, 7.10_

- [ ] 11. Implement Case Tracker and Escalation Scheduler
  - [ ] 11.1 Implement `CaseTracker` in `backend/services/case_tracker.py`
    - `create_case()`: schedule Day 7, 14, 30, 45 escalation dates; write to Firestore
    - `update_status()`: update case status and notes in Firestore
    - `get_due_escalations()`: query Firestore for `next_followup_date <= today AND status != RESOLVED`; no duplicates
    - Record each escalation event in `escalation_history` with timestamp
    - Ensure `escalation_history` timestamps are monotonically increasing
    - Update `next_followup_date` and `escalation_stage` after each escalation
    - _Requirements: 8.1, 8.2, 8.6, 8.7, 8.8, 8.9_

  - [ ] 11.2 Implement APScheduler escalation job in `backend/services/escalation_scheduler.py`
    - Run every 6 hours; call `get_due_escalations()`
    - Day 7/14: send WhatsApp status update in worker's session language
    - Day 30: generate Labour Court petition PDF; send via WhatsApp
    - Day 45: generate RTI application PDF; send via WhatsApp
    - _Requirements: 8.2, 8.3, 8.4, 8.5_

  - [ ]* 11.3 Write property test for escalation history monotonicity
    - **Property 7: Escalation History is Monotonically Increasing** — `triggered_at` timestamps in `escalation_history` must be in strictly ascending order
    - **Validates: Requirements 8.7**

  - [ ]* 11.4 Write property test for due escalations exclude resolved cases
    - **Property 14: Due Escalations Exclude Resolved Cases** — `get_due_escalations()` must return only cases where `status != RESOLVED`, with no case appearing twice
    - **Validates: Requirements 8.2, 8.9**

  - [ ]* 11.5 Write unit tests for CaseTracker
    - Test escalation dates calculated correctly at case creation
    - Test Day 30 generates Labour Court petition PDF
    - Test Day 45 generates RTI application PDF
    - _Requirements: 8.1, 8.4, 8.5_

- [ ] 12. Implement Entitlement Discovery
  - [ ] 12.1 Implement `EntitlementDiscoverer` in `backend/services/entitlement_discoverer.py`
    - Check eligibility for e-Shram registration, PMJAY health insurance, BOCW welfare fund
    - Return eligibility result per scheme: eligible / already_registered / ineligible
    - When eligible for one or more schemes, send WhatsApp message listing schemes with descriptions in worker's session language
    - _Requirements: 10.1, 10.2, 10.3_

  - [ ]* 12.2 Write unit tests for EntitlementDiscoverer
    - Test all three eligibility states returned correctly
    - Test WhatsApp message sent only when at least one scheme is eligible
    - _Requirements: 10.2, 10.3_

- [ ] 13. Implement Group Complaint Mode and NGO Dashboard API
  - [ ] 13.1 Implement `/api/group-complaints` POST endpoint in `backend/app/routes/group_complaints.py`
    - Validate `member_case_ids` length ≤ 50; reject with validation error otherwise
    - Create `GroupComplaint` record in Firestore
    - Invoke `ComplaintGenerator` to produce combined PDF; store as `combined_complaint_url`
    - Send alert to NGO dashboard when Labour office not found for a linked case
    - _Requirements: 9.1, 9.2, 9.3, 9.5_

  - [ ]* 13.2 Write property test for group complaint size constraint
    - **Property 8: Group Complaint Size Constraint** — `len(member_case_ids)` must be ≤ 50 for any `GroupComplaint`
    - **Validates: Requirements 9.2**

  - [ ] 13.3 Implement NGO Dashboard React frontend in `frontend/src/`
    - Firebase Auth login page with role-based access (NGO users see only their `ngo_id` cases)
    - Cases list view: display all cases linked to authenticated NGO
    - Alert banner for `delivery_failed=True` cases and missing Labour office cases
    - Group complaint creation form (lead case + member cases, max 50)
    - _Requirements: 9.4, 9.5, 11.4, 13.5_

  - [ ]* 13.4 Write unit tests for group complaint endpoint
    - Test > 50 member cases rejected with validation error
    - Test combined PDF URL stored on GroupComplaint
    - Test NGO isolation: cases from other NGOs not returned
    - _Requirements: 9.2, 9.3, 9.4_

- [ ] 14. Implement Security, Error Handling, and Resilience
  - [ ] 14.1 Add OWASP mitigations to Flask app in `backend/app/__init__.py`
    - Security response headers (X-Content-Type-Options, X-Frame-Options, CSP)
    - Input validation middleware for all routes
    - Ensure all secrets loaded from environment variables / Firebase Secret Manager
    - _Requirements: 11.2, 11.6_

  - [ ] 14.2 Implement centralised error handler and retry utility in `backend/app/utils/retry.py`
    - Exponential backoff decorator: 1s, 2s, 4s delays, max 3 retries
    - Apply to all Gemini API calls and WhatsApp outbound calls
    - On Gemini exhaustion: return cached response if available; else send worker "temporarily unavailable" WhatsApp message
    - Log all errors and retry attempts to Firebase; emit Cloud Monitoring alerts for critical failures
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.7_

  - [ ]* 14.3 Write unit tests for retry and error handling
    - Test exponential backoff fires correct delays on 5xx
    - Test cached response returned when Gemini unavailable
    - Test worker receives "temporarily unavailable" message after all retries exhausted
    - _Requirements: 13.1, 13.2, 13.3_

- [ ] 15. Wire all components together and integrate Flask app
  - [ ] 15.1 Register all blueprints and initialise all services in `backend/app/__init__.py`
    - Wire webhook route → WhatsAppClient + VoicePipeline + RAGPipeline + OCRService + ConversationStateMachine
    - Initialise APScheduler escalation job on app startup
    - Seed ChromaDB with ISMWA 1979 + state wage schedule documents at startup
    - Firestore indexes: `next_followup_date` + `status` for escalation queries
    - _Requirements: 1.6, 3.1, 8.2, 12.3_

  - [ ] 15.2 Wire React frontend to Flask API
    - Configure Vite proxy to Flask backend in `frontend/vite.config.js`
    - Connect NGO Dashboard components to `/api/group-complaints` and case list endpoints
    - Firebase Auth integration in React app
    - _Requirements: 9.4, 11.4_

  - [ ]* 15.3 Write integration tests for end-to-end webhook flow
    - POST mock webhook with audio → assert Firestore case created + WhatsApp reply sent
    - POST mock webhook with image → assert OCR extraction + confirmation message sent
    - Escalation scheduler: create case with `next_followup_date = today` → run scheduler → assert WhatsApp message sent + Firestore updated
    - _Requirements: 1.1–1.8, 8.2, 8.3_

- [ ] 16. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at key integration points
- Property tests use `hypothesis` library and validate universal correctness properties
- Unit tests use `pytest` and validate specific examples and edge cases
- All Gemini API keys and secrets must be in environment variables — never in source code
