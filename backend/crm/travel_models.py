import uuid
from django.db import models, transaction


REVISION_RETENTION_LIMIT = 20


class TravelExperience(models.Model):
    slug = models.SlugField(unique=True)
    published = models.BooleanField(default=False)
    featured = models.BooleanField(default=True)
    region = models.CharField(max_length=30, choices=[(v, v) for v in ['Europa', 'África', 'Ásia', 'Médio Oriente', 'Américas']])
    styles = models.JSONField(default=list, help_text='List of tags: Romance, Família, Cultura, Praia, Aventura, Compras, Iconic Trips')
    hero = models.URLField(help_text='HTTPS photograph URL')
    detail_hero = models.URLField(blank=True, help_text='Optional wide hero for the experience page. The discovery card keeps its own photograph.')
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
        return {key: getattr(self, key) for key in ('slug', 'featured', 'region', 'styles', 'hero', 'detail_hero', 'gallery', 'nights', 'departure', 'pt', 'en')} | {'revision': str(self.revision)}

    def save(self, *args, **kwargs):
        changed = True
        if self.pk:
            previous = TravelExperience.objects.filter(pk=self.pk).first()
            changed = previous is None or previous._snapshot() != self._snapshot()
        if changed:
            self.revision = uuid.uuid4()
        with transaction.atomic():
            super().save(*args, **kwargs)
            if self.published and (changed or not TravelExperienceRevision.objects.filter(id=self.revision).exists()):
                TravelExperienceRevision.objects.create(id=self.revision, experience=self, content=self.content())
                self._prune_revisions()

    def _snapshot(self):
        return {key: value for key, value in self.content().items() if key != 'revision'}

    def _prune_revisions(self):
        from .models import Lead
        keep = set(
            TravelExperienceRevision.objects.filter(experience=self)
            .order_by('-created_at')
            .values_list('id', flat=True)[:REVISION_RETENTION_LIMIT]
        )
        referenced = set()
        for value in Lead.objects.values_list('experience_snapshot__revision', flat=True):
            try:
                referenced.add(uuid.UUID(str(value)))
            except (ValueError, AttributeError, TypeError):
                continue
        TravelExperienceRevision.objects.filter(experience=self).exclude(id__in=keep | referenced).delete()


class TravelExperienceRevision(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    experience = models.ForeignKey(TravelExperience, on_delete=models.PROTECT)
    content = models.JSONField()
    created_at = models.DateTimeField(auto_now_add=True)


