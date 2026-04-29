import logging
import os

import boto3
from botocore.exceptions import ClientError

logger = logging.getLogger(__name__)


class StorageClient:
    """Client for R2/S3 file storage operations."""

    def __init__(self):
        self.bucket_name = os.environ.get("R2_BUCKET_NAME", "mcas-documents")
        self.account_id = os.environ.get("R2_ACCOUNT_ID")
        self.access_key_id = os.environ.get("R2_ACCESS_KEY_ID")
        self.secret_access_key = os.environ.get("R2_SECRET_ACCESS_KEY")
        self.endpoint_url = os.environ.get("R2_ENDPOINT_URL")

        if self.endpoint_url and self.access_key_id and self.secret_access_key:
            self.s3_client = boto3.client(
                "s3",
                endpoint_url=self.endpoint_url,
                aws_access_key_id=self.access_key_id,
                aws_secret_access_key=self.secret_access_key,
                region_name="auto",
            )
            self.configured = True
        else:
            self.s3_client = None
            self.configured = False
            logger.warning("R2 storage not configured - file uploads will not be stored")

    def upload_file(self, file_obj, file_path, mime_type=None):
        """
        Upload a file to R2 storage.

        Args:
            file_obj: File-like object to upload
            file_path: Remote path for the file (e.g., 'matters/123/document.pdf')
            mime_type: MIME type of the file

        Returns:
            Remote file path if successful, None otherwise
        """
        if not self.configured:
            logger.warning(f"Cannot upload {file_path} - R2 not configured")
            return None

        try:
            extra_args = {}
            if mime_type:
                extra_args["ContentType"] = mime_type

            self.s3_client.upload_fileobj(
                file_obj, self.bucket_name, file_path, ExtraArgs=extra_args
            )

            logger.info(f"File uploaded to R2: {file_path}")
            return file_path
        except ClientError as e:
            logger.error(f"Failed to upload {file_path} to R2: {str(e)}")
            return None

    def delete_file(self, file_path):
        """Delete a file from R2 storage."""
        if not self.configured:
            return False

        try:
            self.s3_client.delete_object(Bucket=self.bucket_name, Key=file_path)
            logger.info(f"File deleted from R2: {file_path}")
            return True
        except ClientError as e:
            logger.error(f"Failed to delete {file_path} from R2: {str(e)}")
            return False

    def get_file_url(self, file_path):
        """
        Generate a URL for accessing the file.

        For public files, returns the direct R2 URL.
        For private files, returns a signed URL.
        """
        if not self.configured:
            return None

        try:
            url = self.s3_client.generate_presigned_url(
                "get_object", Params={"Bucket": self.bucket_name, "Key": file_path}, ExpiresIn=3600
            )
            return url
        except ClientError as e:
            logger.error(f"Failed to generate URL for {file_path}: {str(e)}")
            return None


# Singleton instance
_storage_client = None


def get_storage_client():
    """Get or create the storage client."""
    global _storage_client
    if _storage_client is None:
        _storage_client = StorageClient()
    return _storage_client
