from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'persons', views.PersonViewSet)
router.register(r'organizations', views.OrganizationViewSet)
router.register(r'matters', views.MatterViewSet)
router.register(r'events', views.EventViewSet)
router.register(r'documents', views.DocumentViewSet)
router.register(r'tasks', views.TaskViewSet)
router.register(r'webhook-events', views.WebhookEventViewSet)
router.register(r'webhook-subscriptions', views.WebhookSubscriptionViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
