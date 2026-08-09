"""Delivery must not depend on which transport sent the message.

The REST handler used to persist a message and return without emitting, so a
message sent while the sender's socket was down reached the recipient only on
their next refetch — and the sender saw it succeed either way.
"""
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api.v1.endpoints import messages as messages_endpoint
from app.core.dependencies import TokenUser, get_current_user, require_verified
from app.services import chat_service

from .conftest import FakeMessage, run


@pytest.fixture
def rest_client():
    """The messages router alone, so no startup hook tries to reach MongoDB."""
    app = FastAPI()
    app.include_router(messages_endpoint.router, prefix="/messages")
    caller = TokenUser(id="alice", email="alice@example.com")
    app.dependency_overrides[require_verified] = lambda: caller
    app.dependency_overrides[get_current_user] = lambda: caller
    return TestClient(app)


def test_rest_create_broadcasts_to_participants(rest_client, chat, emitted):
    response = rest_client.post(
        "/messages/", json={"content": "sent over REST", "roomId": chat.id}
    )

    assert response.status_code == 201
    assert [call["event"] for call in emitted] == ["new_message"]

    call = emitted[0]
    assert call["participants"] == ["alice", "bob"]
    assert call["payload"]["chatId"] == chat.id
    assert call["payload"]["message"]["content"] == "sent over REST"
    assert call["payload"]["message"]["sender"] == "alice"


def test_rest_delete_broadcasts_to_participants(rest_client, chat, seed_messages, emitted):
    message = seed_messages(1, sender="alice")[0]

    response = rest_client.delete(f"/messages/{message.id}")

    assert response.status_code == 200
    assert [call["event"] for call in emitted] == ["message_deleted"]
    assert emitted[0]["payload"] == {"chatId": chat.id, "messageId": message.id}
    assert emitted[0]["participants"] == ["alice", "bob"]


def test_service_broadcasts_exactly_once_per_message(chat, emitted):
    """The socket handler must not re-emit what the service already sent."""
    run(
        chat_service.create_message_in_chat(
            chat_id=chat.id, sender_id="alice", content="hello"
        )
    )

    assert len(emitted) == 1


def test_new_messages_do_not_grow_the_legacy_chat_id_array(chat, emitted):
    chat.messages = ["legacy-message-id"]

    run(
        chat_service.create_message_in_chat(
            chat_id=chat.id, sender_id="alice", content="hello"
        )
    )

    assert chat.messages == ["legacy-message-id"]


def test_rejected_message_is_not_broadcast(chat, emitted, blocked_pairs):
    blocked_pairs.add(("alice", "bob"))

    with pytest.raises(ValueError, match="BLOCKED"):
        run(
            chat_service.create_message_in_chat(
                chat_id=chat.id, sender_id="alice", content="hello"
            )
        )

    assert emitted == []


def test_delete_by_non_sender_is_not_broadcast(chat, seed_messages, emitted):
    message = seed_messages(1, sender="alice")[0]

    with pytest.raises(ValueError, match="NOT_SENDER"):
        run(chat_service.soft_delete_message(message.id, "bob"))

    assert emitted == []


def test_broadcast_payload_matches_the_stored_message(chat, emitted):
    message, _ = run(
        chat_service.create_message_in_chat(
            chat_id=chat.id, sender_id="alice", content="hello", reply_to=None
        )
    )

    sent = emitted[0]["payload"]["message"]
    assert sent["_id"] == str(message.id)
    assert sent["roomId"] == chat.id
    assert sent["isDeleted"] is False
    assert FakeMessage.store[message.id].content == "hello"
