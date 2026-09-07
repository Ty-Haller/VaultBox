from __future__ import annotations

import logging
import secrets

from django.contrib.auth import login
from django.contrib.auth.models import User
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import UserGlobalRole, UserSiteRole, UserVaultRole, VaultBoxRole
from accounts import webauthn_service
from administration.models import UserProfile
from inventory.models import Site, Vault

from .flags import enabled
from .state import status_payload

logger = logging.getLogger(__name__)

AUTH_BACKEND = 'django.contrib.auth.backends.ModelBackend'


def _unavailable():
    return Response({'error': 'Public demo is not enabled'}, status=404)


class DemoStatusView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        return Response(status_payload())


class DemoSessionView(APIView):
    """Sign in as the seeded Full Admin without a passkey. Public demo only."""

    permission_classes = [AllowAny]

    def post(self, request):
        if not enabled():
            return _unavailable()
        user = User.objects.filter(username='admin', is_active=True).first()
        if user is None:
            return Response({'error': 'Demo admin is not configured'}, status=503)
        login(request, user, backend=AUTH_BACKEND)
        return Response({'ok': True, 'username': user.username})


def _grant_viewer(user: User) -> None:
    UserGlobalRole.objects.update_or_create(
        user=user,
        defaults={'role': VaultBoxRole.VIEWER},
    )
    for site in Site.objects.all():
        UserSiteRole.objects.get_or_create(
            user=user, site=site, defaults={'role': VaultBoxRole.VIEWER},
        )
    for vault in Vault.objects.all():
        UserVaultRole.objects.get_or_create(
            user=user, vault=vault, defaults={'role': VaultBoxRole.VIEWER},
        )


class DemoPasskeyRegisterBeginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        if not enabled():
            return _unavailable()
        username = f'demo-{secrets.token_hex(4)}'
        while User.objects.filter(username=username).exists():
            username = f'demo-{secrets.token_hex(4)}'
        user = User.objects.create_user(username=username, email='')
        user.set_unusable_password()
        user.save()
        profile, _ = UserProfile.objects.get_or_create(user=user)
        profile.display_name = username
        profile.save(update_fields=['display_name'])
        _grant_viewer(user)
        options = webauthn_service.registration_options(request, user)
        request.session['demo_reg_user_id'] = user.pk
        request.session.modified = True
        return Response({
            'options': options,
            'username': user.username,
        })


class DemoPasskeyRegisterFinishView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        if not enabled():
            return _unavailable()
        user_id = request.session.get('demo_reg_user_id')
        if not user_id:
            return Response({'error': 'Registration session expired'}, status=400)
        user = User.objects.filter(pk=user_id, is_active=True).first()
        if user is None:
            return Response({'error': 'Registration session expired'}, status=400)
        credential = request.data.get('credential')
        name = request.data.get('name', 'Demo passkey')
        if not credential:
            return Response({'error': 'Credential required'}, status=400)
        try:
            webauthn_service.verify_registration(request, user, credential, name)
            login(request, user, backend=AUTH_BACKEND)
        except Exception:
            logger.exception('Demo passkey registration failed')
            return Response({'error': 'Passkey verification failed'}, status=400)
        request.session.pop('demo_reg_user_id', None)
        return Response({'ok': True, 'username': user.username})
