from django.contrib import admin
from .models import Person, Organization, Matter, Event, Document, Task, WebhookEvent

@admin.register(Person)
class PersonAdmin(admin.ModelAdmin):
    list_display = ('role', 'organization', 'data_tier', 'created_at')
    list_filter = ('role', 'data_tier', 'created_at')
    search_fields = ('role', 'organization__name')

@admin.register(Organization)
class OrganizationAdmin(admin.ModelAdmin):
    list_display = ('name', 'organization_type', 'jurisdiction')
    list_filter = ('organization_type',)

@admin.register(Matter)
class MatterAdmin(admin.ModelAdmin):
    list_display = ('title', 'status', 'data_tier', 'approved_for_research', 'created_at')
    list_filter = ('status', 'data_tier', 'approved_for_research', 'created_at')
    search_fields = ('title', 'description')

@admin.register(Event)
class EventAdmin(admin.ModelAdmin):
    list_display = ('event_type', 'matter', 'pattern_flagged', 'event_date')
    list_filter = ('event_type', 'pattern_flagged', 'event_date')

@admin.register(Document)
class DocumentAdmin(admin.ModelAdmin):
    list_display = ('title', 'document_type', 'matter', 'data_tier', 'uploaded_at')
    list_filter = ('document_type', 'data_tier', 'uploaded_at')

@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = ('title', 'status', 'matter', 'due_date')
    list_filter = ('status', 'due_date')

@admin.register(WebhookEvent)
class WebhookEventAdmin(admin.ModelAdmin):
    list_display = ('event_type', 'delivery_status', 'sent_at')
    list_filter = ('event_type', 'delivery_status', 'sent_at')
