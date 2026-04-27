from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models.signals import post_save
from django.dispatch import receiver
import json
from .models import Person, Organization, Matter, Event, Document, Task, WebhookEvent, WebhookSubscription
from .serializers import PersonSerializer, OrganizationSerializer, MatterSerializer, EventSerializer, DocumentSerializer, TaskSerializer, WebhookEventSerializer, WebhookSubscriptionSerializer
from .permissions import TierBasedPermission, MatterApprovalPermission, DocumentReadOnlyForTier0, TaskAssignmentPermission
from .webhook_utils import deliver_webhook
from .storage_utils import get_storage_client


class PersonViewSet(viewsets.ModelViewSet):
    queryset = Person.objects.all()
    serializer_class = PersonSerializer
    permission_classes = [permissions.IsAuthenticated, TierBasedPermission]

    def get_queryset(self):
        # Filter by tier access for requesting user
        allowed_tiers = TierBasedPermission().get_agent_tier_access(self.request)
        return super().get_queryset().filter(data_tier__in=allowed_tiers)


class OrganizationViewSet(viewsets.ModelViewSet):
    queryset = Organization.objects.all()
    serializer_class = OrganizationSerializer
    permission_classes = [permissions.IsAuthenticated, TierBasedPermission]


class MatterViewSet(viewsets.ModelViewSet):
    queryset = Matter.objects.all()
    serializer_class = MatterSerializer
    permission_classes = [permissions.IsAuthenticated, TierBasedPermission]

    def get_queryset(self):
        # Filter by tier access for requesting user
        allowed_tiers = TierBasedPermission().get_agent_tier_access(self.request)
        return super().get_queryset().filter(data_tier__in=allowed_tiers)

    @action(detail=True, methods=['post'], permission_classes=[MatterApprovalPermission])
    def approve_for_research(self, request, pk=None):
        """HITL gate: Approve matter for autonomous research."""
        matter = self.get_object()
        if matter.data_tier == 'Tier-0':
            return Response({'error': 'Tier-0 matters cannot be researched'}, status=400)
        matter.approved_for_research = True
        matter.save()
        return Response({'status': 'approved for research'})

    @action(detail=True, methods=['post'], permission_classes=[MatterApprovalPermission])
    def approve_for_publication(self, request, pk=None):
        """HITL gate: Approve matter for public publication."""
        matter = self.get_object()
        if matter.data_tier not in ['Tier-2', 'Tier-3']:
            return Response({'error': f'Tier-1 matters cannot be published publicly'}, status=400)
        matter.approved_for_publication = True
        matter.save()
        return Response({'status': 'approved for publication'})


class EventViewSet(viewsets.ModelViewSet):
    queryset = Event.objects.all()
    serializer_class = EventSerializer
    permission_classes = [permissions.IsAuthenticated, TierBasedPermission]

    def get_queryset(self):
        allowed_tiers = TierBasedPermission().get_agent_tier_access(self.request)
        qs = super().get_queryset()

        matter_id = self.request.query_params.get('matter_id')
        if matter_id:
            qs = qs.filter(matter_id=matter_id)

        # Filter by matter tier (inherit from matter)
        return qs.filter(matter__data_tier__in=allowed_tiers)


class DocumentViewSet(viewsets.ModelViewSet):
    queryset = Document.objects.all()
    serializer_class = DocumentSerializer
    permission_classes = [permissions.IsAuthenticated, DocumentReadOnlyForTier0, TierBasedPermission]

    def get_queryset(self):
        allowed_tiers = TierBasedPermission().get_agent_tier_access(self.request)
        return super().get_queryset().filter(data_tier__in=allowed_tiers)

    @action(detail=False, methods=['post'])
    def upload(self, request):
        """Handle document upload to S3/R2."""
        if 'file' not in request.FILES:
            return Response(
                {'error': 'No file provided'},
                status=status.HTTP_400_BAD_REQUEST
            )

        file_obj = request.FILES['file']
        matter_id = request.data.get('matter')
        data_tier = request.data.get('data_tier', 'Tier-2')

        # Generate file path: matters/{matter_id}/filename
        file_path = f"matters/{matter_id}/{file_obj.name}"

        # Upload to R2
        storage_client = get_storage_client()
        uploaded_path = storage_client.upload_file(
            file_obj,
            file_path,
            mime_type=file_obj.content_type
        )

        if not uploaded_path:
            return Response(
                {'error': 'File upload failed'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        # Create Document record
        document = Document.objects.create(
            matter_id=matter_id,
            title=request.data.get('title', file_obj.name),
            document_type=request.data.get('document_type', 'other'),
            data_tier=data_tier,
            file_path=uploaded_path,
            file_size=file_obj.size,
            mime_type=file_obj.content_type,
            created_by=request.user
        )

        return Response(
            DocumentSerializer(document).data,
            status=status.HTTP_201_CREATED
        )


class TaskViewSet(viewsets.ModelViewSet):
    queryset = Task.objects.all()
    serializer_class = TaskSerializer
    permission_classes = [permissions.IsAuthenticated, TaskAssignmentPermission, TierBasedPermission]

    def get_queryset(self):
        allowed_tiers = TierBasedPermission().get_agent_tier_access(self.request)
        return super().get_queryset().filter(matter__data_tier__in=allowed_tiers)

    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        """Mark task as complete."""
        task = self.get_object()
        task.status = 'complete'
        task.save()
        return Response({'status': 'task completed'})


class WebhookEventViewSet(viewsets.ReadOnlyModelViewSet):
    """Read-only access to webhook events for auditing and debugging."""
    queryset = WebhookEvent.objects.all()
    serializer_class = WebhookEventSerializer
    permission_classes = [permissions.IsAuthenticated]


class WebhookSubscriptionViewSet(viewsets.ModelViewSet):
    """Manage webhook subscriptions."""
    queryset = WebhookSubscription.objects.all()
    serializer_class = WebhookSubscriptionSerializer
    permission_classes = [permissions.IsAuthenticated, permissions.IsAdminUser]


# Webhook event handlers
@receiver(post_save, sender=Matter)
def handle_matter_created(sender, instance, created, **kwargs):
    """Fire webhook when matter is created."""
    if created:
        webhook = WebhookEvent.objects.create(
            event_type='matter.created',
            payload={
                'matter_id': instance.id,
                'title': instance.title,
                'status': instance.status,
                'data_tier': instance.data_tier,
            }
        )
        deliver_webhook(webhook)


@receiver(post_save, sender=Event)
def handle_event_pattern_flagged(sender, instance, **kwargs):
    """Fire webhook when pattern is flagged."""
    if instance.pattern_flagged:
        webhook = WebhookEvent.objects.create(
            event_type='event.pattern_flagged',
            payload={
                'event_id': instance.id,
                'matter_id': instance.matter.id,
                'pattern_description': instance.pattern_description,
            }
        )
        deliver_webhook(webhook)
