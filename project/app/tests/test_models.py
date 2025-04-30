from django.test import TestCase
from django.contrib.auth import get_user_model
from decimal import Decimal
import json
from ..models import CustomUser, BlackjackGame, Transaction
from ..mock_models import Wallet, Game, GameRound, Card, Deck, Hand
from django.utils import timezone
from datetime import timedelta

User = get_user_model()

class CustomUserModelTest(TestCase):
    """Tests for the CustomUser model"""
    
    def setUp(self):
        self.user_data = {
            'username': 'testuser',
            'email': 'test@example.com',
            'password': 'securepassword123'
        }
        
        self.user = User.objects.create_user(
            username=self.user_data['username'],
            email=self.user_data['email'],
            password=self.user_data['password']
        )
    
    def test_user_creation(self):
        """Test user creation with basic attributes"""
        self.assertEqual(self.user.username, self.user_data['username'])
        self.assertEqual(self.user.email, self.user_data['email'])
        self.assertTrue(self.user.check_password(self.user_data['password']))
        
        # Default values
        self.assertFalse(self.user.is_staff)
        self.assertFalse(self.user.is_superuser)
        self.assertTrue(self.user.is_active)
        self.assertEqual(self.user.balance, Decimal('0.00'))  # Default balance
    
    def test_user_string_representation(self):
        """Test the string representation of a user"""
        self.assertEqual(str(self.user), self.user_data['username'])
    
    def test_user_with_custom_attributes(self):
        """Test user creation with custom attributes"""
        admin_user = User.objects.create_user(
            username='adminuser',
            email='admin@example.com',
            password='adminpassword',
            is_staff=True,
            is_superuser=True,
            balance=Decimal('500.00')
        )
        
        self.assertEqual(admin_user.username, 'adminuser')
        self.assertTrue(admin_user.is_staff)
        self.assertTrue(admin_user.is_superuser)
        self.assertEqual(admin_user.balance, Decimal('500.00'))
    
    def test_superuser_creation(self):
        """Test superuser creation method"""
        superuser = User.objects.create_superuser(
            username='superadmin',
            email='super@example.com',
            password='superpassword'
        )
        
        self.assertTrue(superuser.is_staff)
        self.assertTrue(superuser.is_superuser)
        self.assertTrue(superuser.is_active)

class WalletModelTest(TestCase):
    """Tests for the Wallet model"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='walletuser',
            email='wallet@example.com',
            password='securepassword123'
        )
        
        self.wallet = Wallet.objects.create(
            user=self.user,
            balance=Decimal('1000.00')
        )
    
    def test_wallet_creation(self):
        """Test wallet creation with initial balance"""
        self.assertEqual(self.wallet.user, self.user)
        self.assertEqual(self.wallet.balance, Decimal('1000.00'))
    
    def test_wallet_string_representation(self):
        """Test the string representation of a wallet"""
        expected_str = f"Wallet for {self.user.username}: $1000.00"
        self.assertEqual(str(self.wallet), expected_str)
    
    def test_wallet_can_add_funds(self):
        """Test adding funds to a wallet"""
        old_balance = self.wallet.balance
        self.wallet.add_funds(Decimal('500.00'))
        self.assertEqual(self.wallet.balance, old_balance + Decimal('500.00'))
    
    def test_wallet_can_remove_funds(self):
        """Test removing funds from a wallet"""
        old_balance = self.wallet.balance
        self.wallet.remove_funds(Decimal('500.00'))
        self.assertEqual(self.wallet.balance, old_balance - Decimal('500.00'))
    
    def test_wallet_cannot_remove_more_than_balance(self):
        """Test that removing more funds than balance fails"""
        with self.assertRaises(ValueError):
            self.wallet.remove_funds(Decimal('2000.00'))

class TransactionModelTest(TestCase):
    """Tests for the Transaction model"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='transactionuser',
            email='transaction@example.com',
            password='securepassword123'
        )
        
        self.transaction = Transaction.objects.create(
            user=self.user,
            amount=Decimal('100.00'),
            transaction_type='win'
        )
    
    def test_transaction_creation(self):
        """Test transaction creation with basic attributes"""
        self.assertEqual(self.transaction.user, self.user)
        self.assertEqual(self.transaction.amount, Decimal('100.00'))
        self.assertEqual(self.transaction.transaction_type, 'win')
        self.assertIsNotNone(self.transaction.timestamp)
    
    def test_transaction_string_representation(self):
        """Test the string representation of a transaction"""
        # Adjust this based on your actual __str__ implementation
        self.assertTrue(isinstance(str(self.transaction), str))
        self.assertIn(self.user.username, str(self.transaction))
        self.assertIn('100.00', str(self.transaction))
    
    def test_top_winners(self):
        """Test the get_top_winners method"""
        # Create multiple transactions for different users
        user2 = User.objects.create_user(
            username='user2', 
            email='user2@example.com',
            password='password123'
        )
        
        user3 = User.objects.create_user(
            username='user3',
            email='user3@example.com',
            password='password123'
        )
        
        # Create win transactions
        Transaction.objects.create(user=self.user, amount=Decimal('200.00'), transaction_type='win')
        Transaction.objects.create(user=user2, amount=Decimal('150.00'), transaction_type='win')
        Transaction.objects.create(user=user3, amount=Decimal('300.00'), transaction_type='win')
        
        # Test the top winners function
        top_winners = Transaction.get_top_winners('day')
        
        self.assertEqual(len(top_winners), 3)  # Should have 3 winners
        
        # The first winner should be user3 with the highest amount
        self.assertEqual(top_winners[0]['user__username'], user3.username)
        
        # Verify the total winnings for the users
        for winner in top_winners:
            if winner['user__username'] == self.user.username:
                self.assertEqual(winner['total_winnings'], Decimal('300.00'))  # 100 + 200
            elif winner['user__username'] == user2.username:
                self.assertEqual(winner['total_winnings'], Decimal('150.00'))
            elif winner['user__username'] == user3.username:
                self.assertEqual(winner['total_winnings'], Decimal('300.00'))

class GameModelTest(TestCase):
    """Tests for the Game model"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='gameuser',
            email='game@example.com',
            password='securepassword123'
        )
        
        self.game = Game.objects.create(
            user=self.user,
            game_type='blackjack',
            bet_amount=Decimal('50.00'),
            state='in_progress'
        )
    
    def test_game_creation(self):
        """Test game creation with basic attributes"""
        self.assertEqual(self.game.user, self.user)
        self.assertEqual(self.game.game_type, 'blackjack')
        self.assertEqual(self.game.bet_amount, Decimal('50.00'))
        self.assertEqual(self.game.state, 'in_progress')
        self.assertIsNotNone(self.game.created_at)
        self.assertIsNotNone(self.game.updated_at)
    
    def test_game_string_representation(self):
        """Test the string representation of a game"""
        expected_str = f"Blackjack Game #{self.game.id} by {self.user.username}"
        self.assertEqual(str(self.game), expected_str)
    
    def test_game_completion(self):
        """Test updating game to completed state"""
        self.game.state = 'completed'
        self.game.result = 'player_won'
        self.game.payout_amount = Decimal('100.00')
        self.game.save()
        
        updated_game = Game.objects.get(id=self.game.id)
        self.assertEqual(updated_game.state, 'completed')
        self.assertEqual(updated_game.result, 'player_won')
        self.assertEqual(updated_game.payout_amount, Decimal('100.00'))

class BlackjackGameModelTest(TestCase):
    """Tests for the BlackjackGame model"""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='bjuser',
            email='bj@example.com',
            password='securepassword123'
        )
        
        self.blackjack_game = BlackjackGame.objects.create(
            user=self.user,
            deck=['2H', '3H', '4H'],
            player_hands={'spot1': [['AH', 'JD']]},
            dealer_hand=['KS', '3C'],
            bets={'spot1': 50.0},
            current_spot='spot1'
        )
    
    def test_blackjack_game_creation(self):
        """Test blackjack game creation with basic attributes"""
        self.assertEqual(self.blackjack_game.user, self.user)
        self.assertEqual(self.blackjack_game.deck, ['2H', '3H', '4H'])
        self.assertEqual(self.blackjack_game.player_hands, {'spot1': [['AH', 'JD']]})
        self.assertEqual(self.blackjack_game.dealer_hand, ['KS', '3C'])
        self.assertEqual(self.blackjack_game.bets, {'spot1': 50.0})
        self.assertEqual(self.blackjack_game.current_spot, 'spot1')
    
    def test_blackjack_game_string_representation(self):
        """Test the string representation of a blackjack game"""
        self.assertTrue(isinstance(str(self.blackjack_game), str))
        self.assertIn(self.user.username, str(self.blackjack_game))

class DeckModelTest(TestCase):
    """Tests for the Deck model"""
    
    def setUp(self):
        self.deck = Deck.objects.create()
    
    def test_deck_creation(self):
        """Test deck creation with default cards"""
        self.assertEqual(len(json.loads(self.deck.cards)), 52)  # Standard deck
    
    def test_deck_string_representation(self):
        """Test the string representation of a deck"""
        expected_str = f"Deck #{self.deck.id} with {len(json.loads(self.deck.cards))} cards"
        self.assertEqual(str(self.deck), expected_str)
    
    def test_deck_shuffle(self):
        """Test shuffling a deck"""
        original_order = json.loads(self.deck.cards)
        self.deck.shuffle()
        new_order = json.loads(self.deck.cards)
        
        # Shuffled deck should have same cards but different order
        self.assertEqual(len(original_order), len(new_order))
        self.assertNotEqual(original_order, new_order)
        
        # Check that all cards are still in the deck
        for card in original_order:
            self.assertIn(card, new_order)
    
    def test_deck_draw_card(self):
        """Test drawing a card from a deck"""
        original_cards = json.loads(self.deck.cards)
        card = self.deck.draw_card()
        
        # Card should be the first card in the original deck
        self.assertEqual(card, original_cards[0])
        
        # Deck should have one less card
        self.assertEqual(len(json.loads(self.deck.cards)), 51)
        
        # The card should no longer be in the deck
        self.assertNotIn(card, json.loads(self.deck.cards))

class HandModelTest(TestCase):
    """Tests for the Hand model"""
    
    def setUp(self):
        self.hand = Hand.objects.create()
        self.deck = Deck.objects.create()
    
    def test_hand_creation(self):
        """Test hand creation with empty cards"""
        self.assertEqual(json.loads(self.hand.cards), [])
        self.assertEqual(self.hand.score, 0)
    
    def test_hand_string_representation(self):
        """Test the string representation of a hand"""
        expected_str = f"Hand #{self.hand.id} with score 0"
        self.assertEqual(str(self.hand), expected_str)
    
    def test_add_card_to_hand(self):
        """Test adding a card to a hand"""
        card = self.deck.draw_card()
        self.hand.add_card(card)
        
        # Hand should have one card
        self.assertEqual(len(json.loads(self.hand.cards)), 1)
        self.assertEqual(json.loads(self.hand.cards)[0], card)
    
    def test_hand_score_calculation(self):
        """Test score calculation for different hands"""
        # Test numeric cards
        numeric_hand = Hand.objects.create()
        numeric_hand.add_card("H2")
        numeric_hand.add_card("D5")
        self.assertEqual(numeric_hand.calculate_score(), 7)
        
        # Test face cards
        face_hand = Hand.objects.create()
        face_hand.add_card("CK")
        face_hand.add_card("SQ")
        self.assertEqual(face_hand.calculate_score(), 20)
        
        # Test aces
        ace_hand = Hand.objects.create()
        ace_hand.add_card("HA")
        ace_hand.add_card("C4")
        self.assertEqual(ace_hand.calculate_score(), 15)  # Ace should be 11
        
        # Test multiple aces
        multi_ace_hand = Hand.objects.create()
        multi_ace_hand.add_card("HA")
        multi_ace_hand.add_card("DA")
        self.assertEqual(multi_ace_hand.calculate_score(), 12)  # One ace should be 1, one ace 11
        
        # Test busting hand with aces
        bust_hand = Hand.objects.create()
        bust_hand.add_card("HA")  # 11
        bust_hand.add_card("C9")  # 9
        self.assertEqual(bust_hand.calculate_score(), 20)
        bust_hand.add_card("D5")  # 5
        self.assertEqual(bust_hand.calculate_score(), 15)  # Ace should now be 1
    
    def test_blackjack_detection(self):
        """Test detecting blackjack (21 with 2 cards)"""
        # Blackjack hand
        blackjack_hand = Hand.objects.create()
        blackjack_hand.add_card("HA")  # 11
        blackjack_hand.add_card("DK")  # 10
        self.assertEqual(blackjack_hand.calculate_score(), 21)
        self.assertTrue(blackjack_hand.is_blackjack())
        
        # 21 with more than 2 cards is not blackjack
        not_blackjack = Hand.objects.create()
        not_blackjack.add_card("H7")  # 7
        not_blackjack.add_card("D7")  # 7
        not_blackjack.add_card("C7")  # 7
        self.assertEqual(not_blackjack.calculate_score(), 21)
        self.assertFalse(not_blackjack.is_blackjack())
    
    def test_bust_detection(self):
        """Test detecting when a hand busts (over 21)"""
        # Busted hand
        bust_hand = Hand.objects.create()
        bust_hand.add_card("HK")  # 10
        bust_hand.add_card("DQ")  # 10
        bust_hand.add_card("C5")  # 5
        self.assertEqual(bust_hand.calculate_score(), 25)
        self.assertTrue(bust_hand.is_bust())
        
        # Non-busted hand
        good_hand = Hand.objects.create()
        good_hand.add_card("H10")  # 10
        good_hand.add_card("D9")   # 9
        self.assertEqual(good_hand.calculate_score(), 19)
        self.assertFalse(good_hand.is_bust()) 