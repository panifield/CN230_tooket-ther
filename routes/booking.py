from flask import Blueprint, jsonify

booking_bp = Blueprint("booking", __name__, url_prefix="/booking")


@booking_bp.get("/health")
def booking_health():
    return jsonify({"service": "booking", "status": "ok"}), 200
