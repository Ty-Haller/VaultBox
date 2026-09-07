import logging

from django.http import FileResponse
from rest_framework import status
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView

from .auth_mixins import AdminWriteMixin
from .backup_config import get_backup_schedule, get_rclone_config, save_backup_schedule, save_rclone_config
from .backup_service import (
    backup_root,
    create_backup,
    delete_backup,
    get_backup_file_path,
    restore_backup,
    restore_uploaded_backup,
    test_rclone_remote,
)
from .models import BackupRecord
from .serializers import BackupRecordSerializer

logger = logging.getLogger(__name__)

class DemoBackupsDisabledMixin:
    def initial(self, request, *args, **kwargs):
        from public_demo.flags import enabled as public_demo_enabled
        if public_demo_enabled() and request.method not in ('GET', 'HEAD', 'OPTIONS'):
            raise PermissionDenied('Backups are disabled on the public demo.')
        return super().initial(request, *args, **kwargs)


class BackupListCreateView(DemoBackupsDisabledMixin, AdminWriteMixin, APIView):
    def get(self, request):
        records = BackupRecord.objects.exclude(trigger='pre_restore').order_by('-created_at')[:100]
        return Response(BackupRecordSerializer(records, many=True).data)

    def post(self, request):
        include_media = request.data.get('includeMedia', True)
        encrypt = bool(request.data.get('encrypt'))
        password = request.data.get('password') or None
        upload_rclone = bool(request.data.get('uploadToRclone'))
        remote_id = request.data.get('remoteId')
        try:
            record = create_backup(
                trigger='manual',
                include_media=include_media,
                encrypt=encrypt,
                password=password,
                upload_rclone=upload_rclone,
                remote_id=remote_id,
            )
            return Response(BackupRecordSerializer(record).data, status=status.HTTP_201_CREATED)
        except ValueError as exc:
            return Response({'error': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception:
            logger.exception('Backup create failed')
            return Response({'error': 'Backup failed'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class BackupDetailView(DemoBackupsDisabledMixin, AdminWriteMixin, APIView):
    def delete(self, request, backup_id):
        if not delete_backup(backup_id):
            return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
        return Response(status=status.HTTP_204_NO_CONTENT)


class BackupDownloadView(DemoBackupsDisabledMixin, AdminWriteMixin, APIView):
    def get(self, request, backup_id):
        path = get_backup_file_path(backup_id)
        if not path:
            return Response({'error': 'Not found'}, status=status.HTTP_404_NOT_FOUND)
        handle = path.open('rb')
        response = FileResponse(handle, as_attachment=True, filename=path.name)
        response._resource_closers.append(handle.close)
        return response


class BackupRestoreView(DemoBackupsDisabledMixin, AdminWriteMixin, APIView):
    def post(self, request, backup_id):
        if request.data.get('confirm') != 'RESTORE':
            return Response({'error': 'Confirmation required'}, status=status.HTTP_400_BAD_REQUEST)
        password = request.data.get('password') or None
        try:
            record = restore_backup(backup_id, password=password)
            return Response({
                'restored': True,
                'backupId': str(record.id),
                'restartRequired': True,
                'message': 'Restore complete. Restart the VaultBox server to reload the database.',
            })
        except ValueError as exc:
            return Response({'error': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception:
            logger.exception('Backup restore failed')
            return Response({'error': 'Restore failed'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class BackupUploadRestoreView(DemoBackupsDisabledMixin, AdminWriteMixin, APIView):
    def post(self, request):
        uploaded = request.FILES.get('file')
        confirm = request.POST.get('confirm') or request.data.get('confirm')
        password = request.POST.get('password') or request.data.get('password') or None

        if confirm != 'RESTORE':
            return Response({'error': 'Confirmation required'}, status=status.HTTP_400_BAD_REQUEST)
        if not uploaded:
            return Response({'error': 'Backup file required'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            restore_uploaded_backup(uploaded, password=password)
            return Response({
                'restored': True,
                'backupId': None,
                'restartRequired': True,
                'message': 'Restore complete. Restart the VaultBox server to reload the database.',
            })
        except ValueError as exc:
            return Response({'error': str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception:
            logger.exception('Uploaded backup restore failed')
            return Response({'error': 'Restore failed'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class BackupScheduleView(DemoBackupsDisabledMixin, AdminWriteMixin, APIView):
    def get(self, request):
        from .backup_config import get_backup_schedule_internal
        data = get_backup_schedule()
        data['hasEncryptionSecret'] = bool(get_backup_schedule_internal().get('encryptionSecret'))
        return Response(data)

    def patch(self, request):
        from .backup_config import get_backup_schedule_internal
        try:
            data = save_backup_schedule(
                request.data,
                encryption_password=request.data.get('encryptionPassword'),
            )
            data['hasEncryptionSecret'] = bool(get_backup_schedule_internal().get('encryptionSecret'))
            return Response(data)
        except ValueError as exc:
            return Response({'error': str(exc)}, status=status.HTTP_400_BAD_REQUEST)


class BackupRcloneView(DemoBackupsDisabledMixin, AdminWriteMixin, APIView):
    def get(self, request):
        return Response(get_rclone_config())

    def patch(self, request):
        return Response(save_rclone_config(request.data))


class BackupRcloneTestView(DemoBackupsDisabledMixin, AdminWriteMixin, APIView):
    def post(self, request):
        remote_id = request.data.get('remoteId')
        if not remote_id:
            return Response({'error': 'remoteId required'}, status=status.HTTP_400_BAD_REQUEST)
        ok, _err = test_rclone_remote(remote_id)
        return Response({'ok': ok, 'error': None if ok else 'rclone test failed'})


class BackupStorageInfoView(DemoBackupsDisabledMixin, AdminWriteMixin, APIView):
    def get(self, request):
        root = backup_root()
        total_size = sum(f.stat().st_size for f in root.glob('*') if f.is_file())
        return Response({
            'path': str(root),
            'totalSizeBytes': total_size,
            'fileCount': len(list(root.glob('*'))),
        })