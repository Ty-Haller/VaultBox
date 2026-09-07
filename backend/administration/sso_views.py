from rest_framework.response import Response
from rest_framework.views import APIView

from .auth_mixins import AdminWriteMixin
from .sso_config import get_sso_config, save_sso_config


class SsoConfigView(AdminWriteMixin, APIView):
    def get(self, request):
        return Response(get_sso_config(request))

    def patch(self, request):
        from public_demo.flags import enabled as public_demo_enabled
        if public_demo_enabled():
            return Response(
                {'error': 'SSO / OAuth cannot be changed on the public demo.'},
                status=403,
            )
        return Response(save_sso_config(request.data, request))