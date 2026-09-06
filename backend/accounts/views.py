from django.contrib.auth import login, logout
from django.contrib.auth.models import User
from django.middleware.csrf import get_token
from django.shortcuts import redirect
from django.views.decorators.csrf import ensure_csrf_cookie
from rest_framework import status, viewsets
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from administration.models import UserProfile
from .access import get_user_access
from .authentication import CsrfExemptSessionAuthentication
from .models import ApiToken, OAuthState, PasskeyCredential, UserGlobalRole, UserSiteRole, UserVaultRole, VaultBoxRole
from .oauth_service import (
    complete_oauth_flow,
    get_providers,
    list_user_oauth_identities,
    start_oauth_flow,
    unlink_oauth_identity,
)
from .permissions import IsAuthenticatedUser, IsFullAdmin
from .serializers import (
    ApiTokenCreateSerializer,
    ApiTokenSerializer,
    PasskeySerializer,
    UserPreferencesSerializer,
    UserSiteRoleSerializer,
    UserVaultRoleSerializer,
)
from . import webauthn_service


class AuthMeView(APIView):
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [IsAuthenticatedUser]

    def get(self, request):
        user = request.user
        profile, _ = UserProfile.objects.get_or_create(user=user)
        access = get_user_access(user)
        passkey_count = webauthn_service.passkeys_for_rp(request, user).count()
        return Response({
            'id': user.pk,
            'username': user.username,
            'email': user.email,
            'displayName': profile.display_name or user.username,
            'phone': profile.phone,
            'theme': profile.theme,
            'hasPasskey': passkey_count > 0,
            'passkeyCount': passkey_count,
            'permissions': access.to_dict(),
        })


@api_view(['GET'])
@permission_classes([AllowAny])
@ensure_csrf_cookie
def csrf_token_view(request):
    return Response({'csrfToken': get_token(request)})


class PasskeyLoginBeginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        username = request.data.get('username', '').strip()
        if not username:
            return Response({'error': 'Username required'}, status=400)
        user = User.objects.filter(username=username, is_active=True).first()
        if not user or not webauthn_service.passkeys_for_rp(request, user).exists():
            return Response({'error': 'No passkey registered for this user on this host'}, status=404)
        options = webauthn_service.authentication_options(request, username)
        return Response(options)


class PasskeyLoginFinishView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        credential = request.data.get('credential')
        if not credential:
            return Response({'error': 'Credential required'}, status=400)
        try:
            user = webauthn_service.verify_authentication(request, credential)
        except Exception as exc:
            return Response({'error': str(exc)}, status=400)
        login(request, user)
        return Response({'ok': True, 'username': user.username})


class PasskeyRegisterBeginView(APIView):
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [IsAuthenticatedUser]

    def post(self, request):
        options = webauthn_service.registration_options(request, request.user)
        return Response(options)


class PasskeyRegisterFinishView(APIView):
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [IsAuthenticatedUser]

    def post(self, request):
        credential = request.data.get('credential')
        name = request.data.get('name', 'Passkey')
        if not credential:
            return Response({'error': 'Credential required'}, status=400)
        try:
            pk = webauthn_service.verify_registration(request, request.user, credential, name)
        except Exception as exc:
            return Response({'error': str(exc)}, status=400)
        from administration.notification_hooks import notify_passkey_added
        notify_passkey_added(request.user, name)
        return Response(PasskeySerializer(pk).data, status=201)


def _bootstrap_user() -> User | None:
    user = User.objects.filter(username='admin', is_active=True).first()
    if user:
        return user
    return User.objects.filter(is_active=True).order_by('date_joined').first()


def _bootstrap_reason(request) -> str | None:
    """Bootstrap is allowed when this host/RP ID has no passkeys yet."""
    if webauthn_service.passkeys_for_rp(request).exists():
        return None
    if PasskeyCredential.objects.exists():
        return 'rp_id_change'
    return 'first_boot'


class BootstrapPasskeyBeginView(APIView):
    """First-time setup, or re-enroll admin after the WebAuthn RP ID/hostname changes."""
    permission_classes = [AllowAny]

    def post(self, request):
        reason = _bootstrap_reason(request)
        if not reason:
            return Response({'error': 'Bootstrap not available'}, status=403)
        user = _bootstrap_user()
        if not user:
            return Response({'error': 'No users configured'}, status=404)
        options = webauthn_service.registration_options(request, user)
        return Response({
            'options': options,
            'username': user.username,
            'reason': reason,
            'rpId': webauthn_service.current_rp_id(request),
        })


class BootstrapPasskeyFinishView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        if not _bootstrap_reason(request):
            return Response({'error': 'Bootstrap not available'}, status=403)
        user = _bootstrap_user()
        if not user:
            return Response({'error': 'No users configured'}, status=404)
        credential = request.data.get('credential')
        name = request.data.get('name', 'Admin Passkey')
        try:
            webauthn_service.verify_registration(request, user, credential, name)
            UserGlobalRole.objects.get_or_create(user=user, defaults={'role': VaultBoxRole.FULL_ADMIN})
            profile, _ = UserProfile.objects.get_or_create(user=user)
            profile.is_admin = True
            profile.save(update_fields=['is_admin'])
            login(request, user)
        except Exception as exc:
            return Response({'error': str(exc)}, status=400)
        return Response({'ok': True, 'username': user.username})


class LogoutView(APIView):
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [IsAuthenticatedUser]

    def post(self, request):
        logout(request)
        return Response({'ok': True})


class OAuthProvidersView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        return Response(get_providers(request))


class OAuthLoginView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, provider):
        redirect_after = request.query_params.get('next', '/')
        try:
            auth_url, _ = start_oauth_flow(provider, redirect_after, request)
        except ValueError as exc:
            return Response({'error': str(exc)}, status=400)
        return redirect(auth_url)


class OAuthLinkView(APIView):
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [IsAuthenticatedUser]

    def get(self, request, provider):
        redirect_after = request.query_params.get('next', '/settings')
        try:
            auth_url, _ = start_oauth_flow(
                provider,
                redirect_after,
                request,
                link_user=request.user,
            )
        except ValueError as exc:
            return Response({'error': str(exc)}, status=400)
        return redirect(auth_url)


class OAuthIdentitiesView(APIView):
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [IsAuthenticatedUser]

    def get(self, request):
        return Response(list_user_oauth_identities(request.user, request))


class OAuthIdentityDetailView(APIView):
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [IsAuthenticatedUser]

    def delete(self, request, identity_id):
        if not unlink_oauth_identity(request.user, identity_id):
            return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
        return Response(status=status.HTTP_204_NO_CONTENT)


class OAuthCallbackView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, provider):
        from django.conf import settings
        from urllib.parse import quote

        code = request.query_params.get('code')
        state = request.query_params.get('state')
        if not code or not state:
            return Response({'error': 'Missing code or state'}, status=400)

        oauth_state = OAuthState.objects.filter(state=state, provider=provider).first()
        is_link = bool(oauth_state and oauth_state.link_user_id)
        fallback_path = oauth_state.redirect_after if oauth_state and oauth_state.redirect_after else '/settings'
        from administration.site_config import get_frontend_base_url
        base = get_frontend_base_url(request).rstrip('/')

        try:
            result = complete_oauth_flow(provider, code, state, request)
        except Exception as exc:
            if is_link:
                path = fallback_path if fallback_path.startswith('/') else f'/{fallback_path}'
                sep = '&' if '?' in path else '?'
                return redirect(f'{base}{path}{sep}oauth_error={quote(str(exc))}')
            return redirect(f'{base}/login?oauth_error={quote(str(exc))}')

        path = result.redirect_after if result.redirect_after.startswith('/') else f'/{result.redirect_after}'
        if result.mode == 'link':
            sep = '&' if '?' in path else '?'
            return redirect(f'{base}{path}{sep}oauth_linked=1')

        if result.mode == 'pending':
            return redirect(f'{base}/login?sso_pending=1')

        if not result.user or not result.user.is_active:
            return redirect(f'{base}/login?sso_pending=1')

        login(request, result.user)
        return redirect(base + path)


class PasskeyViewSet(viewsets.ModelViewSet):
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [IsAuthenticatedUser]
    serializer_class = PasskeySerializer
    pagination_class = None

    def get_queryset(self):
        return PasskeyCredential.objects.filter(user=self.request.user)

    def perform_destroy(self, instance):
        from .passkey_policy import validate_passkey_deletion
        validate_passkey_deletion(instance)
        from administration.notification_hooks import notify_passkey_removed
        name = instance.name
        user = self.request.user
        instance.delete()
        notify_passkey_removed(user, name)


class ApiTokenViewSet(viewsets.ModelViewSet):
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [IsAuthenticatedUser]
    serializer_class = ApiTokenSerializer
    pagination_class = None

    def get_queryset(self):
        return ApiToken.objects.filter(user=self.request.user)

    def create(self, request, *args, **kwargs):
        ser = ApiTokenCreateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        raw, prefix, token_hash = ApiToken.generate_token()
        token = ApiToken.objects.create(
            user=request.user,
            name=ser.validated_data['name'],
            token_hash=token_hash,
            prefix=prefix,
        )
        data = ApiTokenSerializer(token).data
        data['token'] = raw
        return Response(data, status=status.HTTP_201_CREATED)

    def perform_destroy(self, instance):
        instance.is_active = False
        instance.save(update_fields=['is_active'])


class UserSettingsView(APIView):
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [IsAuthenticatedUser]

    def get(self, request):
        profile, _ = UserProfile.objects.get_or_create(user=request.user)
        return Response({
            'theme': profile.theme,
            'displayName': profile.display_name,
            'phone': profile.phone,
            'email': request.user.email,
        })

    def patch(self, request):
        ser = UserPreferencesSerializer(data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        profile, _ = UserProfile.objects.get_or_create(user=request.user)
        user = request.user
        if 'theme' in ser.validated_data:
            profile.theme = ser.validated_data['theme']
        if 'displayName' in ser.validated_data:
            profile.display_name = ser.validated_data['displayName']
        if 'phone' in ser.validated_data:
            profile.phone = ser.validated_data['phone']
        if 'email' in ser.validated_data:
            user.email = ser.validated_data['email']
            user.save(update_fields=['email'])
        profile.save()
        return Response({
            'theme': profile.theme,
            'displayName': profile.display_name,
            'phone': profile.phone,
            'email': user.email,
        })


class RoleAssignmentViewSet(viewsets.ViewSet):
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [IsFullAdmin]

    def retrieve(self, request, user_id=None):
        user = User.objects.get(pk=user_id)
        global_role = getattr(getattr(user, 'global_role', None), 'role', None)
        site_roles = UserSiteRoleSerializer(user.site_roles.select_related('site').all(), many=True).data
        vault_roles = UserVaultRoleSerializer(user.vault_roles.select_related('vault').all(), many=True).data
        return Response({
            'userId': user.pk,
            'globalRole': global_role,
            'siteRoles': site_roles,
            'vaultRoles': vault_roles,
        })

    def update(self, request, user_id=None):
        user = User.objects.get(pk=user_id)
        global_role = request.data.get('globalRole')
        if global_role:
            UserGlobalRole.objects.update_or_create(user=user, defaults={'role': global_role})
        elif global_role == '' or global_role is None:
            UserGlobalRole.objects.filter(user=user).delete()

        site_roles = request.data.get('siteRoles', [])
        UserSiteRole.objects.filter(user=user).delete()
        for entry in site_roles:
            UserSiteRole.objects.create(
                user=user, site_id=entry['siteId'], role=entry['role'],
            )

        vault_roles = request.data.get('vaultRoles', [])
        UserVaultRole.objects.filter(user=user).delete()
        for entry in vault_roles:
            UserVaultRole.objects.create(
                user=user, vault_id=entry['vaultId'], role=entry['role'],
            )

        return self.retrieve(request, user_id)