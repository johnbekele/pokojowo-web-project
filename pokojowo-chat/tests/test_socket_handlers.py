"""Socket.IO handlers are tested at their event boundary.

These tests deliberately call the handlers directly instead of starting a
server.  That keeps authentication, room authorization, event payloads and
service errors visible while the existing in-memory fixtures make the tests
independent of MongoDB and the main API.
"""
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest

from app.core import socket as socket_module

from .conftest import FakeChat, FakeMessage, run


@pytest.fixture
def socket_state(monkeypatch):
    """Capture Socket.IO calls and reset the process-global connection map."""
    emitted = []
    rooms = []

    async def emit(event, payload, **kwargs):
        emitted.append({"event": event, "payload": payload, "kwargs": kwargs})

    async def enter_room(sid, room):
        rooms.append(("enter", sid, room))

    async def leave_room(sid, room):
        rooms.append(("leave", sid, room))

    socket_module.connected_users.clear()
    monkeypatch.setattr(socket_module.sio, "emit", emit)
    monkeypatch.setattr(socket_module.sio, "enter_room", enter_room)
    monkeypatch.setattr(socket_module.sio, "leave_room", leave_room)
    monkeypatch.setattr(socket_module, "Chat", FakeChat)
    yield SimpleNamespace(emitted=emitted, rooms=rooms)
    socket_module.connected_users.clear()


def events(state, name):
    return [item for item in state.emitted if item["event"] == name]


def test_connect_without_a_token_is_anonymous(socket_state, monkeypatch):
    monkeypatch.setattr(socket_module, "decode_token", lambda token: None)

    assert run(socket_module.connect("sid-anon", {}, auth=None)) is True

    connection = events(socket_state, "connection")[0]["payload"]
    assert connection["authenticated"] is False
    assert "sid-anon" not in socket_module.connected_users


def test_connect_with_a_valid_token_registers_the_user(socket_state, monkeypatch):
    monkeypatch.setattr(
        socket_module,
        "decode_token",
        lambda token: {"type": "access", "user_id": "alice"},
    )
    monkeypatch.setattr(socket_module.user_client, "user_exists", AsyncMock(return_value=True))
    status = AsyncMock()
    monkeypatch.setattr(socket_module, "broadcast_user_status", status)

    assert run(socket_module.connect("sid-alice", {}, auth={"token": "valid"})) is True

    assert socket_module.connected_users == {"sid-alice": "alice"}
    assert events(socket_state, "connection")[0]["payload"] == {
        "status": "connected",
        "authenticated": True,
        "sid": "sid-alice",
        "userId": "alice",
    }
    status.assert_awaited_once_with("alice", True)


def test_connect_rejects_a_missing_user(socket_state, monkeypatch):
    monkeypatch.setattr(
        socket_module,
        "decode_token",
        lambda token: {"type": "access", "user_id": "deleted"},
    )
    monkeypatch.setattr(socket_module.user_client, "user_exists", AsyncMock(return_value=False))

    run(socket_module.connect("sid-deleted", {}, auth={"token": "valid"}))

    assert "sid-deleted" not in socket_module.connected_users
    assert events(socket_state, "connection")[0]["payload"]["error"] == "User not found"


def test_disconnect_marks_the_last_session_offline(socket_state, monkeypatch):
    socket_module.connected_users["sid-alice"] = "alice"
    status = AsyncMock()
    monkeypatch.setattr(socket_module, "broadcast_user_status", status)

    run(socket_module.disconnect("sid-alice"))

    assert socket_module.connected_users == {}
    status.assert_awaited_once_with("alice", False)


def test_join_chat_requires_authentication(socket_state, chat):
    run(socket_module.join_chat("sid-anon", {"chatId": chat.id}))

    assert events(socket_state, "error")[0]["payload"] == {"message": "Authentication required"}
    assert socket_state.rooms == []


def test_join_chat_allows_a_participant_and_denies_a_non_participant(socket_state, chat):
    socket_module.connected_users["sid-alice"] = "alice"
    run(socket_module.join_chat("sid-alice", {"chatId": chat.id}))

    assert socket_state.rooms == [("enter", "sid-alice", chat.id)]
    assert events(socket_state, "joined_chat")[0]["payload"] == {"chatId": chat.id}

    socket_module.connected_users["sid-carol"] = "carol"
    run(socket_module.join_chat("sid-carol", {"chatId": chat.id}))

    assert events(socket_state, "error")[-1]["payload"] == {
        "message": "You are not a participant in this chat"
    }


def test_leave_chat_removes_the_socket_from_the_room(socket_state, chat):
    run(socket_module.leave_chat("sid-alice", {"chatId": chat.id}))

    assert socket_state.rooms == [("leave", "sid-alice", chat.id)]
    assert events(socket_state, "left_chat")[0]["payload"] == {"chatId": chat.id}


def test_send_message_requires_authentication(socket_state, chat):
    run(socket_module.send_message("sid-anon", {"chatId": chat.id, "content": "hello"}))

    assert events(socket_state, "error")[0]["payload"] == {"message": "Authentication required"}


def test_send_message_delivers_and_acknowledges_an_authorized_sender(
    socket_state, chat, emitted, monkeypatch
):
    socket_module.connected_users["sid-alice"] = "alice"
    monkeypatch.setattr(socket_module.user_client, "is_user_verified", AsyncMock(return_value=True))

    run(
        socket_module.send_message(
            "sid-alice", {"chatId": chat.id, "content": "hello", "tempId": "tmp-1"}
        )
    )

    assert [call["event"] for call in emitted] == ["new_message"]
    assert emitted[0]["payload"]["message"]["tempId"] == "tmp-1"
    ack = events(socket_state, "message_sent")[0]["payload"]
    assert ack["success"] is True
    assert ack["chatId"] == chat.id
    assert ack["tempId"] == "tmp-1"


def test_send_message_denies_a_non_participant(socket_state, chat, monkeypatch):
    socket_module.connected_users["sid-carol"] = "carol"
    monkeypatch.setattr(socket_module.user_client, "is_user_verified", AsyncMock(return_value=True))

    run(socket_module.send_message("sid-carol", {"chatId": chat.id, "content": "secret"}))

    assert events(socket_state, "error")[0]["payload"] == {
        "message": "You are not a participant in this chat"
    }


def test_load_messages_requires_authentication_and_participation(
    socket_state, chat, seed_messages
):
    seed_messages(2)
    run(socket_module.load_messages("sid-anon", {"chatId": chat.id}))
    assert events(socket_state, "error")[0]["payload"] == {"message": "Authentication required"}

    socket_module.connected_users["sid-carol"] = "carol"
    run(socket_module.load_messages("sid-carol", {"chatId": chat.id}))
    assert events(socket_state, "error")[1]["payload"] == {
        "message": "Chat not found or access denied"
    }


def test_load_messages_returns_a_page_to_a_participant(socket_state, chat, seed_messages):
    seed_messages(3)
    socket_module.connected_users["sid-alice"] = "alice"

    run(socket_module.load_messages("sid-alice", {"chatId": chat.id, "limit": 2}))

    history = events(socket_state, "message_history")[0]["payload"]
    assert history["chatId"] == chat.id
    assert [message["content"] for message in history["messages"]] == ["message 1", "message 2"]
    assert history["hasMore"] is True


def test_mark_read_requires_authentication_and_updates_a_participant(socket_state, chat, emitted):
    run(socket_module.mark_read("sid-anon", {"chatId": chat.id}))
    assert events(socket_state, "error")[0]["payload"] == {"message": "Authentication required"}

    socket_module.connected_users["sid-alice"] = "alice"
    run(socket_module.mark_read("sid-alice", {"chatId": chat.id}))

    assert "alice" in chat.last_read
    assert [call["event"] for call in emitted] == ["chat_read"]


def test_typing_is_forwarded_only_by_an_authenticated_socket(socket_state, chat):
    run(socket_module.typing("sid-anon", {"chatId": chat.id}))
    assert events(socket_state, "typing") == []

    socket_module.connected_users["sid-alice"] = "alice"
    run(socket_module.typing("sid-alice", {"chatId": chat.id, "isTyping": False}))

    typing_event = events(socket_state, "typing")[0]
    assert typing_event["payload"] == {
        "chatId": chat.id,
        "userId": "alice",
        "isTyping": False,
    }
    assert typing_event["kwargs"]["room"] == chat.id
    assert typing_event["kwargs"]["skip_sid"] == "sid-alice"


def test_delete_message_requires_authentication_and_ownership(
    socket_state, chat, seed_messages
):
    message = seed_messages(1, sender="alice")[0]
    run(socket_module.delete_message("sid-anon", {"messageId": message.id}))
    assert events(socket_state, "error")[0]["payload"] == {"message": "Authentication required"}

    socket_module.connected_users["sid-bob"] = "bob"
    run(socket_module.delete_message("sid-bob", {"messageId": message.id}))
    assert events(socket_state, "error")[1]["payload"] == {
        "message": "You can only delete your own messages"
    }


def test_delete_message_sends_success_for_the_sender(socket_state, chat, seed_messages, emitted):
    message = seed_messages(1, sender="alice")[0]
    socket_module.connected_users["sid-alice"] = "alice"

    run(socket_module.delete_message("sid-alice", {"messageId": message.id}))

    assert [call["event"] for call in emitted] == ["message_deleted"]
    assert events(socket_state, "delete_success")[0]["payload"] == {
        "success": True,
        "messageId": message.id,
    }
    assert FakeMessage.store[message.id].is_deleted is True
