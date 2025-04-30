from django.test import TestCase
from django.contrib.auth import get_user_model
from decimal import Decimal
from ..models import CustomUser, Transaction, BlackjackGame

User = get_user_model()

class BasicModelTests(TestCase):
    """Simple tests for existing models"""
    
    def setUp(self):
        # Create test user
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='password123'
        )
    
    def test_user_model(self):
        """Test the user model works"""
        self.assertEqual(self.user.username, 'testuser')
        self.assertEqual(self.user.email, 'test@example.com')
        self.assertEqual(self.user.balance, Decimal('0.00'))  # Default balance
        
    def test_transaction_model(self):
        """Test the transaction model works"""
        transaction = Transaction.objects.create(
            user=self.user,
            amount=Decimal('100.00'),
            transaction_type='win'
        )
        
        self.assertEqual(transaction.user, self.user)
        self.assertEqual(transaction.amount, Decimal('100.00'))
        self.assertEqual(transaction.transaction_type, 'win')
        
    def test_blackjack_model(self):
        """Test the blackjack model works"""
        game = BlackjackGame.objects.create(
            user=self.user,
            deck=['AH', '2S', '3C'],
            player_hands={'spot1': [['JD', 'QH']]},
            dealer_hand=['KS', '5D'],
            bets={'spot1': 50.00}
        )
        
        self.assertEqual(game.user, self.user)
        self.assertEqual(len(game.deck), 3)
        self.assertEqual(len(game.player_hands['spot1'][0]), 2)
        self.assertEqual(len(game.dealer_hand), 2) 