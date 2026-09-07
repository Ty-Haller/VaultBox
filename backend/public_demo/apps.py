from django.apps import AppConfig


class PublicDemoConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'public_demo'
    verbose_name = 'Public demo'

    def ready(self):
        from .scheduler import start_if_needed
        start_if_needed()
