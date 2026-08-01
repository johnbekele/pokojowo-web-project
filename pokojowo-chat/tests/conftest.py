"""Fixtures that exercise the chat service without MongoDB.

Beanie documents cannot be instantiated before their collection is initialised,
so the Chat and Message names the service module holds are swapped for
in-memory stand-ins. Coroutines are driven with asyncio.run rather than
pytest-asyncio so tests stay plain functions.
"""
from datetime import datetime, timedelta
from types import SimpleNamespace

import pytest

from app.api.v1.endpoints import messages as messages_endpoint
from app.services import chat_service


def run(coro):
    """Drive a coroutine to completion."""
    import asyncio

    return asyncio.run(coro)


def _matches(doc, query: dict) -> bool:
    """Evaluate the small subset of Mongo query syntax the service uses."""
    for key, condition in query.items():
        if key == "$or":
            if not any(_matches(doc, clause) for clause in condition):
                return False
            continue

        value = getattr(doc, _FIELD_ATTRS.get(key, key))
        if isinstance(condition, dict):
            for operator, operand in condition.items():
                if operator == "$lt" and not value < operand:
                    return False
                if operator == "$gt" and not value > operand:
                    return False
                if operator == "$ne" and value == operand:
                    return False
        elif value != condition:
            return False
    return True


_FIELD_ATTRS = {"roomId": "room_id", "createdAt": "created_at", "_id": "id", "isDeleted": "is_deleted"}


class FakeQuery:
    """The slice of Beanie's query builder the service calls."""

    def __init__(self, docs):
        self._docs = list(docs)

    def sort(self, *keys):
        # Applied right-to-left so the leftmost key is the primary ordering.
        for key in reversed(keys):
            descending = key.startswith("-")
            name = key.lstrip("-")
            attr = _FIELD_ATTRS.get(name, name)
            self._docs.sort(key=lambda d: getattr(d, attr), reverse=descending)
        return self

    def skip(self, n):
        self._docs = self._docs[n:]
        return self

    def limit(self, n):
        self._docs = self._docs[:n]
        return self

    async def to_list(self):
        return list(self._docs)


class FakeMessage:
    """Stand-in for the Message document, backed by a class-level registry."""

    store: dict = {}
    _seq = 0

    def __init__(self, content, sender, room_id, reply_to=None, created_at=None, is_deleted=False):
        type(self)._seq += 1
        # Zero padded so lexicographic order matches insertion order, which the
        # _id tie-break in keyset paging relies on.
        self.id = f"m{type(self)._seq:05d}"
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

    @classmethod
    def find(cls, query):
        return FakeQuery(doc for doc in cls.store.values() if _matches(doc, query))


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
    # The endpoint module holds its own references for its own auth checks.
    monkeypatch.setattr(messages_endpoint, "Chat", FakeChat)
    monkeypatch.setattr(messages_endpoint, "Message", FakeMessage)
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
