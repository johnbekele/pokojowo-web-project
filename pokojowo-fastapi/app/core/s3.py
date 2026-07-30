"""S3 helpers for the uploads bucket.

All calls use boto3's default credentials chain, which on the deployed
EC2 instance resolves to the instance profile provisioned by Pulumi
(`{name}-ec2-role`). No access keys are ever read from settings.

The sync boto3 client is fine here: image uploads are already the slow
part of the request, so wrapping `put_object` in `asyncio.to_thread`
keeps the event loop free without adopting `aioboto3`.
"""

from __future__ import annotations

import asyncio
from functools import lru_cache
from typing import TYPE_CHECKING

import boto3
from botocore.config import Config

from app.core.config import settings

if TYPE_CHECKING:  # pragma: no cover - type-only import
    from botocore.client import BaseClient


class S3NotConfiguredError(RuntimeError):
    """Raised when an S3 call is attempted but S3_UPLOADS_BUCKET is unset.

    Only reachable in DEBUG mode (see config.require_bucket_in_prod) —
    protects local dev from accidentally hitting AWS with a null bucket.
    """


@lru_cache(maxsize=1)
def _client() -> "BaseClient":
    # `s3v4` is required for OAC-fronted buckets and standard everywhere else.
    # Retries: boto3 defaults are already sensible; tighten total attempts.
    return boto3.client(
        "s3",
        region_name=settings.AWS_REGION,
        config=Config(signature_version="s3v4", retries={"max_attempts": 3, "mode": "standard"}),
    )


def _require_bucket() -> str:
    bucket = settings.S3_UPLOADS_BUCKET
    if not bucket:
        raise S3NotConfiguredError(
            "S3_UPLOADS_BUCKET is not set; cannot talk to S3."
        )
    return bucket


async def put_object(key: str, content: bytes, content_type: str) -> None:
    """Upload `content` to `s3://<bucket>/<key>` with sensible defaults.

    - Bucket is server-side encrypted by default (SSE-S3 configured in Pulumi).
    - CacheControl assumes UUID-in-key filenames (content-addressed by
      construction), so responses can be cached indefinitely.
    """
    bucket = _require_bucket()

    def _put() -> None:
        _client().put_object(
            Bucket=bucket,
            Key=key,
            Body=content,
            ContentType=content_type,
            CacheControl="public, max-age=31536000, immutable",
        )

    await asyncio.to_thread(_put)


async def delete_object(key: str) -> None:
    """Delete `s3://<bucket>/<key>`. Idempotent: S3 returns 204 even when
    the object is absent, so callers don't need to pre-check existence."""
    bucket = _require_bucket()

    def _delete() -> None:
        _client().delete_object(Bucket=bucket, Key=key)

    await asyncio.to_thread(_delete)


async def generate_presigned_get(key: str, expires: int | None = None) -> str:
    """Return a short-lived presigned GET URL for a private object.

    Used for verification documents; never call this for public uploads,
    which are served through CloudFront."""
    bucket = _require_bucket()
    ttl = expires if expires is not None else settings.PRIVATE_URL_TTL_SECONDS

    def _sign() -> str:
        return _client().generate_presigned_url(
            "get_object",
            Params={"Bucket": bucket, "Key": key},
            ExpiresIn=ttl,
        )

    return await asyncio.to_thread(_sign)


def public_url(key: str) -> str:
    """Turn an S3 key like `uploads/listing/xxx.jpg` into the URL clients
    should store / display: `/uploads/listing/xxx.jpg` (relative — the
    CloudFront distribution routes it), unless `PUBLIC_CDN_BASE_URL` is
    set, in which case an absolute URL is returned."""
    path = f"/{key.lstrip('/')}"
    base = settings.PUBLIC_CDN_BASE_URL
    return f"{base.rstrip('/')}{path}" if base else path
