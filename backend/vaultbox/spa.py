"""Serve the Vite production build for non-API routes."""

from django.conf import settings
from django.http import FileResponse, HttpResponse


def index(request, path=None):
    index_path = settings.FRONTEND_DIST / 'index.html'
    if not index_path.is_file():
        return HttpResponse(
            'VaultBox UI is not built. Use npm run dev, or the Docker image.',
            status=503,
            content_type='text/plain',
        )
    response = FileResponse(index_path.open('rb'), content_type='text/html; charset=utf-8')
    response['Cache-Control'] = 'no-cache'
    return response
