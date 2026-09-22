import uuid
from django.db import migrations


def update_paris_hero(apps, schema_editor):
    Experience = apps.get_model('crm', 'TravelExperience')
    Revision = apps.get_model('crm', 'TravelExperienceRevision')
    item = Experience.objects.filter(slug='paris-essencial', detail_hero='').first()
    if item is None:
        return
    item.detail_hero = 'https://www.dpmundo.com/images/dpm-paris-triptych.jpg'
    item.revision = uuid.uuid4()
    item.save(update_fields=['detail_hero', 'revision', 'updated_at'])
    if item.published:
        content = {key: getattr(item, key) for key in ('slug', 'featured', 'region', 'styles', 'hero', 'detail_hero', 'gallery', 'nights', 'departure', 'pt', 'en')}
        Revision.objects.create(id=item.revision, experience=item, content={**content, 'revision': str(item.revision)})


class Migration(migrations.Migration):
    dependencies = [('crm', '0013_travelexperience_detail_hero')]
    operations = [migrations.RunPython(update_paris_hero, migrations.RunPython.noop)]
