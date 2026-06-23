from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from administration.notification_views import NotificationViewSet

notification_router = DefaultRouter()
notification_router.register('', NotificationViewSet, basename='notification')

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('accounts.urls')),
    path('api/notifications/', include(notification_router.urls)),
    path('api/', include('inventory.urls')),
    path('api/admin/', include('administration.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)