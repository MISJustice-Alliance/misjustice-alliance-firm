#!/usr/bin/env python3
"""Prometheus exporter for Honcho queue depth."""

from __future__ import annotations

import json
import os
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

BASE_URL = os.environ.get("HONCHO_BASE_URL", "http://127.0.0.1:8000").rstrip("/")
WORKSPACE_ID = os.environ["HONCHO_WORKSPACE_ID"]
API_KEY = os.environ["HONCHO_API_KEY"]
PORT = int(os.environ.get("EXPORTER_PORT", "9103"))
POLL_INTERVAL = float(os.environ.get("POLL_INTERVAL_SECONDS", "15"))

state = {
    "up": 0,
    "pending": 0,
    "completed": 0,
    "last_success": 0.0,
    "last_error": "",
}
lock = threading.Lock()


def fetch_queue_status() -> None:
    url = f"{BASE_URL}/v3/workspaces/{WORKSPACE_ID}/queue/status"
    req = Request(url, headers={"Authorization": f"Bearer {API_KEY}"})
    try:
        with urlopen(req, timeout=10) as resp:
            payload = json.loads(resp.read().decode("utf-8"))
    except (HTTPError, URLError, TimeoutError, json.JSONDecodeError) as exc:
        with lock:
            state["up"] = 0
            state["last_error"] = str(exc)
        return

    pending = int(payload.get("pending_work_units", 0))
    completed = int(payload.get("completed_work_units", 0))
    with lock:
        state["up"] = 1
        state["pending"] = pending
        state["completed"] = completed
        state["last_success"] = time.time()
        state["last_error"] = ""


def loop() -> None:
    while True:
        fetch_queue_status()
        time.sleep(POLL_INTERVAL)


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path != "/metrics":
            self.send_response(404)
            self.end_headers()
            return

        with lock:
            body = "\n".join(
                [
                    "# HELP honcho_queue_up Whether the Honcho queue endpoint is reachable.",
                    "# TYPE honcho_queue_up gauge",
                    f"honcho_queue_up {state['up']}",
                    "# HELP honcho_queue_pending_work_units Current pending work units in Honcho.",
                    "# TYPE honcho_queue_pending_work_units gauge",
                    f"honcho_queue_pending_work_units {state['pending']}",
                    "# HELP honcho_queue_completed_work_units Current completed work units in Honcho.",
                    "# TYPE honcho_queue_completed_work_units gauge",
                    f"honcho_queue_completed_work_units {state['completed']}",
                    "# HELP honcho_queue_last_success_unixtime Last successful queue poll timestamp.",
                    "# TYPE honcho_queue_last_success_unixtime gauge",
                    f"honcho_queue_last_success_unixtime {state['last_success']:.0f}",
                ]
            ) + "\n"

        self.send_response(200)
        self.send_header("Content-Type", "text/plain; version=0.0.4")
        self.send_header("Content-Length", str(len(body.encode("utf-8"))))
        self.end_headers()
        self.wfile.write(body.encode("utf-8"))

    def log_message(self, format, *args):  # noqa: D401, ANN001
        return


def main() -> None:
    thread = threading.Thread(target=loop, daemon=True)
    thread.start()
    server = ThreadingHTTPServer(("0.0.0.0", PORT), Handler)
    server.serve_forever()


if __name__ == "__main__":
    main()
