import uuid
from django.db import migrations


def seed(apps, schema_editor):
    Experience = apps.get_model('crm', 'TravelExperience')
    Revision = apps.get_model('crm', 'TravelExperienceRevision')
    content = {
        'slug': 'paris-essencial', 'featured': True, 'region': 'Europa',
        'styles': ['Romance', 'Cultura', 'Iconic Trips'], 'nights': 5, 'departure': '',
        'hero': 'https://images.pexels.com/photos/338515/pexels-photo-338515.jpeg?auto=compress&cs=tinysrgb&w=1600',
        'gallery': ['https://images.pexels.com/photos/532826/pexels-photo-532826.jpeg?auto=compress&cs=tinysrgb&w=1200'],
        'pt': {
            'title': 'Paris Essencial', 'destination': 'Paris · França',
            'intro': 'Uma primeira vez inesquecível. Manhãs entre arte e cafés, passeios sem pressa e a cidade a iluminar-se junto ao Sena. Cinco noites para descobrir Paris ao seu ritmo.',
            'highlights': ['Torre Eiffel', 'Louvre', 'Sena'],
            'suited': 'Para uma primeira visita, uma escapadinha a dois ou amantes de arte e cultura.',
            'price': 'Sob consulta',
            'itinerary': [
                'Chegada e primeiros passos — Instale-se e descubra os cafés e ruas do seu bairro.',
                'A Paris que imaginou — Passeio junto à Torre Eiffel e tempo para os jardins e esplanadas.',
                'Arte e grandes histórias — Reserve tempo para o Louvre e um passeio pelas Tuileries.',
                'A cidade vista do Sena — Um passeio à beira-rio, com opção de cruzeiro ao entardecer.',
                'Um dia que é seu — Montmartre, compras ou uma experiência opcional à sua escolha.',
                'Até à próxima, Paris — Pequeno-almoço sem pressa e preparação para o regresso.',
            ],
            'included': ['Proposta de alojamento para 5 noites, na categoria que escolher', 'Planeamento de um itinerário personalizado'],
            'excluded': ['Voos, entradas, refeições, transfers e seguro, salvo indicação na proposta final', 'Despesas pessoais e documentação de viagem'],
            'options': ['Um dia na Disneyland Paris', 'Cruzeiro no Sena', 'Visita guiada ao Louvre', 'Mais noites ou uma categoria de hotel superior'],
            'travelInfo': 'A documentação necessária depende da nacionalidade e do percurso. A equipa confirma os requisitos aplicáveis durante a preparação da proposta.',
        },
        'en': {
            'title': 'Essential Paris', 'destination': 'Paris · France',
            'intro': 'An unforgettable first visit. Mornings of art and cafés, unhurried walks and the city lighting up beside the Seine. Five nights to discover Paris at your own pace.',
            'highlights': ['Eiffel Tower', 'Louvre', 'Seine'],
            'suited': 'For a first visit, a romantic escape or lovers of art and culture.',
            'price': 'On request',
            'itinerary': [
                'Arrival and first impressions — Settle in and explore your neighbourhood cafés and streets.',
                'The Paris you imagined — Walk near the Eiffel Tower, with time for gardens and terraces.',
                'Art and great stories — Make time for the Louvre and a walk through the Tuileries.',
                'Paris from the Seine — A riverside walk, with an optional sunset cruise.',
                'A day of your own — Montmartre, shopping or an optional experience of your choice.',
                'Until next time, Paris — A leisurely breakfast before your journey home.',
            ],
            'included': ['A proposal for 5 nights of accommodation in your chosen category', 'Personalised itinerary planning'],
            'excluded': ['Flights, admission, meals, transfers and insurance unless specified in the final proposal', 'Personal expenses and travel documents'],
            'options': ['A day at Disneyland Paris', 'Seine cruise', 'Guided Louvre visit', 'Extra nights or a hotel upgrade'],
            'travelInfo': 'Required documents depend on your nationality and route. Our team confirms the applicable requirements while preparing your proposal.',
        },
    }
    revision = uuid.uuid4()
    item, created = Experience.objects.get_or_create(slug=content['slug'], defaults={**content, 'published': True, 'revision': revision})
    if created:
        Revision.objects.create(id=revision, experience=item, content={**content, 'revision': str(revision)})


class Migration(migrations.Migration):
    dependencies = [('crm', '0011_travelexperience_lead_experience_snapshot_and_more')]
    operations = [migrations.RunPython(seed, migrations.RunPython.noop)]
