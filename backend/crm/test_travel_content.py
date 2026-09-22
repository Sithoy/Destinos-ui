import copy
import uuid
from rest_framework.test import APITestCase
from .models import Lead, TravelExperience, TravelExperienceRevision
from .travel_content import ExperienceForm, TEXT_KEYS, LIST_KEYS


class TravelContentTests(APITestCase):
    def test_public_visibility_and_detail(self):
        item = TravelExperience.objects.get(slug='paris-essencial')
        self.assertEqual(self.client.get('/api/public/experiences/').data[0]['slug'], item.slug)
        self.assertEqual(self.client.get(f'/api/public/experiences/{item.slug}/').status_code, 200)
        item.published = False
        item.save()
        self.assertEqual(self.client.get('/api/public/experiences/').data, [])
        self.assertEqual(self.client.get(f'/api/public/experiences/{item.slug}/').status_code, 404)

    def test_original_version_survives_edit_and_retry(self):
        item = TravelExperience.objects.get(slug='paris-essencial')
        original = copy.deepcopy(item.content())
        payload = {'service': 'Classic travel', 'serviceKey': 'classic', 'name': 'Example', 'email': 'test@example.com', 'experienceRevision': str(item.revision), 'submissionId': str(uuid.uuid4()), 'notes': 'Requested nights: 7\nHotel category: 4 stars\nOptional experiences: Disneyland'}
        item.nights = 9
        item.pt['title'] = 'Changed title'
        item.save()
        response = self.client.post('/api/public/leads/', payload, format='json')
        self.assertEqual(response.status_code, 201, response.data)
        lead = Lead.objects.get(pk=response.data['id'])
        self.assertEqual(lead.experience_snapshot, original)
        self.assertIn('Requested nights: 7', lead.notes)
        item.published = False
        item.save()
        retry = self.client.post('/api/public/leads/', payload, format='json')
        self.assertEqual(retry.status_code, 200)
        self.assertEqual(Lead.objects.count(), 1)
        self.assertEqual(TravelExperienceRevision.objects.filter(experience=item).count(), 2)
        payload['notes'] = 'Different request'
        self.assertEqual(self.client.post('/api/public/leads/', payload, format='json').status_code, 409)

    def test_invalid_version_does_not_create_lead(self):
        response = self.client.post('/api/public/leads/', {'service': 'Classic', 'serviceKey': 'classic', 'name': 'Test', 'email': 'test@example.com', 'experienceRevision': str(uuid.uuid4())}, format='json')
        self.assertEqual(response.status_code, 400)
        self.assertFalse(Lead.objects.exists())

    def test_editor_saves_plain_text_fields_and_new_revision(self):
        item = TravelExperience.objects.get(slug='paris-essencial')
        original_revision = item.revision
        data = {key: getattr(item, key) for key in ('slug', 'published', 'featured', 'region', 'styles', 'hero', 'gallery', 'nights', 'departure')}
        for language in ('pt', 'en'):
            for key in TEXT_KEYS + LIST_KEYS:
                value = getattr(item, language)[key]
                data[f'{language}_{key}'] = '\n'.join(value) if key in LIST_KEYS else value
        data['pt_title'] = 'Paris ao seu ritmo'
        form = ExperienceForm(data, instance=item)
        self.assertTrue(form.is_valid(), form.errors)
        saved = form.save()
        self.assertEqual(saved.pt['title'], 'Paris ao seu ritmo')
        self.assertNotEqual(saved.revision, original_revision)
