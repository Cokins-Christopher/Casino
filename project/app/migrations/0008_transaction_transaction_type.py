# Generated by Django 5.1.5 on 2025-01-29 03:28

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('app', '0007_delete_spinrecord'),
    ]

    operations = [
        migrations.AddField(
            model_name='transaction',
            name='transaction_type',
            field=models.CharField(choices=[('win', 'Win'), ('purchase', 'Purchase')], default='win', max_length=10),
        ),
    ]
