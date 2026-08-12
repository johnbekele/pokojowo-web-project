"""Unit tests for the deploy-time migration runner."""

from __future__ import annotations

from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest

from migrations import runner


class FakeCollection:
    def __init__(self) -> None:
        self.applied: set[str] = set()
        self.documents: list[dict] = []

    async def create_index(self, *_args, **_kwargs):
        return "index"

    async def find_one(self, query):
        version = query.get("version")
        if version in self.applied:
            return {"version": version}
        return None

    async def find_one_and_update(self, _query, update, **_kwargs):
        return {"_id": runner.LOCK_ID, "owner": update["$set"]["owner"]}

    async def insert_one(self, document):
        self.documents.append(document)
        self.applied.add(document["version"])

    async def delete_one(self, *_args, **_kwargs):
        return None


class FakeDatabase:
    def __init__(self) -> None:
        self.collections = {
            runner.MIGRATIONS_COLLECTION: FakeCollection(),
            runner.LOCK_COLLECTION: FakeCollection(),
        }

    def __getitem__(self, name):
        return self.collections.setdefault(name, FakeCollection())


class FakeClient:
    def __init__(self, database: FakeDatabase) -> None:
        self.database = database
        self.admin = SimpleNamespace(command=AsyncMock())

    def __getitem__(self, _name):
        return self.database

    def close(self):
        return None


@pytest.mark.asyncio
async def test_runner_applies_each_pending_migration_once():
    database = FakeDatabase()
    client = FakeClient(database)
    calls: list[str] = []

    async def apply(_database):
        calls.append("001")
        return {"changed": 1}

    original = runner.MIGRATIONS
    runner.MIGRATIONS = (("001", "test migration", apply),)
    try:
        def factory(*_args, **_kwargs):
            return client

        assert await runner.run_migrations("mongodb://test", "db", client_factory=factory) == ["001"]
        assert await runner.run_migrations("mongodb://test", "db", client_factory=factory) == []
    finally:
        runner.MIGRATIONS = original

    assert calls == ["001"]
    assert database[runner.MIGRATIONS_COLLECTION].documents[0]["details"] == {"changed": 1}


@pytest.mark.asyncio
async def test_dry_run_does_not_acquire_lock_or_apply():
    database = FakeDatabase()
    client = FakeClient(database)
    calls: list[str] = []

    async def apply(_database):
        calls.append("applied")

    original = runner.MIGRATIONS
    runner.MIGRATIONS = (("001", "test migration", apply),)
    try:
        def factory(*_args, **_kwargs):
            return client

        assert await runner.run_migrations(
            "mongodb://test", "db", dry_run=True, client_factory=factory
        ) == ["001"]
    finally:
        runner.MIGRATIONS = original

    assert calls == []
    assert database[runner.MIGRATIONS_COLLECTION].documents == []
