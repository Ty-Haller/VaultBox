from rest_framework.response import Response
from rest_framework.views import APIView

from .auth_mixins import AdminWriteMixin
from .site_config import get_site_config, save_site_config


class SiteConfigView(AdminWriteMixin, APIView):
    def get(self, request):
        return Response(get_site_config(request))

    def patch(self, request):
        try:
            return Response(save_site_config(request.data, request))
        except ValueError as exc:
            return Response({'error': str(exc)}, status=400)