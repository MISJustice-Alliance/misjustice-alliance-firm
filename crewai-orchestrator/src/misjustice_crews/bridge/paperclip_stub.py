"""Backward-compat re-export of the real Paperclip client.

The ``PaperclipClient`` class now lives in ``paperclip_client.py`` and
implements local-registry + API validation with graceful fallback.
This module simply re-exports it so existing imports continue to work.
"""

from misjustice_crews.bridge.paperclip_client import PaperclipClient

__all__ = ["PaperclipClient"]
