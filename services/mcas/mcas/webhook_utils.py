import requests
import json
import hmac
import hashlib
import logging
from django.utils import timezone
from django.db.models import Q
from .models import WebhookSubscription, WebhookEvent

logger = logging.getLogger(__name__)

def deliver_webhook(webhook_event):
    """
    Deliver webhook event to all active subscribers.

    Finds matching subscriptions and sends HTTP POST requests.
    Updates delivery_status and delivery_response on WebhookEvent.
    """
    subscriptions = WebhookSubscription.objects.filter(
        active=True
    ).filter(
        Q(event_type='*') | Q(event_type=webhook_event.event_type)
    )

    if not subscriptions.exists():
        webhook_event.delivery_status = 'pending'
        webhook_event.save(update_fields=['delivery_status'])
        logger.info(f"No active subscriptions for {webhook_event.event_type}")
        return

    success_count = 0
    for subscription in subscriptions:
        try:
            response = send_webhook_request(subscription, webhook_event)
            success_count += 1
            logger.info(f"Webhook delivered to {subscription.url}: {response.status_code}")
        except Exception as e:
            logger.error(f"Failed to deliver webhook to {subscription.url}: {str(e)}")

    # Set overall status based on success count
    if success_count > 0:
        webhook_event.delivery_status = 'success'
    else:
        webhook_event.delivery_status = 'failed'

    webhook_event.save(update_fields=['delivery_status'])

def send_webhook_request(subscription, webhook_event):
    """
    Send HTTP POST request to webhook subscriber.

    Includes optional HMAC signature if secret is configured.
    """
    payload = {
        'event_type': webhook_event.event_type,
        'payload': webhook_event.payload,
        'timestamp': webhook_event.sent_at.isoformat(),
    }

    headers = {
        'Content-Type': 'application/json',
        'X-MCAS-Event-Type': webhook_event.event_type,
    }

    # Add HMAC signature if secret is configured
    if subscription.secret:
        payload_json = json.dumps(payload, sort_keys=True)
        signature = hmac.new(
            subscription.secret.encode(),
            payload_json.encode(),
            hashlib.sha256
        ).hexdigest()
        headers['X-MCAS-Signature'] = signature

    response = requests.post(
        subscription.url,
        json=payload,
        headers=headers,
        timeout=10
    )

    response.raise_for_status()

    # Update subscription's last delivery time
    subscription.last_delivery_at = timezone.now()
    subscription.save(update_fields=['last_delivery_at'])

    return response
