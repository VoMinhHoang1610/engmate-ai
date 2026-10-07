"""Cross-platform development tasks without shell-specific command strings."""

import argparse
import os
import shutil
import subprocess
import sys
from io import TextIOWrapper
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
VENV = ROOT / ".venv"
PYTHON = VENV / ("Scripts/python.exe" if os.name == "nt" else "bin/python")
NPM = "npm.cmd" if os.name == "nt" else "npm"


def run(command: list[str], cwd: Path = ROOT) -> None:
    """Stream task output and stop immediately on failure."""
    print("+ " + " ".join(command), flush=True)
    result = subprocess.run(command, cwd=cwd, check=False)
    if result.returncode:
        raise SystemExit(result.returncode)


def backend(module: str, *arguments: str) -> None:
    """Invoke a Python tool in the project virtual environment."""
    run([str(PYTHON), "-m", module, *arguments], ROOT / "backend")


def frontend(*arguments: str) -> None:
    """Use the npm executable appropriate to this operating system."""
    run([NPM, *arguments], ROOT / "frontend")


def ensure_env() -> None:
    """Create Compose defaults without overwriting local values."""
    if not (ROOT / ".env").exists():
        shutil.copyfile(ROOT / ".env.example", ROOT / ".env")


def task(name: str, port: int | None = None) -> None:
    """Dispatch a development task shared by local development and CI."""
    if name == "venv":
        if not PYTHON.exists():
            run([sys.executable, "-m", "venv", str(VENV)])
        return
    if name == "env":
        ensure_env()
        return
    if name == "setup":
        task("venv")
        task("setup-backend")
        task("setup-frontend")
        ensure_env()
        return
    if name == "setup-backend":
        task("venv")
        run([str(PYTHON), "-m", "pip", "install", "-r", "backend/requirements-dev.txt"])
        run(
            [
                str(PYTHON),
                "-m",
                "pip",
                "install",
                "--no-deps",
                "--no-build-isolation",
                "-e",
                "backend",
            ]
        )
        return
    if name == "setup-frontend":
        frontend("ci")
        return
    if name in ("lint", "test", "coverage", "format", "lock"):
        task(f"{name}-backend")
        task(f"{name}-frontend")
        return
    if name == "lint-backend":
        backend("ruff", "check", ".", "../scripts")
        backend("black", "--check", "--workers", "1", ".", "../scripts")
        backend("mypy", "app", "tests", "../scripts")
    elif name == "lint-frontend":
        frontend("run", "lint")
        frontend("run", "format:check")
    elif name == "format-backend":
        backend("black", "--workers", "1", ".", "../scripts")
        backend("ruff", "check", "--fix", ".", "../scripts")
    elif name == "format-frontend":
        frontend("run", "format")
    elif name == "test-backend":
        backend("pytest")
    elif name == "migrate-backend":
        backend("app.db.migrate")
    elif name == "test-frontend":
        frontend("run", "test")
    elif name == "coverage-backend":
        backend(
            "pytest",
            "--cov",
            "--cov-report=term-missing",
            "--cov-report=xml",
            "--cov-report=html",
        )
    elif name == "coverage-frontend":
        frontend("run", "test:coverage")
    elif name == "build":
        frontend("run", "build")
    elif name == "dev-backend":
        backend(
            "uvicorn",
            "app.main:app",
            "--reload",
            "--host",
            "127.0.0.1",
            "--port",
            str(port or 8010),
        )
    elif name == "dev-frontend":
        frontend("run", "dev", "--", "--host", "127.0.0.1", "--port", str(port or 5174))
    elif name == "lock-backend":
        for extra, output in (
            ([], "requirements.txt"),
            (["--extra", "dev"], "requirements-dev.txt"),
        ):
            run(
                [
                    str(PYTHON),
                    "-m",
                    "piptools",
                    "compile",
                    *extra,
                    "--strip-extras",
                    "--no-emit-index-url",
                    "--output-file",
                    f"backend/{output}",
                    "backend/pyproject.toml",
                ]
            )
    elif name == "lock-frontend":
        frontend("install", "--package-lock-only")
    elif name in ("dev", "docker-up", "docker-check", "down"):
        ensure_env()
        arguments = {
            "dev": ["up", "--build"],
            "docker-up": ["up", "--build", "--wait", "--wait-timeout", "180"],
            "docker-check": ["config", "--quiet"],
            "down": ["down"],
        }
        run(["docker", "compose", "-p", "engmate-ai", *arguments[name]])
    elif name == "smoke":
        run([str(PYTHON), "scripts/smoke.py"])
    elif name in ("hooks", "pre-commit"):
        hook_arguments = ["install"] if name == "hooks" else ["run", "--all-files"]
        run([str(PYTHON), "-m", "pre_commit", *hook_arguments])
    else:
        raise SystemExit(f"Unknown task: {name}")


def main() -> None:
    """Set Unicode-safe environment variables and run the requested task."""
    for stream in (sys.stdout, sys.stderr):
        if isinstance(stream, TextIOWrapper):
            stream.reconfigure(encoding="utf-8")
    os.environ["PYTHONUTF8"] = "1"
    os.environ["PYTHONIOENCODING"] = "utf-8"
    os.environ["PATH"] = str(PYTHON.parent) + os.pathsep + os.environ.get("PATH", "")
    for variable, directory in (
        ("PIP_CACHE_DIR", "pip"),
        ("PIP_TOOLS_CACHE_DIR", "pip-tools"),
        ("npm_config_cache", "npm"),
        ("PRE_COMMIT_HOME", "pre-commit"),
    ):
        os.environ[variable] = str(ROOT / ".cache" / directory)
    parser = argparse.ArgumentParser(description="EngMate-AI development tasks")
    parser.add_argument("task")
    parser.add_argument("--port", type=int)
    options = parser.parse_args()
    if options.port is not None and not 1 <= options.port <= 65535:
        parser.error("--port must be between 1 and 65535")
    task(options.task, options.port)


if __name__ == "__main__":
    main()
