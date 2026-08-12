"""Remove duplicate like/match rows before enforcing compound uniqueness.

The application has historically created non-unique compound indexes.  This
migration normalises unordered match pairs, keeps one document for each
logical pair, and then replaces those indexes with unique ones.  Every
operation is safe to repeat: a failed deploy can run the same migration again.
"""

from __future__ import annotations

from typing import Any

from pymongo import ASCENDING, DESCENDING
from pymongo.errors import DuplicateKeyError


def _pair_key(document: dict[str, Any], first: str, second: str) -> tuple[str, str] | None:
    left = document.get(first)
    right = document.get(second)
    if not isinstance(left, str) or not isinstance(right, str) or not left or not right:
        return None
    return left, right


async def _normalise_match_pairs(collection: Any) -> int:
    """Store match endpoints in the same order regardless of request order."""

    changed = 0
    async for document in collection.find(
        {}, {"_id": 1, "user1Id": 1, "user2Id": 1}
    ):
        pair = _pair_key(document, "user1Id", "user2Id")
        if pair is None or pair[0] <= pair[1]:
            continue
        # A deployment may already have created the unique index while an old
        # record still uses the reverse orientation.  Delete the reverse row
        # instead of attempting an update that would violate that index.
        canonical = await collection.find_one(
            {"user1Id": pair[1], "user2Id": pair[0]}, {"_id": 1}
        )
        if canonical:
            await collection.delete_one({"_id": document["_id"]})
            changed += 1
            continue
        try:
            await collection.update_one(
                {"_id": document["_id"]},
                {"$set": {"user1Id": pair[1], "user2Id": pair[0]}},
            )
        except DuplicateKeyError:
            # Another process may have normalised the canonical row between
            # the lookup and update.  The migration is safe to retry, so drop
            # this now-redundant reverse row.
            await collection.delete_one({"_id": document["_id"]})
        changed += 1
    return changed


async def _delete_duplicates(
    collection: Any,
    fields: tuple[str, str],
    sort_field: str,
) -> int:
    """Keep the newest valid document for each pair and delete the rest."""

    groups = collection.aggregate(
        [
            {
                "$match": {
                    fields[0]: {"$type": "string", "$ne": ""},
                    fields[1]: {"$type": "string", "$ne": ""},
                }
            },
            {"$sort": {sort_field: DESCENDING, "_id": ASCENDING}},
            {
                "$group": {
                    "_id": {fields[0]: f"${fields[0]}", fields[1]: f"${fields[1]}"},
                    "ids": {"$push": "$_id"},
                    "count": {"$sum": 1},
                }
            },
            {"$match": {"count": {"$gt": 1}}},
        ]
    )

    deleted = 0
    async for group in groups:
        duplicate_ids = group["ids"][1:]
        if not duplicate_ids:
            continue
        result = await collection.delete_many({"_id": {"$in": duplicate_ids}})
        deleted += result.deleted_count
    return deleted


async def _ensure_unique_index(
    collection: Any,
    fields: tuple[str, str],
    name: str,
) -> None:
    expected = tuple((field, ASCENDING) for field in fields)
    async for index in collection.list_indexes():
        key = tuple(index["key"].items())
        if key != expected:
            continue
        if index.get("unique"):
            return
        await collection.drop_index(index["name"])
    await collection.create_index(list(expected), unique=True, name=name)


async def apply(database: Any) -> dict[str, int]:
    """Apply the #134 cleanup and return auditable counters."""

    likes = database["likes"]
    matches = database["mutual_matches"]
    normalised = await _normalise_match_pairs(matches)
    deleted_likes = await _delete_duplicates(likes, ("likerId", "likedUserId"), "likedAt")
    deleted_matches = await _delete_duplicates(
        matches, ("user1Id", "user2Id"), "matchedAt"
    )
    await _ensure_unique_index(likes, ("likerId", "likedUserId"), "uniq_likes_pair")
    await _ensure_unique_index(
        matches, ("user1Id", "user2Id"), "uniq_mutual_matches_pair"
    )
    return {
        "normalised_matches": normalised,
        "deleted_likes": deleted_likes,
        "deleted_matches": deleted_matches,
    }
