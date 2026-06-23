from rest_framework.response import Response
from rest_framework.views import APIView

from .auth_mixins import AdminWriteMixin
from .sso_config import get_sso_config, save_sso_config


class SsoConfigView(AdminWriteMixin, APIView):
    def get(self, request):
        return Response(get_sso_config(request))

    def patch(self, request):
        return Response(save_sso_config(request.data, request))