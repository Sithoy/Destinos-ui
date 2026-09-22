import uuid
from django.db import models, transaction


class TravelExperience(models.Model):
    slug = models.SlugField(unique=True)
    published = models.BooleanField(default=False)
    featured = models.BooleanField(default=True)
    region = models.CharField(max_length=30, choices=[(v, v) for v in ['Europa', 'África', 'Ásia', 'Médio Oriente', 'Américas']])
    styles = models.JSONField(default=list, help_text='List of tags: Romance, Família, Cultura, Praia, Aventura, Compras, Iconic Trips')
    hero = models.URLField(help_text='HTTPS photograph URL')
    gallery = models.JSONField(default=list, blank=True, help_text='List of HTTPS photograph URLs')
    nights = models.PositiveSmallIntegerField(default=5)
    departure = models.CharField(max_length=120, blank=True)
    pt = models.JSONField(help_text='Portuguese content. Use Paris Essencial as a template.')
    en = models.JSONField(help_text='English content. Use Paris Essencial as a template.')
    updated_at = models.DateTimeField(auto_now=True)
    revision = models.UUIDField(default=uuid.uuid4, editable=False)

    def __str__(self):
        return self.pt.get('title', self.slug)

    def content(self):
        return {key: getattr(self, key) for key in ('slug', 'featured', 'region', 'styles', 'hero', 'gallery', 'nights', 'departure', 'pt', 'en')} | {'revision': str(self.revision)}

    def save(self, *args, **kwargs):
        self.revision = uuid.uuid4()
        with transaction.atomic():
            super().save(*args, **kwargs)
            if self.published:
                TravelExperienceRevision.objects.create(id=self.revision, experience=self, content=self.content())


class TravelExperienceRevision(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    experience = models.ForeignKey(TravelExperience, on_delete=models.PROTECT)
    content = models.JSONField()
    created_at = models.DateTimeField(auto_now_add=True)


