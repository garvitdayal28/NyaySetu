import io
import time
import tempfile
import os
from dataclasses import dataclass

import google.generativeai as genai
from pydub import AudioSegment


# Languages supported for transcription (BCP-47 codes)
SUPPORTED_LANGUAGES = {"hi", "bho", "mai", "or", "bn", "sat", "ta", "gu", "mr", "pa"}

# Gemini maps some codes differently — normalise to what the API accepts
LANG_NORMALISE = {
    "bho": "hi",   # Bhojpuri: fall back to Hindi STT model
    "mai": "hi",   # Maithili: fall back to Hindi
    "sat": "bn",   # Santali: fall back to Bengali
}


@dataclass
class TranscriptResult:
    text: str
    detected_language: str  # BCP-47
    confidence: float        # 0.0 – 1.0


class VoicePipeline:
    def __init__(self, api_key: str):
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel("gemini-1.5-flash")

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def transcribe(self, audio_bytes: bytes, lang_hint: str | None = None) -> TranscriptResult:
        """
        Transcribe audio bytes (webm / ogg / wav) to text using Gemini.
        Returns TranscriptResult with text, detected_language, and confidence.
        """
        wav_bytes = self._to_wav(audio_bytes)

        result = self._call_gemini_stt(wav_bytes, lang_hint)

        # If confidence is low and a hint was provided, retry with the hint forced
        if result.confidence < 0.6 and lang_hint:
            retry = self._call_gemini_stt(wav_bytes, forced_lang=lang_hint)
            if retry.confidence >= result.confidence:
                result = retry

        return result

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _to_wav(self, audio_bytes: bytes) -> bytes:
        """Convert any pydub-supported format (webm, ogg, mp4) to WAV bytes."""
        try:
            audio = AudioSegment.from_file(io.BytesIO(audio_bytes))
        except Exception:
            # Already WAV or unrecognised — return as-is and let Gemini handle it
            return audio_bytes

        buf = io.BytesIO()
        audio.export(buf, format="wav")
        return buf.getvalue()

    def _call_gemini_stt(
        self, wav_bytes: bytes, forced_lang: str | None = None
    ) -> TranscriptResult:
        """
        Upload audio to Gemini and ask it to transcribe + detect language.
        Retries up to 3 times with exponential backoff on 5xx errors.
        """
        lang_instruction = ""
        if forced_lang:
            normalised = LANG_NORMALISE.get(forced_lang, forced_lang)
            lang_instruction = f" The audio is in language code '{normalised}'."

        prompt = (
            "Transcribe the following audio accurately."
            + lang_instruction
            + " Reply in JSON with exactly these keys: "
            '{"text": "<transcription>", "language": "<BCP-47 code>", "confidence": <0.0-1.0>}. '
            "Do not include any other text."
        )

        # Write wav to a temp file — Gemini SDK requires a file path or upload
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tmp:
            tmp.write(wav_bytes)
            tmp_path = tmp.name

        try:
            return self._gemini_with_retry(tmp_path, prompt)
        finally:
            os.unlink(tmp_path)

    def _gemini_with_retry(self, audio_path: str, prompt: str) -> TranscriptResult:
        """Call Gemini with exponential backoff (1s, 2s, 4s, max 3 retries)."""
        delays = [1, 2, 4]
        last_error = None

        for attempt, delay in enumerate(delays + [None]):
            try:
                audio_file = genai.upload_file(audio_path, mime_type="audio/wav")
                response = self.model.generate_content([prompt, audio_file])
                return self._parse_gemini_response(response.text)
            except Exception as e:
                last_error = e
                if delay is not None:
                    time.sleep(delay)

        # All retries exhausted — return a fallback empty result
        return TranscriptResult(text="", detected_language="hi", confidence=0.0)

    def _parse_gemini_response(self, raw: str) -> TranscriptResult:
        """Parse Gemini's JSON response into a TranscriptResult."""
        import json
        import re

        # Strip markdown code fences if present
        cleaned = re.sub(r"```(?:json)?\s*|\s*```", "", raw).strip()

        try:
            data = json.loads(cleaned)
            text = data.get("text", "").strip()
            lang = data.get("language", "hi").strip()
            confidence = float(data.get("confidence", 0.5))
            confidence = max(0.0, min(1.0, confidence))  # clamp to [0, 1]

            # Normalise language to supported set
            if lang not in SUPPORTED_LANGUAGES:
                lang = "hi"

            return TranscriptResult(text=text, detected_language=lang, confidence=confidence)
        except (json.JSONDecodeError, ValueError):
            # Gemini returned plain text instead of JSON — use it as-is
            return TranscriptResult(
                text=raw.strip(),
                detected_language="hi",
                confidence=0.5,
            )
