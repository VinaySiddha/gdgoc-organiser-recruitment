"""
test_app.py — Integration and Unit Tests for Challenge 03 Track A (Event Check-In Hub)
"""

import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

# Add src to python path
src_dir = Path(__file__).parent.parent / "src"
sys.path.insert(0, str(src_dir))
sys.path.insert(0, str(src_dir / "backend"))

from app import app, init_db, DB_PATH

@pytest.fixture(autouse=True)
def setup_test_db(tmp_path, monkeypatch):
    """Isolate SQLite DB for each test."""
    test_db = tmp_path / "test_checkin.db"
    monkeypatch.setattr("app.DB_PATH", test_db)
    init_db()


@pytest.fixture
def client():
    return TestClient(app)


def test_register_attendee_success(client):
    payload = {
        "name": "Alex Tech",
        "email": "alex@svec.edu",
        "department": "CSE",
        "year": "3rd Year",
    }
    response = client.post("/api/register", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert "ticket_id" in data
    assert data["ticket_id"].startswith("GDG-")
    assert data["name"] == "Alex Tech"
    assert data["qr_url"] == f"/api/qr/{data['ticket_id']}"


def test_register_duplicate_email_fails(client):
    payload = {
        "name": "Alex Tech",
        "email": "alex@svec.edu",
        "department": "CSE",
    }
    r1 = client.post("/api/register", json=payload)
    assert r1.status_code == 200

    r2 = client.post("/api/register", json=payload)
    assert r2.status_code == 409
    assert "already registered" in r2.json()["detail"]


def test_qr_code_generation(client):
    reg = client.post("/api/register", json={
        "name": "Sam Data",
        "email": "sam@svec.edu",
    }).json()

    ticket_id = reg["ticket_id"]
    qr_res = client.get(f"/api/qr/{ticket_id}")
    assert qr_res.status_code == 200
    assert qr_res.headers["content-type"] == "image/png"


def test_check_in_flow(client):
    reg = client.post("/api/register", json={
        "name": "Jordan Dev",
        "email": "jordan@svec.edu",
    }).json()
    ticket_id = reg["ticket_id"]

    # First check-in succeeds
    checkin_res = client.post("/api/checkin", json={"ticket_id": ticket_id})
    assert checkin_res.status_code == 200
    res_data = checkin_res.json()
    assert res_data["success"] is True
    assert "Welcome, Jordan Dev" in res_data["message"]

    # Duplicate check-in fails gracefully
    dup_res = client.post("/api/checkin", json={"ticket_id": ticket_id})
    assert dup_res.status_code == 200
    dup_data = dup_res.json()
    assert dup_data["success"] is False
    assert "already checked in" in dup_data["message"]


def test_check_in_invalid_ticket(client):
    res = client.post("/api/checkin", json={"ticket_id": "INVALID-TICKET-999"})
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is False
    assert "Invalid ticket" in data["message"]


def test_badge_generation_after_checkin(client):
    reg = client.post("/api/register", json={
        "name": "Morgan Cloud",
        "email": "morgan@svec.edu",
        "department": "IT",
        "year": "4th Year",
    }).json()
    ticket_id = reg["ticket_id"]

    # Badge before check-in should fail with 403
    badge_before = client.get(f"/api/badge/{ticket_id}")
    assert badge_before.status_code == 403

    # Check in
    client.post("/api/checkin", json={"ticket_id": ticket_id})

    # Badge after check-in should return SVG
    badge_after = client.get(f"/api/badge/{ticket_id}?style=gradient-purple")
    assert badge_after.status_code == 200
    assert badge_after.headers["content-type"] == "image/svg+xml"
    assert "Morgan Cloud" in badge_after.text
    assert "IT" in badge_after.text


def test_dashboard_stats(client):
    # Register 2 attendees, check in 1
    r1 = client.post("/api/register", json={"name": "User 1", "email": "u1@svec.edu", "department": "CSE"}).json()
    r2 = client.post("/api/register", json={"name": "User 2", "email": "u2@svec.edu", "department": "ECE"}).json()

    client.post("/api/checkin", json={"ticket_id": r1["ticket_id"]})

    dash = client.get("/api/dashboard").json()
    assert dash["total_registered"] == 2
    assert dash["total_checked_in"] == 1
    assert dash["check_in_rate"] == 50.0
    assert dash["department_breakdown"]["CSE"] == 1
    assert dash["department_breakdown"]["ECE"] == 1
    assert len(dash["recent_checkins"]) == 1
    assert dash["recent_checkins"][0]["name"] == "User 1"
