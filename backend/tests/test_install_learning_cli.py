"""Check the documented installer entry point without accessing a database."""

import os
import subprocess
import sys
from pathlib import Path


def test_installer_help_without_pythonpath(tmp_path: Path) -> None:
    """Resolve backend imports even outside the repository working directory."""
    script = Path(__file__).resolve().parents[2] / "scripts" / "install_learning.py"
    environment = os.environ.copy()
    environment.pop("PYTHONPATH", None)
    result = subprocess.run(
        [sys.executable, str(script), "--help"],
        cwd=tmp_path,
        env=environment,
        capture_output=True,
        text=True,
        check=False,
    )
    assert result.returncode == 0, result.stderr
    assert "--test" in result.stdout
