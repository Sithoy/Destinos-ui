"""Published travel inspiration and immutable versions used by enquiries."""
from .travel_models import TravelExperience
from django import forms
from django.forms import ModelForm
from django.contrib import admin
from rest_framework import permissions
from rest_framework.response import Response
from rest_framework.views import APIView


TEXT_KEYS = ('title', 'destination', 'intro', 'suited', 'price', 'travelInfo')
LIST_KEYS = ('highlights', 'itinerary', 'included', 'excluded', 'options')


class ExperienceForm(ModelForm):
    class Meta:
        model = TravelExperience
        exclude = ('pt', 'en')

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        for language in ('pt', 'en'):
            content = getattr(self.instance, language, {}) or {}
            for key in TEXT_KEYS + LIST_KEYS:
                field = f'{language}_{key}'
                value = content.get(key, [] if key in LIST_KEYS else '')
                self.fields[field].initial = '\n'.join(value) if key in LIST_KEYS else value

    def clean(self):
        data = super().clean()
        for language in ('pt', 'en'):
            content = {}
            for key in TEXT_KEYS + LIST_KEYS:
                value = data.get(f'{language}_{key}', '')
                content[key] = [line.strip() for line in value.splitlines() if line.strip()] if key in LIST_KEYS else value
            setattr(self.instance, language, content)
        for field in ('styles', 'gallery'):
            if not isinstance(data.get(field, []), list) or not all(isinstance(v, str) for v in data.get(field, [])):
                self.add_error(field, 'Enter a list of text values.')
        if not str(data.get('hero', '')).startswith('https://'):
            self.add_error('hero', 'Use an HTTPS image URL.')
        if isinstance(data.get('gallery'), list) and any(not isinstance(v, str) or not v.startswith('https://') for v in data['gallery']):
            self.add_error('gallery', 'Use HTTPS image URLs.')
        if not data.get('nights'):
            self.add_error('nights', 'Specify at least one night.')
        return data


for language in ('pt', 'en'):
    for key in TEXT_KEYS + LIST_KEYS:
        ExperienceForm.base_fields[f'{language}_{key}'] = forms.CharField(
            label=f'{language.upper()} · {key}',
            widget=forms.Textarea(attrs={'rows': 4}) if key in LIST_KEYS or key in ('intro', 'travelInfo') else forms.TextInput(attrs={'size': 80}),
            help_text='One item per line.' if key in LIST_KEYS else '',
        )


@admin.register(TravelExperience)
class TravelExperienceAdmin(admin.ModelAdmin):
    form = ExperienceForm
    list_display = ('slug', 'region', 'nights', 'published', 'featured', 'updated_at')
    list_filter = ('published', 'featured', 'region')
    search_fields = ('slug',)
    readonly_fields = ('revision', 'updated_at')
    fieldsets = (
        ('Publication', {'fields': ('slug', 'published', 'featured', 'region', 'styles', 'nights', 'departure')}),
        ('Photography', {'fields': ('hero', 'gallery')}),
        ('Português', {'fields': tuple(f'pt_{key}' for key in TEXT_KEYS + LIST_KEYS)}),
        ('English', {'fields': tuple(f'en_{key}' for key in TEXT_KEYS + LIST_KEYS)}),
        ('Version', {'fields': ('revision', 'updated_at')}),
    )


class PublicExperiencesView(APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def get(self, request, slug=None):
        query = TravelExperience.objects.filter(published=True).order_by('slug')
        if slug:
            item = query.filter(slug=slug).first()
            return Response(item.content() if item else {'detail': 'Not found.'}, status=200 if item else 404)
        return Response([item.content() for item in query])
