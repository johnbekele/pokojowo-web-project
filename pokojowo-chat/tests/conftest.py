"""Fixtures that exercise the chat service without MongoDB.

Beanie documents cannot be instantiated before their collection is initialised,
so the Chat and Message names the service module holds are swapped for
in-memory stand-ins. Coroutines are driven with asyncio.run rather than
pytest-asyncio so tests stay plain functions.
"""
from datetime import datetime, timedelta
from types import SimpleNamespace

import pytest

from app.services import chat_service


def run(coro):
    """Drive a coroutine to completion."""
    import asyncio

    return asyncio.run(coro)


class FakeMessage:
    """Stand-in for the Message document, backed by a class-level registry."""

    store: dict = {}
    _seq = 0

    def __init__(self, content, sender, room_id, reply_to=None, created_at=None, is_deleted=False):
        type(self)._seq += 1
        self.id = f"m{type(self)._seq}"
        self.content = content
        self.sender = sender
        self.room_id = room_id
        self.reply_to = reply_to
        self.created_at = created_at or datetime(2026, 1, 1)
        self.is_deleted = is_deleted
        self.deleted_at = None

    async def insert(self):
        type(self).store[self.id] = self
        return self

    async def save(self):
        type(self).store[self.id] = self
        return self

    @classmethod
    async def get(cls, message_id):
        return cls.store.get(message_id)


class FakeChat:
    """Stand-in for the Chat document."""

    store: dict = {}

    def __init__(self, chat_id, participants):
        self.id = chat_id
        self.participants = list(participants)
        self.messages = []
        self.last_message = None
        self.updated_at = None
        self.save_count = 0

    async def save(self):
        self.save_count += 1
        return self

    @classmethod
    async def get(cls, chat_id):
        return cls.store.get(chat_id)


@pytest.fixture(autouse=True)
def _reset_stores():
    FakeMessage.store.clear()
    FakeMessage._seq = 0
    FakeChat.store.clear()
    yield
    FakeMessage.store.clear()
    FakeChat.store.clear()


@pytest.fixture
def blocked_pairs():
    """Mutable set of (a, b) user pairs that should be treated as blocked."""
    return set()


@pytest.fixture(autouse=True)
def fake_documents(monkeypatch, blocked_pairs):
    """Point the service module at the in-memory documents and a stub user API."""

    async def is_blocked_between(a, b):
        return (a, b) in blocked_pairs or (b, a) in blocked_pairs

    monkeypatch.setattr(chat_service, "Message", FakeMessage)
    monkeypatch.setattr(chat_service, "Chat", FakeChat)
    monkeypatch.setattr(
        chat_service,
        "user_client",
        SimpleNamespace(
            is_blocked_between=is_blocked_between,
            get_users_batch=lambda ids: _empty_profiles(ids),
        ),
    )


async def _empty_profiles(ids):
    return {}


@pytest.fixture
def emitted(monkeypatch):
    """Capture the Socket.IO broadcasts the service layer issues."""
    import app.core.socket as socket_module

    calls = []

    async def record(event, payload, participants):
        calls.append({"event": event, "payload": payload, "participants": list(participants)})

    monkeypatch.setattr(socket_module, "emit_to_participants", record)
    return calls


@pytest.fixture
def chat():
    """A two-participant chat registered in the fake store."""
    made = FakeChat("c1", ["alice", "bob"])
    FakeChat.store["c1"] = made
    return made


@pytest.fixture
def seed_messages(chat):
    """Insert n messages into `chat`, oldest first, and return them."""

    def _seed(n, sender="alice", start=datetime(2026, 1, 1)):
        made = []
        for i in range(n):
            msg = FakeMessage(
                content=f"message {i}",
                sender=sender,
                room_id=chat.id,
                created_at=start + timedelta(minutes=i),
            )
            FakeMessage.store[msg.id] = msg
            chat.messages.append(msg.id)
            made.append(msg)
        if made:
            chat.last_message = made[-1].id
        return made

    return _seed
