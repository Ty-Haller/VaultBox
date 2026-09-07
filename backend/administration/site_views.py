from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.stale_passkeys import StalePasskeyError, purge_stale_passkeys, stale_passkey_summary

from .auth_mixins import AdminWriteMixin, UserAdminMixin
from .site_config import get_site_config, save_site_config


class SiteConfigView(AdminWriteMixin, APIView):
    def get(self, request):
        return Response(get_site_config(request))

    def patch(self, request):
        from public_demo.flags import enabled as public_demo_enabled
        if public_demo_enabled() and (
            'hostname' in request.data or 'useHttps' in request.data
        ):
            return Response(
                {'error': 'Hostname and HTTPS cannot be changed on the public demo.'},
                status=403,
            )
        try:
            return Response(save_site_config(request.data, request))
        except ValueError as exc:
            return Response({'error': str(exc)}, status=400)


class StalePasskeyView(UserAdminMixin, APIView):
    """List / delete passkeys bound to a previous WebAuthn RP ID."""

    def get(self, request):
        return Response(stale_passkey_summary(request))

    def post(self, request):
        confirm = str(request.data.get('confirm') or '').strip()
        if confirm != 'PURGE':
            return Response({'error': 'Type PURGE (all caps) to confirm.'}, status=400)
        try:
            return Response(purge_stale_passkeys(request))
        except StalePasskeyError as exc:
            return Response({'error': str(exc)}, status=400)