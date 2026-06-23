from django.contrib.auth.models import User
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.authentication import CsrfExemptSessionAuthentication
from accounts.permissions import IsAuthenticatedUser, IsFullAdmin

from .auth_mixins import AdminWriteMixin
from .email_service import save_smtp_config, send_notification_email, smtp_config
from .models import Notification, NotificationOption, RoleNotificationDefault, UserNotificationPreference, UserProfile
from .notification_evaluator import evaluate_all
from .notification_catalog import EVENT_CONFIG_SCOPE, USER_CHANNEL_ONLY_EVENTS
from accounts.access import get_user_access

from .market_alert_config import (
    get_instrument_alert_config,
    get_market_alert_config,
    list_instrument_alert_configs,
    save_instrument_alert_config,
    save_market_alert_config,
)
from .notification_service import (
    clear_notifications,
    dismiss_notification,
    reset_notification_catalog,
    resolve_config,
    seed_role_notification_defaults,
    test_apprise_urls,
    test_user_notifications,
    user_allowed_event_types,
)
from .serializers import (
    NotificationInboxSerializer,
    NotificationOptionSerializer,
    RoleNotificationDefaultSerializer,
    UserNotificationPreferenceSerializer,
)


class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [IsAuthenticatedUser]
    serializer_class = NotificationInboxSerializer
    pagination_class = None

    def get_queryset(self):
        return Notification.objects.filter(
            user=self.request.user, dismissed_at__isnull=True,
        ).order_by('-created_at')[:50]

    @action(detail=True, methods=['post'])
    def dismiss(self, request, pk=None):
        if dismiss_notification(request.user, pk):
            return Response({'status': 'dismissed'})
        return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=False, methods=['post'], url_path='clear')
    def clear_all(self, request):
        n = clear_notifications(request.user)
        return Response({'cleared': n})

    @action(detail=False, methods=['post'], url_path='evaluate')
    def evaluate(self, request):
        stats = evaluate_all()
        return Response(stats)


class UserNotificationPreferencesView(APIView):
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [IsAuthenticatedUser]

    def get(self, request):
        user = request.user
        profile, _ = UserProfile.objects.get_or_create(user=user)
        allowed = sorted(user_allowed_event_types(user))
        system = {o.event_type: o for o in NotificationOption.objects.all()}
        prefs = {p.event_type: p for p in UserNotificationPreference.objects.filter(user=user)}
        events = []
        seen: set[str] = set()
        for event_type in allowed:
            if event_type in seen:
                continue
            seen.add(event_type)
            opt = system.get(event_type)
            pref = prefs.get(event_type)
            cfg = resolve_config(user, event_type)
            scope = EVENT_CONFIG_SCOPE.get(event_type, 'user')
            events.append({
                'eventType': event_type,
                'category': opt.category if opt else 'asset',
                'name': opt.name if opt else event_type,
                'description': opt.description if opt else '',
                'configScope': scope,
                'allowed': True,
                'enabled': cfg.enabled,
                'inApp': cfg.in_app,
                'email': cfg.email,
                'apprise': cfg.apprise,
                'threshold': cfg.threshold if scope == 'user' else None,
                'refireIntervalHours': cfg.refire_interval_hours if scope == 'user' else None,
                'userOverride': UserNotificationPreferenceSerializer(pref).data if pref else None,
            })
        return Response({
            'events': events,
            'appriseUrls': profile.apprise_urls or [],
        })

    def patch(self, request):
        user = request.user
        profile, _ = UserProfile.objects.get_or_create(user=user)
        if 'appriseUrls' in request.data:
            profile.apprise_urls = request.data['appriseUrls'] or []
            profile.save(update_fields=['apprise_urls'])
        prefs_data = request.data.get('preferences', [])
        allowed = user_allowed_event_types(user)
        for item in prefs_data:
            event_type = item.get('eventType')
            if event_type not in allowed:
                continue
            pref, _ = UserNotificationPreference.objects.get_or_create(user=user, event_type=event_type)
            channel_only = event_type in USER_CHANNEL_ONLY_EVENTS
            for field, attr in [
                ('enabled', 'enabled'), ('inApp', 'in_app'), ('email', 'email'),
                ('apprise', 'apprise'),
            ]:
                if field in item:
                    setattr(pref, attr, item[field])
            if not channel_only:
                for field, attr in [
                    ('threshold', 'threshold'),
                    ('refireIntervalHours', 'refire_interval_hours'),
                ]:
                    if field in item:
                        setattr(pref, attr, item[field])
            pref.save()
        return self.get(request)

    def post(self, request):
        action = request.data.get('action')
        if action == 'test-notifications':
            channels = request.data.get('channels')
            if channels is not None and not isinstance(channels, list):
                return Response({'error': 'channels must be a list'}, status=status.HTTP_400_BAD_REQUEST)
            apprise_urls = request.data.get('appriseUrls')
            if apprise_urls is not None and not isinstance(apprise_urls, list):
                return Response({'error': 'appriseUrls must be a list'}, status=status.HTTP_400_BAD_REQUEST)
            return Response(test_user_notifications(
                request.user,
                channels=channels,
                apprise_urls=apprise_urls,
            ))
        if action == 'test-apprise':
            urls = request.data.get('appriseUrls')
            if urls is None:
                profile, _ = UserProfile.objects.get_or_create(user=request.user)
                urls = profile.apprise_urls or []
            if not isinstance(urls, list):
                return Response({'error': 'appriseUrls must be a list'}, status=status.HTTP_400_BAD_REQUEST)
            return Response(test_apprise_urls(urls, request.user.username))
        return Response({'error': 'Unknown action'}, status=status.HTTP_400_BAD_REQUEST)


class RoleNotificationDefaultViewSet(AdminWriteMixin, viewsets.ModelViewSet):
    queryset = RoleNotificationDefault.objects.all()
    serializer_class = RoleNotificationDefaultSerializer
    pagination_class = None


class NotificationDefaultsResetView(APIView):
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [IsFullAdmin]

    def post(self, request):
        kind = request.data.get('kind', 'all')
        result = {}
        if kind in ('all', 'catalog'):
            result['catalog'] = reset_notification_catalog()
        if kind in ('all', 'roles'):
            result['roles'] = seed_role_notification_defaults()
        return Response(result)


class NotificationDeliveryView(APIView):
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [IsFullAdmin]

    def get(self, request):
        cfg = smtp_config()
        return Response({
            'enabled': cfg['enabled'],
            'host': cfg['host'],
            'port': cfg['port'],
            'tls': cfg['tls'],
            'user': cfg['user'],
            'fromEmail': cfg['from_email'],
            'hasPassword': bool(cfg['password']),
        })

    def patch(self, request):
        save_smtp_config(request.data)
        return self.get(request)

    def post(self, request):
        if request.data.get('action') == 'test':
            user = request.user
            ok = send_notification_email(
                user,
                'VaultBox SMTP Test',
                'This is a test notification from VaultBox.',
            )
            return Response({'sent': ok})
        return Response({'error': 'Unknown action'}, status=400)


class MarketAlertConfigView(APIView):
    """Legacy admin global defaults (deprecated — use per-instrument API)."""
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [IsFullAdmin]

    def get(self, request):
        return Response(get_market_alert_config())

    def patch(self, request):
        return Response(save_market_alert_config(request.data))


VALID_INSTRUMENT_TYPES = {'metal', 'crypto', 'stock', 'forex'}


def _instrument_response(instrument_type: str, symbol: str) -> dict:
    config = get_instrument_alert_config(instrument_type, symbol)
    return {'type': instrument_type, 'symbol': symbol, **config}


class MarketAlertsListView(APIView):
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [IsAuthenticatedUser]

    def get(self, request):
        return Response({'instruments': list_instrument_alert_configs()})


class MarketAlertDetailView(APIView):
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [IsAuthenticatedUser]

    def get(self, request, instrument_type, symbol):
        if instrument_type not in VALID_INSTRUMENT_TYPES:
            return Response({'error': 'Invalid instrument type'}, status=status.HTTP_400_BAD_REQUEST)
        return Response(_instrument_response(instrument_type, symbol))

    def patch(self, request, instrument_type, symbol):
        if instrument_type not in VALID_INSTRUMENT_TYPES:
            return Response({'error': 'Invalid instrument type'}, status=status.HTTP_400_BAD_REQUEST)
        access = get_user_access(request.user)
        if not access.can_edit_market_alerts():
            return Response({'detail': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)
        saved = save_instrument_alert_config(instrument_type, symbol, request.data)
        return Response({'type': instrument_type, 'symbol': symbol, **saved})


class NotificationOptionListView(APIView):
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [IsFullAdmin]

    def get(self, request):
        opts = NotificationOption.objects.all()
        return Response(NotificationOptionSerializer(opts, many=True).data)