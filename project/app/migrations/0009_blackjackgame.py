# Generated by Django 5.1.5 on 2025-01-29 04:41

import django.db.models.deletion
import django.utils.timezone
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('app', '0008_transaction_transaction_type'),
    ]

    operations = [
        migrations.CreateModel(
            name='BlackjackGame',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('deck', models.JSONField(default=list)),
                ('player_hands', models.JSONField(default=dict)),
                ('dealer_hand', models.JSONField(default=list)),
                ('bets', models.JSONField(default=dict)),
                ('current_spot', models.CharField(blank=True, max_length=20, null=True)),
                ('created_at', models.DateTimeField(default=django.utils.timezone.now)),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, to=settings.AUTH_USER_MODEL)),
            ],
        ),
    ]
