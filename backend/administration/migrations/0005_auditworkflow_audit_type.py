from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('administration', '0004_crypto_tokens_and_chain'),
    ]

    operations = [
        migrations.AddField(
            model_name='auditworkflow',
            name='audit_type',
            field=models.CharField(
                choices=[('standard', 'Standard'), ('advanced', 'Advanced')],
                default='standard',
                max_length=20,
            ),
        ),
    ]