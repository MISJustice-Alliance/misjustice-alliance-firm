from django.urls import path
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'persons', views.PersonViewSet)
router.register(r'organizations', views.OrganizationViewSet)
router.register(r'matters', views.MatterViewSet)
router.register(r'events', views.EventViewSet)
router.register(r'documents', views.DocumentViewSet)
router.register(r'tasks', views.TaskViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
