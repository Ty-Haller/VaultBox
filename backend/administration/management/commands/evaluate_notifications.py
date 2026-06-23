from django.core.management.base import BaseCommand

from administration.notification_evaluator import evaluate_all


class Command(BaseCommand):
    help = 'Evaluate scheduled notifications (audit due, capacity, etc.)'

    def handle(self, *args, **options):
        stats = evaluate_all()
        self.stdout.write(self.style.SUCCESS(f'Notification evaluation: {stats}'))