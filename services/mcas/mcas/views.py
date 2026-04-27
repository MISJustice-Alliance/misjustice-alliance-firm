from rest_framework import viewsets, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models.signals import post_save
from django.dispatch import receiver
import json
from .models import Person, Organization, Matter, Event, Document, Task, WebhookEvent
from .serializers import PersonSerializer, OrganizationSerializer, MatterSerializer, EventSerializer, DocumentSerializer, TaskSerializer


class PersonViewSet(viewsets.ModelViewSet):
    queryset = Person.objects.all()
    serializer_class = PersonSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # TODO: Implement tier-based access control
        return super().get_queryset()


class OrganizationViewSet(viewsets.ModelViewSet):
    queryset = Organization.objects.all()
    serializer_class = OrganizationSerializer
    permission_classes = [permissions.IsAuthenticated]


class MatterViewSet(viewsets.ModelViewSet):
    queryset = Matter.objects.all()
    serializer_class = MatterSerializer
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=True, methods=['post'])
    def approve_for_research(self, request, pk=None):
        """HITL gate: Approve matter for autonomous research."""
        matter = self.get_object()
        matter.approved_for_research = True
        matter.save()
        return Response({'status': 'approved for research'})

    @action(detail=True, methods=['post'])
    def approve_for_publication(self, request, pk=None):
        """HITL gate: Approve matter for public publication."""
        matter = self.get_object()
        matter.approved_for_publication = True
        matter.save()
        return Response({'status': 'approved for publication'})


class EventViewSet(viewsets.ModelViewSet):
    queryset = Event.objects.all()
    serializer_class = EventSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        matter_id = self.request.query_params.get('matter_id')
        if matter_id:
            return Event.objects.filter(matter_id=matter_id)
        return super().get_queryset()


class DocumentViewSet(viewsets.ModelViewSet):
    queryset = Document.objects.all()
    serializer_class = DocumentSerializer
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=False, methods=['post'])
    def upload(self, request):
        """Handle document upload to S3/R2."""
        # TODO: Implement S3/R2 upload handling
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        return Response(serializer.data, status=201)


class TaskViewSet(viewsets.ModelViewSet):
    queryset = Task.objects.all()
    serializer_class = TaskSerializer
    permission_classes = [permissions.IsAuthenticated]

    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        """Mark task as complete."""
        task = self.get_object()
        task.status = 'complete'
        task.save()
        return Response({'status': 'task completed'})


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
        # TODO: Implement webhook delivery to registered subscribers


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
        # TODO: Implement human alert mechanism
