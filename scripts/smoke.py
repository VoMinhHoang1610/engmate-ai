"""Verify backend, frontend and Vite proxy over real HTTP."""

import json
import os
from urllib.request import Request, urlopen


def main() -> None:
    """Fail immediately when any part of the starter stack is unavailable."""
    backend = os.getenv("SMOKE_BACKEND_URL", "http://127.0.0.1:8010")
    frontend = os.getenv("SMOKE_FRONTEND_URL", "http://127.0.0.1:5174")
    for base in (backend, frontend):
        with urlopen(f"{base}/api/health", timeout=10) as response:
            if response.status != 200 or json.load(response) != {
                "status": "ok",
                "service": "engmate-ai",
            }:
                raise SystemExit("Health/proxy contract failed.")
    with urlopen(frontend, timeout=10) as response:
        if response.status != 200 or "EngMate-AI" not in response.read().decode():
            raise SystemExit("Frontend HTML contract failed.")
    request = Request(
        f"{frontend}/api/ai/reply",
        data=json.dumps({"message": "Hello", "level": "B1"}).encode(),
        headers={"Content-Type": "application/json"},
    )
    with urlopen(request, timeout=10) as response:
        data = json.load(response)
        if (
            response.status != 200
            or data.get("provider") != "mock"
            or data.get("level") != "B1"
        ):
            raise SystemExit("Mock AI/proxy contract failed.")
    print("PASS: backend health, frontend HTML, API proxy and mock AI reply.")


if __name__ == "__main__":
    main()
