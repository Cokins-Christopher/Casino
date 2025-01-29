from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone
from django.db.models import Sum
from datetime import timedelta
from django.utils.timezone import now

class CustomUser(AbstractUser):
    email = models.EmailField(unique=True)
    balance = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)  # Added balance field
    last_spin = models.DateTimeField(null=True, blank=True)  # Allow null values for first-time users

    def __str__(self):
        return self.username

class Transaction(models.Model):
    TRANSACTION_TYPES = [
        ("win", "Win"),
        ("purchase", "Purchase"),
    ]

    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    transaction_type = models.CharField(max_length=10, choices=TRANSACTION_TYPES, default="win")  # ✅ Set default
    timestamp = models.DateTimeField(auto_now_add=True)

    @staticmethod
    def get_top_winners(period):
        time_filter = {
            "day": timezone.now() - timedelta(days=1),
            "week": timezone.now() - timedelta(weeks=1),
            "month": timezone.now() - timedelta(days=30),
        }

        return (
            Transaction.objects.filter(transaction_type="win", timestamp__gte=time_filter[period])  # ✅ Only count winnings
            .values("user__username")
            .annotate(total_winnings=Sum("amount"))
            .order_by("-total_winnings")[:10]  # ✅ Get top 10 winners
        )
    

class BlackjackGame(models.Model):
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE)
    deck = models.JSONField(default=list)  # Stores remaining deck
    player_hands = models.JSONField(default=dict)  # Player hands per betting spot
    dealer_hand = models.JSONField(default=list)  # Dealer's hand
    bets = models.JSONField(default=dict)  # Bet amounts per spot
    current_spot = models.CharField(max_length=20, null=True, blank=True)  # Track current hand
    created_at = models.DateTimeField(default=now)

    def __str__(self):
        return f"Blackjack Game - {self.user.username} ({self.created_at})"