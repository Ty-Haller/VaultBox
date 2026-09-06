from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0003_oauthstate_link_user'),
    ]

    operations = [
        migrations.AddField(
            model_name='passkeycredential',
            name='rp_id',
            field=models.CharField(db_index=True, default='localhost', max_length=253),
        ),
    ]
