from rest_framework import serializers

from .models import (
    Document,
    Event,
    Matter,
    Organization,
    Person,
    Task,
    WebhookEvent,
    WebhookSubscription,
)


class PersonSerializer(serializers.ModelSerializer):
    class Meta:
        model = Person
        fields = ['id', 'name', 'role', 'email', 'phone', 'organization', 'data_tier', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']

class OrganizationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Organization
        fields = ['id', 'name', 'organization_type', 'jurisdiction', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']

class MatterSerializer(serializers.ModelSerializer):
    complainant_detail = PersonSerializer(source='complainant', read_only=True)
    organization_detail = OrganizationSerializer(source='organization', read_only=True)

    class Meta:
        model = Matter
        fields = [
            'id', 'title', 'description', 'status', 'data_tier',
            'complainant', 'complainant_detail', 'organization', 'organization_detail',
            'incident_date', 'approved_for_research', 'approved_for_publication', 'approved_for_referral',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

class EventSerializer(serializers.ModelSerializer):
    class Meta:
        model = Event
        fields = ['id', 'matter', 'event_type', 'description', 'event_date', 'location', 'pattern_flagged', 'pattern_description', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']

class DocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Document
        fields = ['id', 'matter', 'title', 'document_type', 'data_tier', 'file_path', 'mime_type', 'extracted_text', 'uploaded_at']
        read_only_fields = ['id', 'uploaded_at']

class TaskSerializer(serializers.ModelSerializer):
    class Meta:
        model = Task
        fields = ['id', 'matter', 'title', 'description', 'task_type', 'status', 'assigned_to', 'requires_approval', 'approved_by', 'due_date', 'created_at', 'completed_at']
        read_only_fields = ['id', 'created_at', 'completed_at']

class WebhookEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = WebhookEvent
        fields = ['id', 'event_type', 'payload', 'sent_at', 'delivery_status', 'delivery_response']
        read_only_fields = ['id', 'sent_at']

class WebhookSubscriptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = WebhookSubscription
        fields = ['id', 'url', 'event_type', 'active', 'secret', 'created_at', 'updated_at', 'last_delivery_at']
        read_only_fields = ['id', 'created_at', 'updated_at', 'last_delivery_at']
