"""The client's tempId must come back, so it can match its optimistic bubble.

Without the echo the web client fell back to comparing message content, which
collides on the short repeated messages chat is full of — "ok", "tak", "?" —
leaving a duplicate on screen or dropping one.
"""
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api.v1.endpoints import messages as messages_endpoint
from app.core.dependencies import TokenUser, get_current_user, require_verified
from app.services import chat_service

from .conftest import run


@pytest.fixture
def rest_client():
    app = FastAPI()
    app.include_router(messages_endpoint.router, prefix="/messages")
    caller = TokenUser(id="alice", email="alice@example.com")
    app.dependency_overrides[require_verified] = lambda: caller
    app.dependency_overrides[get_current_user] = lambda: caller
    return TestClient(app)


def send(chat, content="hello", temp_id=None):
    return run(
        chat_service.create_message_in_chat(
            chat_id=chat.id, sender_id="alice", content=content, temp_id=temp_id
        )
    )


def test_the_broadcast_echoes_the_temp_id(chat, emitted):
    send(chat, temp_id="temp-1")

    assert emitted[0]["payload"]["message"]["tempId"] == "temp-1"


def test_two_identical_messages_are_distinguishable(chat, emitted):
    """Content alone cannot tell these apart, which was the bug."""
    send(chat, content="ok", temp_id="temp-1")
    send(chat, content="ok", temp_id="temp-2")

    broadcast = [call["payload"]["message"] for call in emitted]

    assert [m["tempId"] for m in broadcast] == ["temp-1", "temp-2"]
    assert broadcast[0]["_id"] != broadcast[1]["_id"]


def test_no_temp_id_key_when_the_client_sends_none(chat, emitted):
    """Older clients must not start receiving a null field."""
    send(chat)

    assert "tempId" not in emitted[0]["payload"]["message"]


def test_rest_create_echoes_the_temp_id(rest_client, chat, emitted):
    response = rest_client.post(
        "/messages/", json={"content": "hello", "roomId": chat.id, "tempId": "temp-9"}
    )

    assert response.json()["tempId"] == "temp-9"
    assert emitted[0]["payload"]["message"]["tempId"] == "temp-9"


def test_rest_create_without_a_temp_id_still_works(rest_client, chat):
    response = rest_client.post("/messages/", json={"content": "hello", "roomId": chat.id})

    assert response.status_code == 201
    assert response.json()["tempId"] is None
