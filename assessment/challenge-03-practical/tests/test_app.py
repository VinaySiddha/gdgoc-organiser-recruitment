import importlib.util
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT))

MODULE_PATH = PROJECT_ROOT / "src" / "app.py"
SPEC = importlib.util.spec_from_file_location("app_module", MODULE_PATH)
MODULE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MODULE)
app = MODULE.app


def test_health_endpoint():
    client = app.test_client()
    response = client.get('/health')
    assert response.status_code == 200
    assert response.get_json()["status"] == "ok"


def test_registration_and_waitlist_flow():
    client = app.test_client()
    payload = {"attendeeName": "Aisha", "email": "aisha@svec.edu"}

    response = client.post('/workshops/devfest/register', json=payload)
    assert response.status_code == 200
    assert response.get_json()["status"] in {"registered", "waitlisted"}

    response = client.get('/workshops/devfest/status')
    assert response.status_code == 200
    data = response.get_json()
    assert "registered" in data
    assert "waitlist" in data
