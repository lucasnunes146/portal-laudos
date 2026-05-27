from django.core.management.base import BaseCommand
from django.db import transaction


class Command(BaseCommand):
    help = 'Cria dados iniciais: clínica + usuários de exemplo'

    @transaction.atomic
    def handle(self, *args, **options):
        from apps.clinics.models import Clinic, ClinicSettings
        from apps.accounts.models import User

        # Clinic
        clinic, created = Clinic.objects.get_or_create(
            name='Otorrino Sono',
            defaults={
                'cnpj': '00.000.000/0001-00',
                'phone': '(11) 3000-0000',
                'email': 'contato@otorrinosono.com.br',
                'address': 'Rua Exemplo, 123 - São Paulo/SP',
            }
        )
        if created:
            self.stdout.write(f'  Clínica criada: {clinic.name}')
            ClinicSettings.objects.create(
                clinic=clinic,
                portal_title='Portal de Laudos — Otorrino Sono',
                portal_subtitle='Acesse seus laudos com segurança',
                primary_color='#2563EB',
            )

        users = [
            {'username': 'admin', 'password': 'Admin@12345', 'role': 'admin',
             'first_name': 'Admin', 'last_name': 'Sistema', 'email': 'admin@otorrinosono.com.br'},
            {'username': 'secretaria', 'password': 'Secret@12345', 'role': 'secretary',
             'first_name': 'Ana', 'last_name': 'Secretária', 'email': 'secretaria@otorrinosono.com.br'},
            {'username': 'medica', 'password': 'Medica@12345', 'role': 'doctor',
             'first_name': 'Dra. Maria', 'last_name': 'Silva', 'email': 'medica@otorrinosono.com.br'},
        ]

        for u in users:
            if not User.objects.filter(username=u['username']).exists():
                user = User.objects.create_user(
                    username=u['username'],
                    password=u['password'],
                    role=u['role'],
                    first_name=u['first_name'],
                    last_name=u['last_name'],
                    email=u['email'],
                    clinic=clinic,
                    is_staff=(u['role'] == 'admin'),
                    is_superuser=(u['role'] == 'admin'),
                )
                self.stdout.write(f'  Usuário criado: {user.username} ({user.role})')

        # Super admin (owner of the SaaS platform — no clinic)
        if not User.objects.filter(username='superadmin').exists():
            User.objects.create_user(
                username='superadmin',
                password='Super@12345',
                role=User.ROLE_SUPERADMIN,
                first_name='Super',
                last_name='Admin',
                email='superadmin@portal.com',
                clinic=None,
                is_staff=True,
                is_superuser=True,
            )
            self.stdout.write('  Usuário criado: superadmin (superadmin)')

        self.stdout.write(self.style.SUCCESS('\nDados iniciais criados com sucesso!'))
        self.stdout.write('\nCredenciais:')
        self.stdout.write('  Admin:      admin / Admin@12345')
        self.stdout.write('  Secretária: secretaria / Secret@12345')
        self.stdout.write('  Médica:     medica / Medica@12345')
