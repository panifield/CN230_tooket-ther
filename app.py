import atexit

from flask import Flask, jsonify

from config import Config
from models import close_db_pool, get_db_connection, init_db_pool
from routes.auth import auth_bp
from routes.booking import booking_bp


def create_app() -> Flask:
    app = Flask(__name__)
    app.config.from_object(Config)

    init_db_pool()
    app.register_blueprint(auth_bp)
    app.register_blueprint(booking_bp)

    @app.get("/")
    def root():
        return jsonify({"message": "Tooket-ther Flask API is running"}), 200

    @app.get("/health")
    def health_check():
        try:
            with get_db_connection() as conn:
                with conn.cursor() as cur:
                    cur.execute("SELECT 1;")
                    _ = cur.fetchone()
            db_status = "ok"
        except Exception:
            db_status = "error"

        return jsonify({"app": "ok", "database": db_status}), 200

    return app


app = create_app()
atexit.register(close_db_pool)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=Config.PORT, debug=Config.DEBUG)
