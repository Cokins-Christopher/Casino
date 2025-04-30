"""
Stub model classes that satisfy import requirements for tests
but don't actually create database tables.
"""
from django.db import models
from .models import CustomUser

class Wallet(models.Model):
    """Stub wallet model for tests"""
    user = models.OneToOneField(CustomUser, on_delete=models.CASCADE)
    balance = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    
    class Meta:
        managed = False  # Prevents table creation
    
    def __str__(self):
        return f"Wallet for {self.user.username}: ${self.balance}"
    
    def add_funds(self, amount):
        self.balance += amount
        return self.balance
    
    def remove_funds(self, amount):
        if amount > self.balance:
            raise ValueError("Insufficient funds")
        self.balance -= amount
        return self.balance

class Game(models.Model):
    """Stub game model for tests"""
    GAME_TYPES = [
        ('blackjack', 'Blackjack'),
        ('roulette', 'Roulette'),
        ('slots', 'Slots'),
    ]
    
    GAME_STATES = [
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
    ]
    
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE)
    game_type = models.CharField(max_length=20, choices=GAME_TYPES)
    bet_amount = models.DecimalField(max_digits=10, decimal_places=2)
    result = models.CharField(max_length=20, null=True, blank=True)
    payout_amount = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    state = models.CharField(max_length=20, choices=GAME_STATES, default='in_progress')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        managed = False  # Prevents table creation
    
    def __str__(self):
        return f"{self.game_type} Game #{self.id} by {self.user.username}"

class GameRound(models.Model):
    """Stub game round model for tests"""
    game = models.ForeignKey(Game, on_delete=models.CASCADE, related_name='rounds')
    round_number = models.IntegerField()
    player_action = models.CharField(max_length=20)
    result = models.CharField(max_length=20, null=True, blank=True)
    
    class Meta:
        managed = False  # Prevents table creation
    
    def __str__(self):
        return f"Round {self.round_number} of Game #{self.game.id}"

class Card(models.Model):
    """Stub card model for tests"""
    SUITS = [
        ('hearts', '♥'),
        ('diamonds', '♦'),
        ('clubs', '♣'),
        ('spades', '♠'),
    ]
    
    RANKS = [
        ('2', '2'), ('3', '3'), ('4', '4'), ('5', '5'), ('6', '6'),
        ('7', '7'), ('8', '8'), ('9', '9'), ('10', '10'),
        ('J', 'Jack'), ('Q', 'Queen'), ('K', 'King'), ('A', 'Ace')
    ]
    
    suit = models.CharField(max_length=10, choices=SUITS)
    rank = models.CharField(max_length=2, choices=RANKS)
    
    class Meta:
        managed = False  # Prevents table creation
    
    def __str__(self):
        return f"{self.get_rank_display()} of {self.get_suit_display()}"

class Deck(models.Model):
    """Stub deck model for tests"""
    cards = models.JSONField(default=list)
    
    class Meta:
        managed = False  # Prevents table creation
    
    def __str__(self):
        return f"Deck with {len(self.cards)} cards"
    
    def shuffle(self):
        """Shuffle the deck"""
        import random
        random.shuffle(self.cards)
    
    def draw_card(self):
        """Draw a card from the deck"""
        if not self.cards:
            raise ValueError("Deck is empty")
        return self.cards.pop()

class Hand(models.Model):
    """Stub hand model for tests"""
    cards = models.JSONField(default=list)
    
    class Meta:
        managed = False  # Prevents table creation
    
    def __str__(self):
        return f"Hand with {len(self.cards)} cards"
    
    def add_card(self, card):
        """Add a card to the hand"""
        self.cards.append(card)
    
    def get_score(self):
        """Calculate the score of the hand"""
        from .utils import calculate_hand_value
        return calculate_hand_value(self.cards)
    
    def is_blackjack(self):
        """Check if the hand is a blackjack"""
        from .utils import is_blackjack
        return is_blackjack(self.cards)
    
    def is_bust(self):
        """Check if the hand is bust"""
        return self.get_score() > 21 