from django.core.management.base import BaseCommand

from administration.backup_service import run_scheduled_backup


class Command(BaseCommand):
    help = 'Run scheduled VaultBox backup if enabled in admin backup schedule settings.'

    def handle(self, *args, **options):
        from public_demo.flags import enabled as public_demo_enabled
        if public_demo_enabled():
            self.stdout.write('Backups are disabled on the public demo.')
            return
        try:
            record = run_scheduled_backup()
        except Exception as exc:
            self.stderr.write(self.style.ERROR(str(exc)))
            raise SystemExit(1) from exc
        if record is None:
            self.stdout.write('Scheduled backups are disabled.')
            return
        if record.status == 'completed':
            self.stdout.write(self.style.SUCCESS(f'Backup completed: {record.filename}'))
        else:
            self.stderr.write(self.style.ERROR(f'Backup failed: {record.error}'))
            raise SystemExit(1)