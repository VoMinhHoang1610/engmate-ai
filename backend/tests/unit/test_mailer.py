"""SMTP delivery is fully simulated; tests never email real people."""

import smtplib
from unittest.mock import Mock

import pytest
from fastapi import HTTPException
from pydantic import SecretStr

from app.core.config import Settings
from app.services.auth import SMTPMailer


def test_smtp_tls_delivery(monkeypatch: pytest.MonkeyPatch) -> None:
    """Use STARTTLS, configured credentials and the reset link without a real server."""
    server = Mock()
    manager = Mock()
    manager.__enter__ = Mock(return_value=server)
    manager.__exit__ = Mock(return_value=False)
    monkeypatch.setattr("app.services.auth.smtplib.SMTP", Mock(return_value=manager))
    settings = Settings(
        smtp_host="mail.example.test",
        smtp_sender="test@example.test",
        smtp_username="test",
        smtp_password=SecretStr("test-only-password"),
    )
    SMTPMailer(settings).send_reset("learner@example.test", "test-only-reset-token")
    server.starttls.assert_called_once()
    server.login.assert_called_once_with("test", "test-only-password")
    message = server.send_message.call_args.args[0]
    assert "reset-token=test-only-reset-token" in message.get_content()


def test_smtp_unavailable(monkeypatch: pytest.MonkeyPatch) -> None:
    """Missing settings and transport errors become secret-free 503 responses."""
    with pytest.raises(HTTPException) as error:
        SMTPMailer(Settings()).send_reset("learner@example.test", "test-token")
    assert error.value.status_code == 503
    monkeypatch.setattr(
        "app.services.auth.smtplib.SMTP",
        Mock(side_effect=smtplib.SMTPException("private-error")),
    )
    with pytest.raises(HTTPException) as error:
        SMTPMailer(
            Settings(smtp_host="mail.example.test", smtp_sender="test@example.test")
        ).send_reset("learner@example.test", "test-token")
    assert error.value.status_code == 503
    assert "private-error" not in error.value.detail
