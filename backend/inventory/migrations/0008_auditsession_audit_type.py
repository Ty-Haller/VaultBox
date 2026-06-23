from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('inventory', '0007_holding_storage_audit_current_count'),
    ]

    operations = [
        migrations.AddField(
            model_name='auditsession',
            name='audit_type',
            field=models.CharField(
                choices=[('standard', 'Standard'), ('advanced', 'Advanced')],
                default='standard',
                max_length=20,
            ),
        ),
    ]