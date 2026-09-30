from flask import Flask, jsonify

from app.routes.match_routes import match_blueprint


def create_app():
    app = Flask(__name__)
    app.register_blueprint(match_blueprint)

    @app.get("/health")
    def health():
        return jsonify({"status": "ok"})

    return app
