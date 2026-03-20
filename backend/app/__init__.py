from flask import Flask
from flask_cors import CORS
from dotenv import load_dotenv
import os

load_dotenv()

def create_app():
    app = Flask(__name__)
    CORS(app)

    from app.routes.voice import voice_bp
    from app.routes.chat import chat_bp
    app.register_blueprint(voice_bp)
    app.register_blueprint(chat_bp)

    return app
