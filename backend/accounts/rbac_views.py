from django.conf import settings
from django.contrib.auth.models import User
from django.utils import timezone
from django.utils.text import slugify
from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from administration.models import UserProfile

from .access import get_user_access
from .authentication import CsrfExemptSessionAuthentication
from .models import PasskeySetupToken, Role, SignupRequest, UserGlobalRole, VaultBoxRole
from .permissions import CanManageRoles, IsFullAdmin
from .permissions_catalog import PERMISSIONS
from .rbac_serializers import (
    PermissionCatalogSerializer,
    RoleSerializer,
    SignupCreateSerializer,
    SignupRequestSerializer,
    UserGroupSerializer,
)
from .models import UserGroup
from . import webauthn_service


class PermissionCatalogView(APIView):
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [CanManageRoles]

    def get(self, request):
        return Response([{'key': k, 'label': v} for k, v in PERMISSIONS.items()])


class RoleViewSet(viewsets.ModelViewSet):
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [CanManageRoles]
    serializer_class = RoleSerializer
    queryset = Role.objects.all()
    lookup_field = 'id'
    pagination_class = None

    def perform_create(self, serializer):
        name = serializer.validated_data['name']
        slug = slugify(name) or str(serializer.validated_data.get('id', ''))
        base = slug
        n = 1
        while Role.objects.filter(slug=slug).exists():
            slug = f'{base}-{n}'
            n += 1
        serializer.save(slug=slug)

    def perform_destroy(self, instance):
        if instance.is_system:
            from rest_framework.exceptions import ValidationError
            raise ValidationError('System roles cannot be deleted')
        instance.delete()


class UserGroupViewSet(viewsets.ModelViewSet):
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [CanManageRoles]
    serializer_class = UserGroupSerializer
    queryset = UserGroup.objects.select_related('role').prefetch_related('members', 'site_access', 'vault_access')
    lookup_field = 'id'
    pagination_class = None


class SignupRequestViewSet(viewsets.ReadOnlyModelViewSet):
    authentication_classes = [CsrfExemptSessionAuthentication]
    permission_classes = [IsFullAdmin]
    serializer_class = SignupRequestSerializer
    queryset = SignupRequest.objects.select_related('reviewed_by', 'created_user')
    lookup_field = 'id'
    pagination_class = None

    def get_queryset(self):
        qs = super().get_queryset()
        status_filter = self.request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)
        return qs

    @action(detail=True, methods=['post'])
    def approve(self, request, id=None):
        signup = self.get_object()
        if signup.status != SignupRequest.STATUS_PENDING:
            return Response({'error': 'Request already processed'}, status=400)
        if User.objects.filter(username=signup.username).exists():
            return Response({'error': 'Username already taken'}, status=400)

        user = User.objects.create_user(
            username=signup.username,
            email=signup.email,
            is_active=True,
        )
        user.set_unusable_password()
        user.save()
        UserProfile.objects.create(user=user, display_name=signup.display_name or signup.username)

        global_role = request.data.get('globalRole')
        if global_role:
            UserGlobalRole.objects.create(user=user, role=global_role)

        raw, token_hash = PasskeySetupToken.generate()
        token = PasskeySetupToken.objects.create(
            user=user,
            token_hash=token_hash,
            expires_at=timezone.now() + timezone.timedelta(days=7),
        )

        signup.status = SignupRequest.STATUS_APPROVED
        signup.reviewed_by = request.user
        signup.reviewed_at = timezone.now()
        signup.review_notes = request.data.get('reviewNotes', '')
        signup.created_user = user
        signup.save()

        from administration.notification_hooks import notify_user_created
        notify_user_created(user.username, user.id)

        from administration.site_config import get_frontend_base_url
        setup_url = f'{get_frontend_base_url(request).rstrip("/")}/setup-passkey?token={raw}'
        return Response({
            'signup': SignupRequestSerializer(signup).data,
            'setupUrl': setup_url,
            'setupToken': raw,
            'expiresAt': token.expires_at.isoformat(),
        })

    @action(detail=True, methods=['post'])
    def reject(self, request, id=None):
        signup = self.get_object()
        if signup.status != SignupRequest.STATUS_PENDING:
            return Response({'error': 'Request already processed'}, status=400)
        signup.status = SignupRequest.STATUS_REJECTED
        signup.reviewed_by = request.user
        signup.reviewed_at = timezone.now()
        signup.review_notes = request.data.get('reviewNotes', '')
        signup.save()
        return Response(SignupRequestSerializer(signup).data)


class PublicSignupView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        ser = SignupCreateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        data = ser.validated_data
        if User.objects.filter(username=data['username']).exists():
            return Response({'error': 'Username already taken'}, status=400)
        if SignupRequest.objects.filter(username=data['username'], status=SignupRequest.STATUS_PENDING).exists():
            return Response({'error': 'A pending request already exists for this username'}, status=400)
        signup = SignupRequest.objects.create(
            username=data['username'],
            email=data['email'],
            display_name=data.get('displayName', ''),
            message=data.get('message', ''),
        )
        from administration.notification_hooks import notify_signup_request
        notify_signup_request(signup.username, str(signup.id))
        return Response(SignupRequestSerializer(signup).data, status=201)


class SetupPasskeyValidateView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        raw = request.query_params.get('token', '')
        if not raw:
            return Response({'error': 'Token required'}, status=400)
        import hashlib
        token_hash = hashlib.sha256(raw.encode()).hexdigest()
        token = PasskeySetupToken.objects.select_related('user').filter(
            token_hash=token_hash, used_at__isnull=True, expires_at__gt=timezone.now(),
        ).first()
        if not token:
            return Response({'error': 'Invalid or expired token'}, status=400)
        return Response({
            'username': token.user.username,
            'email': token.user.email,
            'valid': True,
        })


class SetupPasskeyBeginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        raw = request.data.get('token', '')
        import hashlib
        token_hash = hashlib.sha256(raw.encode()).hexdigest()
        token = PasskeySetupToken.objects.select_related('user').filter(
            token_hash=token_hash, used_at__isnull=True, expires_at__gt=timezone.now(),
        ).first()
        if not token:
            return Response({'error': 'Invalid or expired token'}, status=400)
        request.session['setup_token_hash'] = token_hash
        options = webauthn_service.registration_options(request, token.user)
        return Response({'options': options, 'username': token.user.username})


class SetupPasskeyFinishView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        raw = request.data.get('token', '')
        credential = request.data.get('credential')
        name = request.data.get('name', 'Passkey')
        import hashlib
        from django.contrib.auth import login
        token_hash = hashlib.sha256(raw.encode()).hexdigest()
        if request.session.get('setup_token_hash') != token_hash:
            return Response({'error': 'Session mismatch'}, status=400)
        token = PasskeySetupToken.objects.select_related('user').filter(
            token_hash=token_hash, used_at__isnull=True, expires_at__gt=timezone.now(),
        ).first()
        if not token:
            return Response({'error': 'Invalid or expired token'}, status=400)
        try:
            webauthn_service.verify_registration(request, token.user, credential, name)
        except Exception as exc:
            return Response({'error': str(exc)}, status=400)
        token.used_at = timezone.now()
        token.save(update_fields=['used_at'])
        request.session.pop('setup_token_hash', None)
        login(request, token.user)
        return Response({'ok': True, 'username': token.user.username})