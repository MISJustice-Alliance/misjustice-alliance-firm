import logging
import os

from cryptography.fernet import Fernet
from django.contrib.auth.models import User
from django.core.exceptions import ImproperlyConfigured
from django.db import models

logger = logging.getLogger(__name__)

# Field-level encryption for Tier-0/1 data
_encryption_key = os.environ.get('ENCRYPTION_KEY', '').encode()
if not _encryption_key:
    raise ImproperlyConfigured("ENCRYPTION_KEY environment variable is required.")
try:
    cipher_suite = Fernet(_encryption_key)
except Exception as e:
    raise ImproperlyConfigured(f"ENCRYPTION_KEY is invalid: {e}") from None

def decrypt_value(encrypted_value):
    """Decrypt field value. Returns None if decryption fails or value is None."""
    if not encrypted_value:
        return encrypted_value
    try:
        return cipher_suite.decrypt(encrypted_value.encode()).decode()
    except Exception as e:
        logger.warning(f"Decryption failed: {type(e).__name__}. This may indicate data corruption or wrong encryption key.")
        return None

class EncryptedCharField(models.CharField):
    """Encrypts sensitive data (Tier-0/1) at field level. Transparent encryption/decryption."""
    def get_prep_value(self, value):
        if value:
            return cipher_suite.encrypt(value.encode()).decode()
        return value

    def from_db_value(self, value, expression, connection):
        return decrypt_value(value)

class EncryptedTextField(models.TextField):
    """Encrypts sensitive data (Tier-0/1) at field level. Transparent encryption/decryption."""
    def get_prep_value(self, value):
        if value:
            return cipher_suite.encrypt(value.encode()).decode()
        return value

    def from_db_value(self, value, expression, connection):
        return decrypt_value(value)


class Person(models.Model):
    """Individual involved in a case (complainant, officer, witness, etc.)"""
    ROLE_CHOICES = [
        ('complainant', 'Complainant'),
        ('officer', 'Officer/Defendant'),
        ('witness', 'Witness'),
        ('attorney', 'Attorney'),
        ('victim', 'Victim'),
        ('other', 'Other'),
    ]
    DATA_TIER_CHOICES = [
        ('Tier-0', 'Tier-0 (PII - Proton only)'),
        ('Tier-1', 'Tier-1 (Restricted PII)'),
        ('Tier-2', 'Tier-2 (De-identified)'),
    ]

    # Tier-0: Encrypted PII fields
    name = EncryptedCharField(max_length=255)
    email = EncryptedCharField(max_length=255, blank=True, null=True)
    phone = EncryptedCharField(max_length=20, blank=True, null=True)
    date_of_birth = models.DateField(blank=True, null=True)

    # Tier-2: De-identified fields
    role = models.CharField(max_length=50, choices=ROLE_CHOICES)
    organization = models.ForeignKey('Organization', on_delete=models.SET_NULL, null=True, blank=True)
    badge_number = models.CharField(max_length=100, blank=True, null=True)

    data_tier = models.CharField(max_length=10, choices=DATA_TIER_CHOICES, default='Tier-1')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='persons_created')

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        # Safe representation that doesn't expose PII in logs
        org_name = self.organization.name if self.organization else "Unknown"
        return f"Person(id={self.id}, role={self.role}, org={org_name})"


class Organization(models.Model):
    """Law enforcement or institutional organization."""
    name = models.CharField(max_length=255)
    type_choices = [
        ('police', 'Police Department'),
        ('sheriff', 'Sheriff Office'),
        ('prosecutor', 'Prosecutor Office'),
        ('agency', 'Government Agency'),
    ]
    organization_type = models.CharField(max_length=50, choices=type_choices)
    jurisdiction = models.CharField(max_length=255, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name


class Matter(models.Model):
    """Case or complaint (authoritative record)."""
    STATUS_CHOICES = [
        ('intake', 'Intake'),
        ('research', 'Research'),
        ('analysis', 'Analysis'),
        ('referral', 'Ready for Referral'),
        ('published', 'Published'),
        ('closed', 'Closed'),
    ]
    DATA_TIER_CHOICES = [
        ('Tier-1', 'Tier-1 (Restricted)'),
        ('Tier-2', 'Tier-2 (De-identified)'),
        ('Tier-3', 'Tier-3 (Public)'),
    ]

    title = models.CharField(max_length=500)
    description = models.TextField()
    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default='intake')
    data_tier = models.CharField(max_length=10, choices=DATA_TIER_CHOICES, default='Tier-1')

    complainant = models.ForeignKey(Person, on_delete=models.SET_NULL, null=True, related_name='complaints')
    organization = models.ForeignKey(Organization, on_delete=models.SET_NULL, null=True)

    incident_date = models.DateField(blank=True, null=True)
    intake_date = models.DateField(auto_now_add=True)

    # HITL gates (human approval required)
    approved_for_research = models.BooleanField(default=False)
    approved_for_publication = models.BooleanField(default=False)
    approved_for_referral = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='matters_created')

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.title


class Event(models.Model):
    """Specific incident or action within a case."""
    EVENT_TYPE_CHOICES = [
        ('incident', 'Incident'),
        ('arrest', 'Arrest'),
        ('interview', 'Interview'),
        ('hearing', 'Hearing'),
        ('decision', 'Decision'),
        ('pattern', 'Pattern Identified'),
    ]

    matter = models.ForeignKey(Matter, on_delete=models.CASCADE, related_name='events')
    event_type = models.CharField(max_length=50, choices=EVENT_TYPE_CHOICES)
    description = models.TextField()

    event_date = models.DateTimeField()
    location = models.CharField(max_length=500, blank=True, null=True)

    # Pattern detection flag
    pattern_flagged = models.BooleanField(default=False)
    pattern_description = models.TextField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-event_date']

    def __str__(self):
        return f"{self.event_type} - {self.matter.title}"


class Document(models.Model):
    """Evidence or supporting documents."""
    DOC_TYPE_CHOICES = [
        ('incident_report', 'Incident Report'),
        ('arrest_record', 'Arrest Record'),
        ('court_filing', 'Court Filing'),
        ('research', 'Research Document'),
        ('evidence', 'Physical Evidence Description'),
        ('other', 'Other'),
    ]
    DATA_TIER_CHOICES = [
        ('Tier-1', 'Tier-1 (Restricted)'),
        ('Tier-2', 'Tier-2 (De-identified)'),
        ('Tier-3', 'Tier-3 (Public)'),
    ]

    matter = models.ForeignKey(Matter, on_delete=models.CASCADE, related_name='documents')

    title = models.CharField(max_length=255)
    document_type = models.CharField(max_length=50, choices=DOC_TYPE_CHOICES)
    data_tier = models.CharField(max_length=10, choices=DATA_TIER_CHOICES, default='Tier-1')

    file_path = models.CharField(max_length=500)  # S3/R2 path
    file_size = models.IntegerField(blank=True, null=True)
    mime_type = models.CharField(max_length=100, blank=True)

    extracted_text = models.TextField(blank=True, null=True)

    uploaded_at = models.DateTimeField(auto_now_add=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)

    class Meta:
        ordering = ['-uploaded_at']

    def __str__(self):
        return self.title


class Task(models.Model):
    """Research, analysis, or workflow task."""
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('in_progress', 'In Progress'),
        ('complete', 'Complete'),
        ('blocked', 'Blocked'),
    ]

    matter = models.ForeignKey(Matter, on_delete=models.CASCADE, related_name='tasks')

    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    task_type = models.CharField(max_length=100)  # research, analysis, outreach, etc.

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')

    assigned_to = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)

    requires_approval = models.BooleanField(default=False)
    approved_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='approved_tasks')

    due_date = models.DateField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        ordering = ['due_date', '-created_at']

    def __str__(self):
        return f"{self.title} - {self.status}"


class WebhookEvent(models.Model):
    """Log of webhook events fired (for debugging/auditing)."""
    EVENT_TYPE_CHOICES = [
        ('matter.created', 'Matter Created'),
        ('matter.updated', 'Matter Updated'),
        ('document.uploaded', 'Document Uploaded'),
        ('event.pattern_flagged', 'Event Pattern Flagged'),
        ('task.completed', 'Task Completed'),
    ]

    event_type = models.CharField(max_length=100, choices=EVENT_TYPE_CHOICES)
    payload = models.JSONField()

    sent_at = models.DateTimeField(auto_now_add=True)
    delivery_status = models.CharField(
        max_length=20,
        choices=[('pending', 'Pending'), ('success', 'Success'), ('failed', 'Failed')],
        default='pending'
    )
    delivery_response = models.TextField(blank=True, null=True)

    class Meta:
        ordering = ['-sent_at']

    def __str__(self):
        return f"{self.event_type} - {self.delivery_status}"


class WebhookSubscription(models.Model):
    """Registered webhook subscriber endpoint."""
    EVENT_TYPE_CHOICES = [
        ('*', 'All Events'),
        ('matter.created', 'Matter Created'),
        ('matter.updated', 'Matter Updated'),
        ('document.uploaded', 'Document Uploaded'),
        ('event.pattern_flagged', 'Event Pattern Flagged'),
        ('task.completed', 'Task Completed'),
    ]

    url = models.URLField(max_length=500)
    event_type = models.CharField(max_length=100, choices=EVENT_TYPE_CHOICES, default='*')

    active = models.BooleanField(default=True)
    secret = models.CharField(max_length=255, blank=True, help_text="Optional secret for HMAC signature")

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_delivery_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        ordering = ['-created_at']
        unique_together = ('url', 'event_type')

    def clean(self):
        from django.conf import settings
        if not settings.DEBUG and self.url and not self.url.startswith('https://'):
            raise models.ValidationError({'url': 'Webhook URL must use HTTPS in non-DEBUG mode.'})

    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.event_type} -> {self.url}"
