from __future__ import annotations

from flask import Flask, jsonify, request

from src.services.rsvp import RSVPService
from src.store import WorkshopStore

app = Flask(__name__)
store = WorkshopStore()
service = RSVPService(store)


@app.get("/health")
def health() -> tuple:
    return jsonify({"status": "ok"}), 200


@app.post("/workshops/<workshop_id>/register")
def register(workshop_id: str):
    data = request.get_json(silent=True) or {}
    attendee_name = (data.get("attendeeName") or data.get("name") or "").strip()
    email = (data.get("email") or "").strip()
    result = service.register_attendee(workshop_id, attendee_name, email)
    return jsonify(result), 200


@app.post("/workshops/<workshop_id>/cancel")
def cancel(workshop_id: str):
    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip()
    result = service.cancel_attendee(workshop_id, email)
    return jsonify(result), 200


@app.get("/workshops/<workshop_id>/status")
def status(workshop_id: str):
    result = service.workshop_status(workshop_id)
    return jsonify(result), 200


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
