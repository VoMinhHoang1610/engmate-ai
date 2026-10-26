"""Check liveness, provider capabilities, HTML, proxy, chat and learning routes."""

import json
import os
from urllib.request import urlopen


def main() -> None:
    """Never spend provider credit or create real accounts during a smoke probe."""
    backend = os.getenv("SMOKE_BACKEND_URL", "http://127.0.0.1:8010")
    frontend = os.getenv("SMOKE_FRONTEND_URL", "http://127.0.0.1:5174")
    for base in (backend, frontend):
        with urlopen(f"{base}/api/health", timeout=10) as response:
            assert response.status == 200 and json.load(response) == {
                "status": "ok",
                "service": "engmate-ai",
            }
        with urlopen(f"{base}/api/capabilities", timeout=10) as response:
            capabilities = json.load(response)
            assert capabilities["provider"] in ("gemini", "openai", "blaze")
            assert capabilities["is_mock"] is False
            assert isinstance(capabilities["realtime"], bool)
            if capabilities["realtime"]:
                assert capabilities["provider"] in ("gemini", "openai")
                assert capabilities["streaming"] is True
    with urlopen(frontend, timeout=10) as response:
        assert response.status == 200 and "EngMate-AI" in response.read().decode()
    with urlopen(f"{backend}/openapi.json", timeout=10) as response:
        paths = json.load(response)["paths"]
        assert "/api/conversations/{identity}/messages" in paths
        assert "/api/conversations/{identity}/messages/stream" in paths
        assert "/api/conversations/{identity}/voice" in paths
        assert "/api/learning/catalog" in paths
        assert "/api/learning/plan" in paths
        assert "/api/learning/progress" in paths
        assert "/api/learning/lessons/{lesson_id}/start" in paths
        assert "/api/learning/lessons/{lesson_id}/check" in paths
        assert not any(
            p.startswith(
                ("/api/practice", "/api/lessons", "/api/vocabulary", "/api/flashcards")
            )
            for p in paths
        )
    print(
        "PASS: health, frontend, proxy, capabilities, chat and learning OpenAPI. "
        "This is not a paid provider/readiness test."
    )


if __name__ == "__main__":
    main()
