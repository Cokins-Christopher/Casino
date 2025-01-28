from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone
from django.db.models import Sum
from datetime import timedelta

class CustomUser(AbstractUser):
    email = models.EmailField(unique=True)
    balance = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)  # Added balance field
    last_spin = models.DateTimeField(null=True, blank=True)  # Allow null values for first-time users

    def __str__(self):
        return self.username

class Transaction(models.Model):
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE)  # Correct reference to CustomUser
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    timestamp = models.DateTimeField(auto_now_add=True)

    @staticmethod
    def get_top_earners(period):
        # Define the time range based on the period
        time_filter = {
            'day': timezone.now() - timedelta(days=1),
            'week': timezone.now() - timedelta(weeks=1),
            'month': timezone.now() - timedelta(days=30)
        }
        return (
            Transaction.objects.filter(timestamp__gte=time_filter[period])
            .values('user__username')  # Use 'user__username' for CustomUser
            .annotate(total_earnings=Sum('amount'))  # Calculate total earnings
            .order_by('-total_earnings')[:10]  # Get top 10 earners
        )
