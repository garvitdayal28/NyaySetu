from flask import Blueprint, request, jsonify
from services.voice_pipeline import VoicePipeline
import os

voice_bp = Blueprint("voice", __name__)
pipeline = VoicePipeline(api_key=os.getenv("GEMINI_API_KEY"))


@voice_bp.route("/api/voice", methods=["POST"])
def transcribe():
    """
    Accepts an audio file (webm/ogg/wav), transcribes it via Gemini STT,
    and returns the transcript + detected language.
    """
    if "audio" not in request.files:
        return jsonify({"error": "No audio file provided"}), 400

    audio_file = request.files["audio"]
    audio_bytes = audio_file.read()

    if not audio_bytes:
        return jsonify({"error": "Empty audio file"}), 400

    lang_hint = request.form.get("lang_hint")  # optional BCP-47 hint

    result = pipeline.transcribe(audio_bytes, lang_hint=lang_hint)

    return jsonify({
        "text": result.text,
        "detected_language": result.detected_language,
        "confidence": result.confidence,
    })
