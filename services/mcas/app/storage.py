"""MinIO S3-compatible object storage client for MCAS."""

import io
from datetime import timedelta
from typing import BinaryIO

from minio import Minio

from app.config import settings


def _get_client() -> Minio:
    return Minio(
        settings.minio_endpoint,
        access_key=settings.minio_access_key,
        secret_key=settings.minio_secret_key,
        secure=False,
    )


async def upload_document(
    matter_id: str,
    filename: str,
    data: BinaryIO,
    content_type: str = "application/octet-stream",
) -> str:
    """Upload a document to MinIO and return its storage key.

    Args:
        matter_id: UUID of the parent matter.
        filename: Original filename.
        data: File-like object containing the document bytes.
        content_type: MIME type of the document.

    Returns:
        storage_key: The MinIO object name (e.g. "matters/<id>/filename.pdf").
    """
    client = _get_client()
    bucket = "mcas-documents"
    storage_key = f"matters/{matter_id}/{filename}"

    # Ensure bucket exists
    if not client.bucket_exists(bucket):
        client.make_bucket(bucket)

    # Upload
    length = data.seek(0, io.SEEK_END)
    data.seek(0)
    client.put_object(bucket, storage_key, data, length, content_type=content_type)

    return storage_key


def get_presigned_url(storage_key: str, expiry: int = 3600) -> str:
    """Generate a presigned GET URL for a stored document."""
    client = _get_client()
    bucket = "mcas-documents"
    url: str = client.presigned_get_object(bucket, storage_key, expires=timedelta(seconds=expiry))
    return url
