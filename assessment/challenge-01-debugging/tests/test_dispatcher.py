import asyncio
import pytest
import sys
import os

# Add src directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'src')))

from dispatcher import EventDispatcher

@pytest.mark.asyncio
async def test_valid_registration():
    dispatcher = EventDispatcher(target_url="https://api.gdgsvec.org/webhooks/rsvp", max_retries=3)
    payload = {
        "id": "reg-001",
        "name": "Arjun Sharma",
        "email": "arjun.sharma@svec.edu.in",
        "eventId": "devfest-2026",
        "registeredAt": "2026-09-07T10:30:00Z"
    }
    result = await dispatcher.process_registration(payload)
    assert result["success"] is True
    assert result["registration_id"] == "reg-001"
    
    store = dispatcher.get_store()
    assert "reg-001" in store
    assert store["reg-001"]["name"] == "Arjun Sharma"
    assert store["reg-001"]["email"] == "arjun.sharma@svec.edu.in"

@pytest.mark.asyncio
async def test_invalid_payload_and_malformed_data():
    dispatcher = EventDispatcher(target_url="https://api.gdgsvec.org/webhooks/rsvp")
    
    # Missing email
    bad1 = {"id": "1", "name": "Test", "eventId": "e1", "registeredAt": "2026-09-07T10:30:00Z"}
    res1 = await dispatcher.process_registration(bad1)
    assert res1["success"] is False
    
    # Invalid email format
    bad2 = {"id": "2", "name": "Test", "email": "notanemail", "eventId": "e1", "registeredAt": "2026-09-07T10:30:00Z"}
    res2 = await dispatcher.process_registration(bad2)
    assert res2["success"] is False

    # Invalid timestamp
    bad3 = {"id": "3", "name": "Test", "email": "test@svec.edu.in", "eventId": "e1", "registeredAt": "invalid-time"}
    res3 = await dispatcher.process_registration(bad3)
    assert res3["success"] is False

@pytest.mark.asyncio
async def test_timestamp_offsets():
    dispatcher = EventDispatcher(target_url="https://api.gdgsvec.org/webhooks/rsvp")
    
    # UTC
    res_utc = await dispatcher.process_registration({
        "id": "t-utc",
        "name": "UTC User",
        "email": "utc@svec.edu.in",
        "eventId": "e1",
        "registeredAt": "2026-09-07T10:30:00Z"
    })
    assert res_utc["success"] is True

    # Indian Standard Time (+05:30)
    res_ist = await dispatcher.process_registration({
        "id": "t-ist",
        "name": "IST User",
        "email": "ist@svec.edu.in",
        "eventId": "e1",
        "registeredAt": "2026-09-07T16:00:00+05:30"
    })
    assert res_ist["success"] is True

    # Negative offset (-04:00)
    res_neg = await dispatcher.process_registration({
        "id": "t-neg",
        "name": "EST User",
        "email": "est@svec.edu.in",
        "eventId": "e1",
        "registeredAt": "2026-09-07T10:30:00-04:00"
    })
    assert res_neg["success"] is True

@pytest.mark.asyncio
async def test_concurrency_isolation_50_requests():
    """
    Simulate 50 simultaneous registrations under heavy load.
    Verify complete absence of race conditions, cross-talk, or metadata corruption.
    """
    dispatcher = EventDispatcher(target_url="https://api.gdgsvec.org/webhooks/rsvp", max_retries=2, initial_backoff_sec=0.001)
    
    async def register_user(idx: int):
        # Simulate slight random jitter in arrivals
        await asyncio.sleep(0.001 * (idx % 5))
        payload = {
            "id": f"reg-concurrent-{idx:03d}",
            "name": f"Attendee {idx}",
            "email": f"attendee{idx}@svec.edu.in",
            "eventId": f"event-{idx % 3}",
            "registeredAt": "2026-09-07T10:30:00+05:30"
        }
        res = await dispatcher.process_registration(payload)
        return res, payload

    tasks = [register_user(i) for i in range(50)]
    results = await asyncio.gather(*tasks)

    store = dispatcher.get_store()
    assert len(store) == 50, f"Expected 50 persisted records, got {len(store)}"

    # Validate every user has correct isolated metadata
    for res, payload in results:
        assert res["success"] is True
        saved = store.get(payload["id"])
        assert saved is not None
        assert saved["name"] == payload["name"]
        assert saved["email"] == payload["email"]
        assert saved["eventId"] == payload["eventId"]

@pytest.mark.asyncio
async def test_webhook_retry_and_backoff_success():
    """Test webhook fails twice with 503 then succeeds on 3rd attempt."""
    call_count = 0

    async def mock_sender(url, data):
        nonlocal call_count
        call_count += 1
        if call_count < 3:
            raise ConnectionError("503 Service Unavailable")
        # Success on 3rd attempt

    dispatcher = EventDispatcher(
        target_url="https://webhook.svec.edu.in",
        max_retries=3,
        initial_backoff_sec=0.001,
        custom_network_sender=mock_sender
    )

    payload = {
        "id": "retry-success-1",
        "name": "Retry Success User",
        "email": "retry@svec.edu.in",
        "eventId": "event-1",
        "registeredAt": "2026-09-07T12:00:00Z"
    }

    result = await dispatcher.process_registration(payload)
    assert result["success"] is True
    assert call_count == 3
    
    logs = dispatcher.get_logs()
    assert len(logs) == 1
    assert logs[0]["status"] == "DELIVERED"
    assert logs[0]["attempts"] == 3

@pytest.mark.asyncio
async def test_webhook_retry_exhaustion_and_failure_isolation():
    """Test webhook fails all retries and logs FAILED without corrupting registration store."""
    call_count = 0

    async def always_fail_sender(url, data):
        nonlocal call_count
        call_count += 1
        raise ConnectionError("500 Internal Server Error")

    dispatcher = EventDispatcher(
        target_url="https://webhook.svec.edu.in",
        max_retries=3,
        initial_backoff_sec=0.001,
        custom_network_sender=always_fail_sender
    )

    payload = {
        "id": "retry-fail-1",
        "name": "Failure Isolated User",
        "email": "fail@svec.edu.in",
        "eventId": "event-1",
        "registeredAt": "2026-09-07T12:00:00Z"
    }

    result = await dispatcher.process_registration(payload)
    assert result["success"] is True  # Registration succeeded despite downstream webhook failure
    assert call_count == 3

    # Registration record must still be safe in the store
    store = dispatcher.get_store()
    assert "retry-fail-1" in store
    assert store["retry-fail-1"]["name"] == "Failure Isolated User"

    # Webhook log records final FAILED state
    logs = dispatcher.get_logs()
    assert len(logs) == 1
    assert logs[0]["status"] == "FAILED"
    assert logs[0]["attempts"] == 3
