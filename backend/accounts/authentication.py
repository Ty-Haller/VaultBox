import hashlib

from django.contrib.auth.models import User
from rest_framework.authentication import BaseAuthentication, SessionAuthentication
from rest_framework.exceptions import AuthenticationFailed

from .models import ApiToken


class CsrfExemptSessionAuthentication(SessionAuthentication):
    """Session auth for SPA — CSRF handled via X-CSRFToken header."""

    def enforce_csrf(self, request):
        return


class ApiTokenAuthentication(BaseAuthentication):
    keyword = 'Bearer'

    def authenticate(self, request):
        auth = request.META.get('HTTP_AUTHORIZATION', '')
        if not auth.startswith(f'{self.keyword} '):
            return None
        raw = auth[len(self.keyword) + 1:].strip()
        if not raw:
            return None
        token_hash = hashlib.sha256(raw.encode()).hexdigest()
        try:
            token = ApiToken.objects.select_related('user').get(
                token_hash=token_hash, is_active=True,
            )
        except ApiToken.DoesNotExist as exc:
            raise AuthenticationFailed('Invalid API token') from exc
        if not token.user.is_active:
            raise AuthenticationFailed('User account disabled')
        from django.utils import timezone
        token.last_used_at = timezone.now()
        token.save(update_fields=['last_used_at'])
        return token.user, token