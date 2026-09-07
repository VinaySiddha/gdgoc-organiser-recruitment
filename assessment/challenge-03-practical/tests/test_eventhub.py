import pytest
import sys
import os
import threading

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'src')))

from controllers.api_handler import EventHubAPIController

@pytest.fixture
def controller():
    return EventHubAPIController(db_path=":memory:")

def test_valid_registration_and_ticket_creation(controller):
    payload = {
        "fullName": "Arjun Sharma",
        "email": "arjun.sharma@svec.edu.in",
        "rollNumber": "23A81A4397",
        "department": "CSE",
        "year": "2nd Year",
        "phone": "9876543210"
    }
    res = controller.handle_post_registration(payload)
    assert res["success"] is True
    assert "ticketId" in res
    assert res["ticketId"].startswith("TICK-GDG-")
    assert res["qrPayload"] == f"GDG-PASS:{res['ticketId']}"

def test_registration_validation_errors(controller):
    # Missing name
    res1 = controller.handle_post_registration({
        "fullName": "",
        "email": "test@svec.edu.in",
        "rollNumber": "23A81A4301",
        "department": "CSE",
        "year": "2nd Year"
    })
    assert res1["success"] is False

    # Invalid email
    res2 = controller.handle_post_registration({
        "fullName": "Test User",
        "email": "not-an-email",
        "rollNumber": "23A81A4302",
        "department": "CSE",
        "year": "2nd Year"
    })
    assert res2["success"] is False

def test_duplicate_registration_prevention(controller):
    payload = {
        "fullName": "Candidate One",
        "email": "candidate1@svec.edu.in",
        "rollNumber": "23A81A4399",
        "department": "ADS",
        "year": "3rd Year"
    }
    res1 = controller.handle_post_registration(payload)
    assert res1["success"] is True

    # Same email duplicate attempt
    res2 = controller.handle_post_registration({
        "fullName": "Candidate Two",
        "email": "candidate1@svec.edu.in",
        "rollNumber": "23A81A4388",
        "department": "IT",
        "year": "3rd Year"
    })
    assert res2["success"] is False
    assert "duplicate" in res2["error"].lower()

    # Same roll number duplicate attempt
    res3 = controller.handle_post_registration({
        "fullName": "Candidate Three",
        "email": "candidate3@svec.edu.in",
        "rollNumber": "23A81A4399",
        "department": "ECE",
        "year": "2nd Year"
    })
    assert res3["success"] is False
    assert "duplicate" in res3["error"].lower()

def test_ticket_retrieval(controller):
    reg = controller.handle_post_registration({
        "fullName": "Bhavya Sri",
        "email": "bhavya@svec.edu.in",
        "rollNumber": "23A81A4350",
        "department": "IT",
        "year": "2nd Year"
    })
    ticket_id = reg["ticketId"]

    # Retrieve ticket
    res = controller.handle_get_ticket(ticket_id)
    assert res["success"] is True
    assert res["ticket"]["ticket_id"] == ticket_id
    assert res["ticket"]["full_name"] == "Bhavya Sri"
    assert res["ticket"]["status"] == "ISSUED"

    # Non-existent ticket
    res_bad = controller.handle_get_ticket("TICK-GDG-FAKE")
    assert res_bad["success"] is False

def test_check_in_flow_and_duplicate_prevention(controller):
    reg = controller.handle_post_registration({
        "fullName": "Rohit Varma",
        "email": "rohit@svec.edu.in",
        "rollNumber": "23A81A4360",
        "department": "ECE",
        "year": "3rd Year"
    })
    ticket_id = reg["ticketId"]
    qr_payload = reg["qrPayload"]

    # 1. First check-in with QR Payload
    chk1 = controller.handle_post_checkin({"qrPayload": qr_payload, "scannedBy": "DESK_A"})
    assert chk1["success"] is True
    assert chk1["status"] == "VALID_TICKET"
    assert chk1["attendee"]["fullName"] == "Rohit Varma"

    # 2. Second check-in attempt with Ticket ID (Duplicate scan)
    chk2 = controller.handle_post_checkin({"ticketId": ticket_id, "scannedBy": "DESK_B"})
    assert chk2["success"] is False
    assert chk2["status"] == "ALREADY_CHECKED_IN"

    # 3. Invalid ticket check-in
    chk3 = controller.handle_post_checkin({"ticketId": "TICK-GDG-NOTFOUND"})
    assert chk3["success"] is False
    assert chk3["status"] == "INVALID_TICKET"

def test_concurrent_duplicate_check_in(controller):
    reg = controller.handle_post_registration({
        "fullName": "Concurrent Attendee",
        "email": "concurrent@svec.edu.in",
        "rollNumber": "23A81A4370",
        "department": "CSE",
        "year": "2nd Year"
    })
    ticket_id = reg["ticketId"]

    results = []
    def do_checkin(worker_id):
        res = controller.handle_post_checkin({"ticketId": ticket_id, "scannedBy": f"WORKER_{worker_id}"})
        results.append(res)

    threads = [threading.Thread(target=do_checkin, args=(i,)) for i in range(10)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()

    # Exactly 1 success, 9 already checked in
    success_count = sum(1 for r in results if r["status"] == "VALID_TICKET")
    already_count = sum(1 for r in results if r["status"] == "ALREADY_CHECKED_IN")
    assert success_count == 1, f"Expected 1 valid check-in, got {success_count}"
    assert already_count == 9, f"Expected 9 duplicate rejections, got {already_count}"

def test_dashboard_metrics_and_csv_export(controller):
    # Register 3 attendees from different departments
    r1 = controller.handle_post_registration({"fullName": "U1", "email": "u1@svec.edu.in", "rollNumber": "23A81A4311", "department": "CSE", "year": "1st Year"})
    r2 = controller.handle_post_registration({"fullName": "U2", "email": "u2@svec.edu.in", "rollNumber": "23A81A4312", "department": "CSE", "year": "2nd Year"})
    r3 = controller.handle_post_registration({"fullName": "U3", "email": "u3@svec.edu.in", "rollNumber": "23A81A4313", "department": "IT", "year": "3rd Year"})

    # Check in 1 attendee
    controller.handle_post_checkin({"ticketId": r1["ticketId"]})

    dashboard = controller.handle_get_dashboard()
    assert dashboard["success"] is True
    data = dashboard["data"]
    assert data["totalRegistrations"] == 3
    assert data["totalCheckIns"] == 1
    assert data["attendancePercentage"] == 33.33
    assert data["departmentBreakdown"]["CSE"]["registered"] == 2
    assert data["departmentBreakdown"]["CSE"]["checkedIn"] == 1
    assert data["departmentBreakdown"]["IT"]["registered"] == 1
    assert data["departmentBreakdown"]["IT"]["checkedIn"] == 0

    # CSV Export
    csv_text = controller.handle_get_export_csv()
    assert "Full Name" in csv_text
    assert "U1" in csv_text
    assert "U2" in csv_text
    assert "U3" in csv_text
