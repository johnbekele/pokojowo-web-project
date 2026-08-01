"""Unread badges were permanently zero because nothing computed unreadCount.

Both clients read the field off each chat; the service never set it, and there
was no read state in the data model at all. A user who received a message while
the app was closed had no in-app sign of it.
"""
from datetime import datetime, timedelta

import pytest

from app.services import chat_service

from .conftest import FakeChat, FakeMessage, run


def unread(chat, user):
    return run(chat_service.unread_count_for(chat, user))


def seeded_chat(participants=("alice", "bob"), read_at=datetime(2026, 1, 1)):
    """A chat whose participants have already read up to `read_at`."""
    made = FakeChat(
        participants=list(participants),
        last_read={p: read_at for p in participants},
        id="seeded",
    )
    FakeChat.store[made.id] = made
    return made


def add_message(chat, sender, minutes_after=1, base=datetime(2026, 1, 1), deleted=False):
    msg = FakeMessage(
        content="hi",
        sender=sender,
        room_id=chat.id,
        created_at=base + timedelta(minutes=minutes_after),
        is_deleted=deleted,
    )
    FakeMessage.store[msg.id] = msg
    return msg


def test_a_message_from_the_other_person_counts_as_unread():
    chat = seeded_chat()
    add_message(chat, sender="bob")

    assert unread(chat, "alice") == 1


def test_your_own_messages_never_count():
    chat = seeded_chat()
    add_message(chat, sender="alice", minutes_after=1)
    add_message(chat, sender="alice", minutes_after=2)

    assert unread(chat, "alice") == 0


def test_messages_before_the_cursor_do_not_count():
    chat = seeded_chat(read_at=datetime(2026, 1, 1, 12, 0))
    add_message(chat, sender="bob", base=datetime(2026, 1, 1, 10, 0))

    assert unread(chat, "alice") == 0


def test_deleted_messages_do_not_count():
    chat = seeded_chat()
    add_message(chat, sender="bob", deleted=True)

    assert unread(chat, "alice") == 0


def test_counts_are_per_participant():
    chat = seeded_chat()
    add_message(chat, sender="bob", minutes_after=1)
    add_message(chat, sender="bob", minutes_after=2)
    add_message(chat, sender="alice", minutes_after=3)

    assert unread(chat, "alice") == 2
    assert unread(chat, "bob") == 1


def test_marking_read_clears_the_count():
    chat = seeded_chat()
    add_message(chat, sender="bob")
    assert unread(chat, "alice") == 1

    run(chat_service.mark_chat_read(chat, "alice"))

    assert unread(chat, "alice") == 0


def test_marking_read_notifies_participants(emitted):
    chat = seeded_chat()

    run(chat_service.mark_chat_read(chat, "alice"))

    assert [call["event"] for call in emitted] == ["chat_read"]
    assert emitted[0]["payload"]["chatId"] == chat.id
    assert emitted[0]["payload"]["userId"] == "alice"


def test_marking_read_does_not_affect_the_other_participant():
    chat = seeded_chat()
    add_message(chat, sender="bob", minutes_after=1)
    add_message(chat, sender="alice", minutes_after=2)

    run(chat_service.mark_chat_read(chat, "alice"))

    assert unread(chat, "bob") == 1


def test_a_chat_predating_read_tracking_reports_nothing_unread(chat, seed_messages):
    """The deploy must not greet everyone with a backlog of old messages."""
    seed_messages(200, sender="bob")

    assert chat.last_read == {}
    assert unread(chat, "alice") == 0


def test_the_cursor_is_seeded_on_first_read(chat, seed_messages):
    seed_messages(200, sender="bob")

    created = run(chat_service.ensure_read_cursor(chat, "alice"))

    assert created is True
    assert "alice" in chat.last_read
    assert unread(chat, "alice") == 0


def test_seeding_is_idempotent(chat):
    run(chat_service.ensure_read_cursor(chat, "alice"))
    first = chat.last_read["alice"]

    assert run(chat_service.ensure_read_cursor(chat, "alice")) is False
    assert chat.last_read["alice"] == first


def test_messages_after_seeding_do_count(chat):
    run(chat_service.ensure_read_cursor(chat, "alice"))
    add_message(chat, sender="bob", base=datetime.utcnow(), minutes_after=1)

    assert unread(chat, "alice") == 1


def test_a_new_chat_starts_with_cursors_so_the_first_message_is_unread():
    made = chat_service.new_chat_document(["alice", "bob"])
    FakeChat.store[made.id] = made

    assert set(made.last_read) == {"alice", "bob"}

    add_message(made, sender="bob", base=datetime.utcnow(), minutes_after=1)

    assert unread(made, "alice") == 1
    assert unread(made, "bob") == 0


def test_enriched_list_item_exposes_the_count():
    chat = seeded_chat()
    add_message(chat, sender="bob")

    item = run(chat_service.enrich_chat_list_item(chat, "alice"))

    assert item["unreadCount"] == 1


def test_enriching_seeds_a_missing_cursor(chat, seed_messages):
    seed_messages(80, sender="bob")

    item = run(chat_service.enrich_chat_list_item(chat, "alice"))

    assert item["unreadCount"] == 0
    assert "alice" in chat.last_read
