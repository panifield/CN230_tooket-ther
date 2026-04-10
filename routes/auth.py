from flask import Blueprint, jsonify

auth_bp = Blueprint("auth", __name__, url_prefix="/auth")


@auth_bp.get("/health")
def auth_health():
    return jsonify({"service": "auth", "status": "ok"}), 200
