"""Wayplot — AI travel planning for individuals and groups.

Run:  python3 app.py            (http://127.0.0.1:8000)
Env:  PORT, WAYPLOT_DEMO=1|0, WAYPLOT_AI_ENGINE=auto|local|claude, ANTHROPIC_API_KEY,
      WAYPLOT_CLAUDE_MODEL, GOOGLE_MAPS_API_KEY, WAYPLOT_DATA_DIR, DATABASE_URL, WAYPLOT_RESET=1
"""
import logging
import os
import shutil

from flask import Flask, abort, send_from_directory

from server import ai, db
from server.api import bp
from server.seed import seed_if_empty

BASE = os.path.dirname(os.path.abspath(__file__))
STATIC = os.path.join(BASE, "static")


def create_app():
    if os.environ.get("WAYPLOT_RESET") == "1":
        if db.IS_PG:
            db.reset_db()
        elif os.path.isdir(db.DATA_DIR):
            shutil.rmtree(db.DATA_DIR)
    db.init_db()
    if os.environ.get("WAYPLOT_DEMO", "1") == "1":
        seed_if_empty()  # demo accounts share a published password: never seed them in production
    app = Flask(__name__, static_folder=None)
    if os.environ.get("RENDER") or os.environ.get("WAYPLOT_PROXY") == "1":
        # Behind Render's proxy: take the client IP from X-Forwarded-For so per-IP limits are per visitor.
        from werkzeug.middleware.proxy_fix import ProxyFix
        app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1)
    app.config["SEND_FILE_MAX_AGE_DEFAULT"] = 0
    app.config["MAX_CONTENT_LENGTH"] = 2 * 1024 * 1024
    app.register_blueprint(bp)

    @app.after_request
    def headers(resp):
        resp.headers.setdefault("X-Content-Type-Options", "nosniff")
        resp.headers.setdefault("Referrer-Policy", "same-origin")
        resp.headers.setdefault("X-Frame-Options", "DENY")
        return resp

    @app.get("/static/<path:path>")
    def static_files(path):
        return send_from_directory(STATIC, path)

    @app.get("/", defaults={"path": ""})
    @app.get("/<path:path>")
    def spa(path):
        if path.startswith("api/"):
            abort(404)
        return send_from_directory(STATIC, "index.html")

    return app


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
    port = int(os.environ.get("PORT", "8000"))
    app = create_app()
    print(f"\n  WAYPLOT  ->  http://127.0.0.1:{port}   (AI engine: {ai.engine_name()})\n")
    app.run(host=os.environ.get("HOST", "127.0.0.1"), port=port, threaded=True, debug=False)
