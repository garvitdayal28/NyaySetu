from flask import Blueprint, request, jsonify
from services.chat_service import ChatService
import os

chat_bp = Blueprint("chat", __name__)
_service = None

def get_service():
    global _service
    if _service is None:
        _service = ChatService(api_key=os.getenv("OPENAI_API_KEY"))
    return _service


@chat_bp.route("/api/chat", methods=["POST"])
def chat():
    data = request.get_json(silent=True) or {}
    user_message = (data.get("message") or "").strip()
    history = data.get("history") or []

    if not user_message:
        return jsonify({"error": "No message provided"}), 400

    try:
        reply = get_service().reply(history, user_message)
        return jsonify({"reply": reply})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
