"""Opening a conversation must show its newest messages.

History was sorted ascending and paged with skip/limit, so the default request
returned the fifty *oldest* messages. Any conversation more than a page long
opened on months-old history with the recent messages unreachable.
"""
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api.v1.endpoints import messages as messages_endpoint
from app.core.dependencies import TokenUser, get_current_user
from app.services import chat_service

from .conftest import run


def load(chat, **kwargs):
    return run(chat_service.load_message_page(room_id=chat.id, **kwargs))


def contents(page):
    return [m["content"] for m in page["messages"]]


def test_default_page_returns_the_newest_messages(chat, seed_messages):
    seed_messages(120)

    page = load(chat)

    assert len(page["messages"]) == 50
    assert contents(page)[-1] == "message 119"
    assert contents(page)[0] == "message 70"


def test_messages_render_oldest_first(chat, seed_messages):
    seed_messages(10)

    timestamps = [m["createdAt"] for m in load(chat)["messages"]]

    assert timestamps == sorted(timestamps)


def test_has_more_is_false_on_an_exact_page_boundary(chat, seed_messages):
    """len(page) == limit was the old test, and it is wrong here."""
    seed_messages(50)

    page = load(chat, limit=50)

    assert len(page["messages"]) == 50
    assert page["hasMore"] is False


def test_has_more_is_true_when_older_messages_exist(chat, seed_messages):
    seed_messages(51)

    assert load(chat, limit=50)["hasMore"] is True


def test_paging_back_with_before_has_no_gaps_or_duplicates(chat, seed_messages):
    seed_messages(120)

    newest = load(chat, limit=50)
    older = load(chat, limit=50, before=newest["nextBefore"])
    oldest = load(chat, limit=50, before=older["nextBefore"])

    walked = contents(oldest) + contents(older) + contents(newest)
    expected = [f"message {i}" for i in range(120)]

    assert walked == expected
    assert len(set(walked)) == 120
    assert oldest["hasMore"] is False


def test_next_before_points_at_the_oldest_message_returned(chat, seed_messages):
    seed_messages(60)

    page = load(chat, limit=10)

    assert page["messages"][0]["_id"] == page["nextBefore"]


def test_empty_conversation_pages_cleanly(chat):
    page = load(chat)

    assert page == {"messages": [], "hasMore": False, "nextBefore": None}


def test_limit_is_capped(chat, seed_messages):
    seed_messages(120)

    assert len(load(chat, limit=10_000)["messages"]) == chat_service.MAX_PAGE_SIZE


def test_skip_still_works_for_clients_on_the_old_contract(chat, seed_messages):
    seed_messages(120)

    page = load(chat, limit=10, skip=10)

    # Skipping ten from the newest end lands on messages 100-109.
    assert contents(page)[-1] == "message 109"


def test_other_conversations_are_not_included(chat, seed_messages):
    from .conftest import FakeChat, FakeMessage

    seed_messages(3)
    other = FakeChat("c2", ["alice", "carol"])
    FakeChat.store["c2"] = other
    stray = FakeMessage(content="not mine", sender="carol", room_id="c2")
    FakeMessage.store[stray.id] = stray

    assert "not mine" not in contents(load(chat))


@pytest.fixture
def rest_client():
    app = FastAPI()
    app.include_router(messages_endpoint.router, prefix="/messages")
    app.dependency_overrides[get_current_user] = lambda: TokenUser(id="alice")
    return TestClient(app)


def test_rest_returns_the_newest_page_in_an_envelope(rest_client, chat, seed_messages):
    seed_messages(120)

    body = rest_client.get(f"/messages/room/{chat.id}").json()

    assert body["hasMore"] is True
    assert body["messages"][-1]["content"] == "message 119"
    assert body["nextBefore"] == body["messages"][0]["_id"]


def test_rest_and_service_agree(rest_client, chat, seed_messages):
    """The socket path calls the service directly, so this pins them together."""
    seed_messages(80)

    body = rest_client.get(f"/messages/room/{chat.id}", params={"limit": 20}).json()

    assert body == load(chat, limit=20)


def test_rest_rejects_a_non_participant(rest_client, chat, seed_messages):
    chat.participants = ["bob", "carol"]
    seed_messages(1)

    assert rest_client.get(f"/messages/room/{chat.id}").status_code == 403
