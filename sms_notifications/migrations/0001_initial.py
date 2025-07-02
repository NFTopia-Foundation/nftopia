# Generated migration file
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import uuid

class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='CarrierCompliance',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('carrier_name', models.CharField(max_length=100)),
                ('country_code', models.CharField(max_length=5)),
                ('max_message_length', models.IntegerField(default=160)),
                ('supports_unicode', models.BooleanField(default=True)),
                ('restricted_keywords', models.JSONField(default=list)),
                ('opt_out_required', models.BooleanField(default=True)),
            ],
            options={
                'unique_together': {('carrier_name', 'country_code')},
            },
        ),
        migrations.CreateModel(
            name='SMSRateLimit',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('hour_window', models.DateTimeField()),
                ('sms_count', models.IntegerField(default=0)),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'unique_together': {('user', 'hour_window')},
            },
        ),
        migrations.CreateModel(
            name='SMSNotification',
            fields=[
                ('id', models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ('phone_number', models.CharField(max_length=20)),
                ('message', models.TextField()),
                ('notification_type', models.CharField(choices=[('bid_alert', 'Bid Alert'), ('auction_alert', 'Auction Alert'), ('two_factor_auth', 'Two Factor Authentication'), ('transaction_confirmation', 'Transaction Confirmation')], max_length=50)),
                ('status', models.CharField(choices=[('pending', 'Pending'), ('sent', 'Sent'), ('delivered', 'Delivered'), ('failed', 'Failed'), ('undelivered', 'Undelivered')], default='pending', max_length=20)),
                ('twilio_sid', models.CharField(blank=True, max_length=100, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('sent_at', models.DateTimeField(blank=True, null=True)),
                ('delivered_at', models.DateTimeField(blank=True, null=True)),
                ('error_message', models.TextField(blank=True, null=True)),
                ('nft_id', models.CharField(blank=True, max_length=100, null=True)),
                ('auction_id', models.CharField(blank=True, max_length=100, null=True)),
                ('bid_amount', models.DecimalField(blank=True, decimal_places=8, max_digits=20, null=True)),
                ('transaction_hash', models.CharField(blank=True, max_length=100, null=True)),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='sms_notifications', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
        migrations.AddIndex(
            model_name='smsnotification',
            index=models.Index(fields=['user', 'created_at'], name='sms_notifications_smsnotification_user_id_created_at_idx'),
        ),
        migrations.AddIndex(
            model_name='smsnotification',
            index=models.Index(fields=['status'], name='sms_notifications_smsnotification_status_idx'),
        ),
        migrations.AddIndex(
            model_name='smsnotification',
            index=models.Index(fields=['notification_type'], name='sms_notifications_smsnotification_notification_type_idx'),
        ),
        migrations.AddIndex(
            model_name='smsratelimit',
            index=models.Index(fields=['user', 'hour_window'], name='sms_notifications_smsratelimit_user_id_hour_window_idx'),
        ),
    ]
