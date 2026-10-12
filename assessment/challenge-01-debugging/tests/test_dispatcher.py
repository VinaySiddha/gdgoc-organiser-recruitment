import asyncio
import importlib.util
from pathlib import Path


MODULE_PATH = Path(__file__).resolve().parents[1] / "src" / "dispatcher.py"
SPEC = importlib.util.spec_from_file_location("dispatcher_module", MODULE_PATH)
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)
EventDispatcher = MODULE.EventDispatcher


def test_parallel_registrations_are_isolated():
    dispatcher = EventDispatcher({"targetUrl": "https://example.com", "maxRetries": 3, "timeoutMs": 100})
    payloads = [
        {"id": f"r-{i}", "name": f"Student {i}", "email": f"student{i}@svec.edu", "eventId": "devfest-2026", "registeredAt": "2026-10-12T09:00:00+05:30"}
        for i in range(25)
    ]

    async def run_test():
        await asyncio.gather(*(dispatcher.process_registration(payload) for payload in payloads))

    asyncio.run(run_test())

    assert len(dispatcher.get_store()) == 25
    assert {record["id"] for record in dispatcher.get_store().values()} == {p["id"] for p in payloads}


def test_invalid_timestamp_is_rejected():
    dispatcher = EventDispatcher({"targetUrl": "https://example.com", "maxRetries": 2, "timeoutMs": 100})
    payload = {"id": "bad", "name": "Bad", "email": "bad@svec.edu", "eventId": "devfest-2026", "registeredAt": "not-a-date"}

    async def run_test():
        return await dispatcher.process_registration(payload)

    assert asyncio.run(run_test()) is False
    assert dispatcher.get_store() == {}


def test_retry_succeeds_after_transient_failures(monkeypatch):
    dispatcher = EventDispatcher({"targetUrl": "https://example.com", "maxRetries": 4, "timeoutMs": 50})
    calls = {"count": 0}

    async def fake_send(url, data):
        calls["count"] += 1
        if calls["count"] < 3:
            raise ConnectionError("503 Service Unavailable")

    monkeypatch.setattr(dispatcher, "_mock_network_send", fake_send)

    payload = {"id": "retry-1", "name": "Retry User", "email": "retry@svec.edu", "eventId": "devfest-2026", "registeredAt": "2026-10-12T09:00:00+05:30"}

    async def run_test():
        return await dispatcher.process_registration(payload)

    assert asyncio.run(run_test()) is True
    assert calls["count"] == 3
    assert dispatcher.get_logs()[-1]["status"] == "DELIVERED"
