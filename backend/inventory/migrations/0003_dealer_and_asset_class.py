import django.db.models.deletion
from django.db import migrations, models
from django.utils.text import slugify


def migrate_dealer_strings(apps, schema_editor):
    Holding = apps.get_model('inventory', 'Holding')
    Dealer = apps.get_model('administration', 'Dealer')
    cache: dict[str, object] = {}
    for holding in Holding.objects.exclude(dealer_old='').exclude(dealer_old__isnull=True):
        name = (holding.dealer_old or '').strip()
        if not name:
            continue
        if name not in cache:
            slug_base = slugify(name) or 'dealer'
            slug = slug_base
            counter = 1
            while Dealer.objects.filter(slug=slug).exists():
                slug = f'{slug_base}-{counter}'
                counter += 1
            cache[name] = Dealer.objects.create(name=name, slug=slug)
        holding.dealer = cache[name]
        holding.save(update_fields=['dealer'])


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('administration', '0003_dealer_and_asset_class'),
        ('inventory', '0002_holding_asset_category_holding_asset_class_and_more'),
    ]

    operations = [
        migrations.RenameField(
            model_name='holding',
            old_name='dealer',
            new_name='dealer_old',
        ),
        migrations.AddField(
            model_name='holding',
            name='dealer',
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='holdings',
                to='administration.dealer',
            ),
        ),
        migrations.RunPython(migrate_dealer_strings, noop),
        migrations.RemoveField(
            model_name='holding',
            name='dealer_old',
        ),
    ]