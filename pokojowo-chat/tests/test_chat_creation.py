"""Chat creation must not accept participants that do not exist, or a third one.

POST /chat/ stored whatever IDs it was given, so a conversation could be created
against a deleted or made-up user: the counterpart renders as null and no
user-facing action removes the thread. It also accepted three or more
participants, where every enrichment path picks a single counterpart, so the
third person was invisible to the other two.
"""
import inspect

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api.v1.endpoints import chat as chat_endpoint
from app.core.dependencies import TokenUser, get_current_user, require_verified

from .conftest import FakeChat, FakeMessage


@pytest.fixture
def client():
    app = FastAPI()
    app.include_router(chat_endpoint.router, prefix="/chat")
    caller = TokenUser(id="alice", email="alice@example.com")
    app.dependency_overrides[require_verified] = lambda: caller
    app.dependency_overrides[get_current_user] = lambda: caller
    return TestClient(app)


def test_creating_a_chat_with_a_known_user_succeeds(client):
    response = client.post("/chat/", json={"participants": ["bob"]})

    assert response.status_code == 201
    assert sorted(response.json()["participants"]) == ["alice", "bob"]
    assert "messages" not in response.json()


def test_an_unknown_participant_is_rejected(client):
    response = client.post("/chat/", json={"participants": ["nobody"]})

    assert response.status_code == 400
    assert FakeChat.store == {}


def test_a_deleted_user_is_rejected(client, known_users):
    known_users.discard("bob")

    assert client.post("/chat/", json={"participants": ["bob"]}).status_code == 400


def test_a_third_participant_is_rejected(client):
    response = client.post("/chat/", json={"participants": ["bob", "carol"]})

    assert response.status_code == 400
    assert FakeChat.store == {}


def test_the_caller_alone_is_rejected(client):
    """Deduplicating to a single participant is not a conversation."""
    assert client.post("/chat/", json={"participants": ["alice"]}).status_code == 400


def test_a_duplicated_participant_is_deduplicated(client):
    response = client.post("/chat/", json={"participants": ["bob", "bob"]})

    assert response.status_code == 201
    assert sorted(response.json()["participants"]) == ["alice", "bob"]


def test_a_blocked_participant_is_rejected(client, blocked_pairs):
    blocked_pairs.add(("alice", "bob"))

    assert client.post("/chat/", json={"participants": ["bob"]}).status_code == 403


def test_creating_twice_returns_the_existing_chat(client):
    first = client.post("/chat/", json={"participants": ["bob"]}).json()
    second = client.post("/chat/", json={"participants": ["bob"]}).json()

    assert second["chat_id"] == first["chat_id"]
    assert len(FakeChat.store) == 1


def test_deleting_a_chat_removes_messages_even_without_legacy_ids(client, chat, seed_messages):
    seed_messages(2)
    chat.messages = []

    response = client.delete(f"/chat/{chat.id}")

    assert response.status_code == 200
    assert FakeMessage.store == {}
    assert FakeChat.store == {}


@pytest.mark.parametrize(
    "handler",
    [chat_endpoint.create_chat, chat_endpoint.get_chat_with_user],
    ids=["create_chat", "get_chat_with_user"],
)
def test_both_creation_routes_require_a_verified_caller(handler):
    """get_chat_with_user also creates chats, so exempting it bypassed the gate."""
    caller = inspect.signature(handler).parameters["current_user"]

    assert caller.default.dependency is require_verified
