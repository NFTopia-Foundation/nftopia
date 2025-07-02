from django.core.management.base import BaseCommand
from sms_notifications.models import CarrierCompliance

class Command(BaseCommand):
    help = 'Setup initial carrier compliance rules'

    def handle(self, *args, **options):
        # Common carrier compliance rules
        compliance_rules = [
            {
                'carrier_name': 'Verizon',
                'country_code': 'US',
                'max_message_length': 160,
                'supports_unicode': True,
                'restricted_keywords': ['STOP', 'CANCEL', 'UNSUBSCRIBE'],
                'opt_out_required': True,
            },
            {
                'carrier_name': 'AT&T',
                'country_code': 'US',
                'max_message_length': 160,
                'supports_unicode': True,
                'restricted_keywords': ['STOP', 'CANCEL', 'UNSUBSCRIBE'],
                'opt_out_required': True,
            },
            {
                'carrier_name': 'T-Mobile',
                'country_code': 'US',
                'max_message_length': 160,
                'supports_unicode': True,
                'restricted_keywords': ['STOP', 'CANCEL', 'UNSUBSCRIBE'],
                'opt_out_required': True,
            },
            {
                'carrier_name': 'Sprint',
                'country_code': 'US',
                'max_message_length': 160,
                'supports_unicode': True,
                'restricted_keywords': ['STOP', 'CANCEL', 'UNSUBSCRIBE'],
                'opt_out_required': True,
            },
            # International carriers
            {
                'carrier_name': 'Vodafone',
                'country_code': 'GB',
                'max_message_length': 160,
                'supports_unicode': True,
                'restricted_keywords': ['STOP'],
                'opt_out_required': True,
            },
            {
                'carrier_name': 'O2',
                'country_code': 'GB',
                'max_message_length': 160,
                'supports_unicode': True,
                'restricted_keywords': ['STOP'],
                'opt_out_required': True,
            },
        ]

        created_count = 0
        for rule in compliance_rules:
            compliance, created = CarrierCompliance.objects.get_or_create(
                carrier_name=rule['carrier_name'],
                country_code=rule['country_code'],
                defaults=rule
            )
            if created:
                created_count += 1
                self.stdout.write(
                    self.style.SUCCESS(
                        f'Created compliance rule for {rule["carrier_name"]} ({rule["country_code"]})'
                    )
                )

        self.stdout.write(
            self.style.SUCCESS(f'Successfully created {created_count} carrier compliance rules')
        )
