# Requirements Document

## Introduction

NyaySetu AI is a legal assistant chatbot for India's inter-state migrant workers. It guides workers through a structured intake flow, identifies the correct legal jurisdiction, calculates wage arrears, generates formal complaint documents under the Inter-State Migrant Workmen Act 1979 (ISMWA), and tracks cases through to resolution — all in the worker's native language via voice or text.

The chatbot is built on a Flask + React/Vite stack. The backend currently exposes `/api/chat` (Gemini LLM) and `/api/voice` (Gemini STT). This feature spec covers all five phases of chatbot development: session management, jurisdiction resolution, document generation, multilingual depth, and case tracking.

---

## Glossary

- **Chatbot**: The NyaySetu AI conversational interface accessible via the web frontend.
- **Session**: A server-side record of a single worker's conversation, persisted across page refreshes, with a 24-hour TTL.
- **Intake_Flow**: The structured sequence of questions the Chatbot asks to collect the six required entities before proceeding to legal analysis.
- **Required_Entities**: The six data points needed to generate a complaint: `home_state`, `work_state`, `sector`, `contractor_name`, `agreed_wage`, `actual_wage`.
- **Jurisdiction_Engine**: The deterministic, rule-based component that maps `work_state` + `sector` to the correct Labour Commissioner office.
- **Labour_Commissioner**: The state-level authority in the work state with primary jurisdiction to receive ISMWA complaints.
- **ISMWA**: Inter-State Migrant Workmen (Regulation of Employment and Conditions of Service) Act, 1979.
- **Arrears_Calculator**: The arithmetic component that computes wage gap, displacement allowance (50% of monthly wages per ISMWA Section 14), and journey allowance.
- **Document_Generator**: The component that produces legally formatted complaint PDFs (ISMWA Section 16, Labour Court petition, RTI application).
- **OCR_Pipeline**: The component that extracts structured data (amounts, dates, names) from photographs of wage slips and receipts.
- **Language_Detector**: The component that identifies the BCP-47 language code of incoming text or audio.
- **Case_Tracker**: The component that stores case records, monitors elapsed time, and triggers escalation actions at defined intervals.
- **Worker**: A primary user — an inter-state migrant worker using the chatbot to file a wage complaint.
- **NGO_User**: A secondary user — a field worker at an NGO processing cases on behalf of multiple workers.
- **System**: The NyaySetu AI backend application (Flask).
- **Frontend**: The NyaySetu AI React/Vite web application.

---

## Requirements

---

### Requirement 1: Server-Side Session Management

**User Story:** As a worker, I want my conversation to be remembered across page refreshes, so that I do not have to repeat myself if I close the browser or lose connectivity.

#### Acceptance Criteria

1. WHEN a worker sends their first message, THE System SHALL create a server-side session record identified by a unique `session_id` and return that `session_id` to the Frontend.
2. WHEN a worker sends a subsequent message with a valid `session_id`, THE System SHALL load the existing conversation history from the session record and append the new message.
3. WHILE a session is active, THE System SHALL persist the full conversation history server-side so that the Frontend does not need to transmit history on every request.
4. WHEN a session has received no messages for 24 hours, THE System SHALL mark the session as expired and cease to return its history.
5. IF a request arrives with an expired or unknown `session_id`, THEN THE System SHALL create a new session and return the new `session_id` to the Frontend.
6. THE Frontend SHALL store the `session_id` in `localStorage` and include it in every `/api/chat` and `/api/voice` request.

---

### Requirement 2: Structured Intake Flow

**User Story:** As a worker, I want the chatbot to ask me clear, one-at-a-time questions about my situation, so that I can provide the information needed to file a complaint without feeling overwhelmed.

#### Acceptance Criteria

1. WHEN a new session begins, THE Chatbot SHALL present a welcome message and ask the worker for their home state as the first intake question.
2. WHEN the worker provides their home state, THE Chatbot SHALL ask for their work state as the next intake question.
3. WHEN the worker provides their work state, THE Chatbot SHALL ask for their sector (e.g., construction, garments, domestic work).
4. WHEN the worker provides their sector, THE Chatbot SHALL ask for their contractor or employer name.
5. WHEN the worker provides the contractor name, THE Chatbot SHALL ask for the agreed monthly wage.
6. WHEN the worker provides the agreed wage, THE Chatbot SHALL ask for the actual wage received.
7. WHEN all six Required_Entities have been collected, THE Chatbot SHALL present a confirmation summary of the extracted details and ask the worker to confirm or correct them.
8. IF the worker provides a city name instead of a state name, THEN THE System SHALL resolve the city to its corresponding Indian state and confirm the resolved state with the worker.
9. THE Chatbot SHALL ask only one question per response turn during the intake flow.
10. WHEN the worker corrects a previously provided entity, THE System SHALL update the stored entity value and re-confirm the full summary.

---

### Requirement 3: Conversation State Tracking

**User Story:** As a worker, I want the chatbot to know where I am in the process, so that it does not ask me questions I have already answered.

#### Acceptance Criteria

1. THE System SHALL maintain a `conversation_state` field in the session record that tracks the current intake stage: `welcome`, `home_state`, `work_state`, `sector`, `contractor`, `agreed_wage`, `actual_wage`, `confirmation`, `legal_analysis`, `document_ready`.
2. WHEN the worker's response advances the intake flow, THE System SHALL update `conversation_state` to the next stage before responding.
3. WHILE `conversation_state` is in any intake stage, THE Chatbot SHALL not proceed to legal analysis or document generation.
4. WHEN `conversation_state` reaches `confirmation` and the worker confirms the details, THE System SHALL transition `conversation_state` to `legal_analysis`.
5. IF the worker asks a general legal question during the intake flow, THEN THE Chatbot SHALL answer the question briefly and then return to the current intake question.

---

### Requirement 4: Jurisdiction Engine

**User Story:** As a worker, I want the chatbot to tell me exactly which government office to file my complaint with, so that my complaint is not rejected for being filed in the wrong place.

#### Acceptance Criteria

1. THE Jurisdiction_Engine SHALL determine the correct Labour Commissioner office using only `work_state` and `sector` as inputs — not LLM inference.
2. THE Jurisdiction_Engine SHALL cover all 28 states and 8 union territories of India.
3. WHEN `work_state` and `sector` are both known, THE Jurisdiction_Engine SHALL return: authority name, office address, designation of receiving officer, applicable ISMWA section, and complaint form identifier.
4. WHERE the sector is construction, THE Jurisdiction_Engine SHALL additionally check applicability of the Building and Construction Workers (RECS) Act 1996 and include it in the jurisdiction result.
5. THE System SHALL use the Jurisdiction_Engine result — not a language model — to populate the "filing authority" field in all generated complaint documents.
6. WHEN the worker's work state cannot be determined from the provided city name, THE Chatbot SHALL ask the worker to confirm the state name directly.

---

### Requirement 5: Enhanced Legal Reasoning

**User Story:** As a worker, I want the chatbot to give me accurate legal guidance based on the actual text of the law, so that I can trust the advice I receive.

#### Acceptance Criteria

1. THE System SHALL include the full text of ISMWA 1979 Sections 12, 14, 15, 16, and 23 in the language model system prompt.
2. WHEN `conversation_state` is `legal_analysis`, THE Chatbot SHALL identify which ISMWA sections apply to the worker's situation and state them explicitly.
3. THE Chatbot SHALL respond in the same language as the worker's most recent message.
4. WHEN the worker's situation involves wages below the applicable state minimum wage, THE Chatbot SHALL additionally cite the Minimum Wages Act 1948.
5. IF the worker's description contains indicators of bonded labour (debt bondage, movement restriction, withheld documents), THEN THE Chatbot SHALL identify the Bonded Labour System (Abolition) Act 1976 as applicable and advise the worker to contact an NGO.
6. THE Chatbot SHALL keep each response to 3 sentences or fewer during the intake flow, and 5 sentences or fewer during legal analysis.

---

### Requirement 6: Structured Entity Extraction

**User Story:** As a worker, I want the chatbot to correctly understand the details I provide even if I express them informally, so that my complaint contains accurate information.

#### Acceptance Criteria

1. WHEN the worker provides wage information in any format (e.g., "teen hazaar", "₹3000", "3k per month"), THE System SHALL extract a numeric rupee value and store it as `agreed_wage` or `actual_wage`.
2. WHEN the worker names a state using a colloquial or regional variant (e.g., "UP" for Uttar Pradesh, "Bombay" for Maharashtra), THE System SHALL normalise it to the official state name.
3. WHEN the worker names a sector using informal language (e.g., "building kaam", "kapda factory"), THE System SHALL map it to a canonical sector category.
4. THE System SHALL store all extracted entities as structured fields in the session record, separate from the raw conversation text.
5. IF an extracted entity value has low confidence (below 0.7), THEN THE Chatbot SHALL repeat the value back to the worker and ask for confirmation before storing it.

---

### Requirement 7: OCR Evidence Pipeline

**User Story:** As a worker, I want to photograph my wage slip and have the chatbot read it, so that my complaint includes documentary evidence without me having to type out the numbers.

#### Acceptance Criteria

1. WHEN the worker uploads an image file (JPEG, PNG, or HEIC) via the Frontend, THE System SHALL pass it to the OCR_Pipeline for processing.
2. THE OCR_Pipeline SHALL extract: payment amounts, payment dates, employer or contractor name, and worker name from the image.
3. WHEN the OCR_Pipeline returns extracted data with confidence above 0.70, THE System SHALL automatically populate the corresponding session entity fields.
4. IF the OCR_Pipeline returns confidence below 0.70 for any field, THEN THE Chatbot SHALL display the low-confidence value to the worker and ask them to confirm or correct it.
5. IF the image quality is too low for any extraction, THEN THE Chatbot SHALL ask the worker to retake the photo and provide guidance on lighting and framing.
6. WHEN no documentary evidence is available, THE System SHALL offer to generate a sworn oral testimony affidavit template and note that oral complaints are legally valid under ISMWA.

---

### Requirement 8: Arrears Calculation

**User Story:** As a worker, I want the chatbot to calculate exactly how much money I am owed, so that my complaint states the correct amount and I do not accept less than I deserve.

#### Acceptance Criteria

1. THE Arrears_Calculator SHALL compute wage arrears as: `(agreed_wage - actual_wage) × duration_months`.
2. THE Arrears_Calculator SHALL compute displacement allowance as: `0.5 × agreed_wage × duration_months` per ISMWA Section 14.
3. THE Arrears_Calculator SHALL compute journey allowance as a fixed amount per ISMWA Section 15, using the applicable state schedule.
4. THE Arrears_Calculator SHALL compute total claim as: `wage_arrears + displacement_allowance + journey_allowance`.
5. THE Arrears_Calculator SHALL use arithmetic operations only — not language model inference — for all monetary calculations.
6. WHEN the calculated total claim is presented to the worker, THE Chatbot SHALL display the itemised breakdown (wage arrears, displacement allowance, journey allowance, total).
7. IF the actual wage is below the applicable state minimum wage, THEN THE Arrears_Calculator SHALL use the minimum wage as the floor for `agreed_wage` in the calculation and note this adjustment to the worker.

---

### Requirement 9: Complaint Document Generation

**User Story:** As a worker, I want the chatbot to generate a ready-to-file complaint document, so that I do not need to know legal formats or write in English.

#### Acceptance Criteria

1. WHEN `conversation_state` is `document_ready`, THE Document_Generator SHALL produce an ISMWA Section 16 complaint PDF addressed to the authority returned by the Jurisdiction_Engine.
2. THE Document_Generator SHALL populate the complaint with: worker name, home state, work state, contractor name, sector, agreed wage, actual wage, duration, calculated arrears, and applicable ISMWA sections.
3. THE Document_Generator SHALL use hardcoded structural legal language for all fixed complaint sections; the language model SHALL only fill variable fields.
4. THE Document_Generator SHALL produce the complaint in English.
5. WHERE the worker's preferred language is not English, THE Document_Generator SHALL also produce a parallel translation of the complaint in the worker's language.
6. THE Document_Generator SHALL exclude the worker's home address from the complaint PDF by default to protect against contractor retaliation.
7. WHEN the complaint PDF is ready, THE System SHALL make it available for download via the Frontend within 60 seconds of the worker confirming their details.
8. THE Document_Generator SHALL include the mandatory legal disclaimer on the first page of every generated document.

---

### Requirement 10: Labour Court Petition Generation

**User Story:** As a worker, I want the system to automatically prepare a Labour Court petition if my complaint is not resolved, so that I can escalate without needing a lawyer.

#### Acceptance Criteria

1. WHEN a case has been in `filed` status for 30 days without a resolution update, THE Document_Generator SHALL generate a Labour Court petition for that case.
2. THE Labour Court petition SHALL reference the original ISMWA Section 16 complaint by case number and filing date.
3. WHEN the Labour Court petition is generated, THE System SHALL notify the worker via the Frontend and make the document available for download.

---

### Requirement 11: RTI Application Generation

**User Story:** As a worker, I want the system to generate an RTI application if my case is still unresolved after 45 days, so that I can compel the authority to respond.

#### Acceptance Criteria

1. WHEN a case has been in `filed` status for 45 days without a resolution update, THE Document_Generator SHALL generate an RTI application addressed to the Chief Labour Commissioner.
2. THE RTI application SHALL request the status and action taken on the original complaint by case number.
3. WHEN the RTI application is generated, THE System SHALL notify the worker via the Frontend and make the document available for download.

---

### Requirement 12: Language Detection and Multilingual Response

**User Story:** As a worker, I want to speak and type in my own language and receive responses in the same language, so that I can use the chatbot without knowing English.

#### Acceptance Criteria

1. THE Language_Detector SHALL identify the BCP-47 language code of every incoming text message without requiring the worker to specify their language.
2. THE Chatbot SHALL respond in the same language as the worker's most recent message.
3. THE System SHALL support the following languages at minimum: Hindi (`hi`), Bhojpuri (`bho`), Odia (`or`), Bengali (`bn`), Maithili (`mai`), and English (`en`).
4. WHEN the detected language is Bhojpuri or Maithili, THE System SHALL use Hindi as the STT model language and respond in the detected language using translation.
5. WHEN the worker switches language mid-conversation, THE Chatbot SHALL detect the new language and respond in the new language from that turn onward.
6. THE System SHALL preserve all structured entity values (wages, states, dates) in their canonical form regardless of the language used to express them.

---

### Requirement 13: Voice Input Processing

**User Story:** As a worker, I want to speak my complaint rather than type it, so that I can use the chatbot even if I have low literacy or find typing difficult.

#### Acceptance Criteria

1. THE Frontend SHALL allow the worker to record a voice message of up to 120 seconds per turn.
2. WHEN a voice recording is submitted, THE System SHALL transcribe it using the STT pipeline and return the transcript text.
3. THE System SHALL achieve transcription accuracy above 90% for Hindi, Odia, Bengali, and English audio inputs.
4. WHEN the STT pipeline returns a transcript, THE System SHALL pass it through the same intake flow and entity extraction logic as a text message.
5. IF the STT pipeline returns an empty transcript or confidence below 0.5, THEN THE Chatbot SHALL ask the worker to repeat their message.
6. WHEN a voice message is transcribed, THE System SHALL display the transcript text to the worker in the chat interface so they can verify it.

---

### Requirement 14: Case Tracking Dashboard

**User Story:** As a worker, I want to see the status of my complaint in a dashboard, so that I know what is happening with my case without having to ask.

#### Acceptance Criteria

1. WHEN a complaint PDF is generated, THE Case_Tracker SHALL create a case record with fields: `case_id`, `worker_session_id`, `employer_name`, `wages_claimed`, `status`, `filed_date`, `next_action`, `next_action_date`.
2. THE Case_Tracker SHALL support the following status values: `intake`, `ready`, `filed`, `escalated`, `resolved`.
3. THE Frontend Dashboard SHALL display all case records for the current worker's session, including case ID, employer name, wages claimed, status, next action, and filed date.
4. WHEN a case status changes, THE Frontend Dashboard SHALL reflect the updated status within 60 seconds of the change.
5. THE Frontend Dashboard SHALL replace the current hardcoded sample data with live case records from the `/api/cases` endpoint.

---

### Requirement 15: Automated Follow-Up and Escalation Triggers

**User Story:** As a worker, I want the system to automatically follow up on my case at the right times, so that my complaint does not get forgotten.

#### Acceptance Criteria

1. WHEN a case reaches `filed` status, THE Case_Tracker SHALL schedule follow-up checks at day 7, day 14, day 30, and day 45 from the `filed_date`.
2. WHEN a day-7 or day-14 check triggers, THE System SHALL display a status prompt in the Frontend asking the worker if they have received a response.
3. WHEN a day-30 check triggers and the case is still in `filed` status, THE System SHALL automatically generate a Labour Court petition per Requirement 10 and update the case status to `escalated`.
4. WHEN a day-45 check triggers and the case is still in `escalated` status, THE System SHALL automatically generate an RTI application per Requirement 11.
5. WHEN the worker reports that their complaint has been resolved, THE Case_Tracker SHALL update the case status to `resolved` and record the resolution date and outcome.

---

### Requirement 16: Entitlement Discovery

**User Story:** As a worker, I want the chatbot to tell me about other benefits I may be entitled to, so that I do not miss out on welfare schemes I qualify for.

#### Acceptance Criteria

1. WHEN `conversation_state` reaches `legal_analysis`, THE Chatbot SHALL check the worker's eligibility for: e-Shram accident insurance (₹2 lakh), Building and Construction Workers welfare board (where sector is construction), PMJAY health insurance, and applicable state minimum wage compliance.
2. WHEN the worker is eligible for one or more entitlements, THE Chatbot SHALL list them with a brief description of each benefit after presenting the primary legal analysis.
3. THE Chatbot SHALL present entitlement information as supplementary to — not a replacement for — the primary wage complaint guidance.

---

### Requirement 17: Legal Disclaimer

**User Story:** As a user of the system, I want to be informed that the chatbot's output is not formal legal advice, so that I understand the limitations of the tool.

#### Acceptance Criteria

1. THE Chatbot SHALL display the mandatory legal disclaimer on the first message of every new session.
2. THE Document_Generator SHALL include the mandatory legal disclaimer on the first page of every generated PDF document.
3. THE mandatory legal disclaimer SHALL state: "NyaySetu AI generates legal documents based on user-provided information and publicly available laws. It does not constitute legal advice. Generated complaints are a starting point; users are encouraged to seek additional legal counsel for complex cases."

---

### Requirement 18: Complaint Document Round-Trip Integrity

**User Story:** As a developer, I want to verify that complaint documents are generated consistently from the same inputs, so that I can trust the output is deterministic and correct.

#### Acceptance Criteria

1. THE Document_Generator SHALL produce identical complaint PDFs when given identical session entity values and jurisdiction results.
2. FOR ALL valid sets of Required_Entities, parsing the generated complaint PDF and re-extracting the entity values SHALL return values equivalent to the original inputs (round-trip property).
3. THE Arrears_Calculator SHALL return the same total claim value for the same inputs regardless of the order in which entity fields are provided.
