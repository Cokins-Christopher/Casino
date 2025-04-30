from django.test import TestCase
from django.contrib.auth import get_user_model
from decimal import Decimal
import json
from ..models import (
    CustomUser, Wallet, Transaction, 
    Game, GameRound, Card, BlackjackGame,
    Deck, Hand
)

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
            is_superuser=True
        )
        
        self.assertEqual(admin_user.username, 'adminuser')
        self.assertTrue(admin_user.is_staff)
        self.assertTrue(admin_user.is_superuser)
    
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
        
        self.wallet = Wallet.objects.create(
            user=self.user,
            balance=Decimal('1000.00')
        )
        
        self.transaction = Transaction.objects.create(
            user=self.user,
            amount=Decimal('100.00'),
            transaction_type='deposit',
            payment_method='credit_card',
            status='completed'
        )
    
    def test_transaction_creation(self):
        """Test transaction creation with basic attributes"""
        self.assertEqual(self.transaction.user, self.user)
        self.assertEqual(self.transaction.amount, Decimal('100.00'))
        self.assertEqual(self.transaction.transaction_type, 'deposit')
        self.assertEqual(self.transaction.payment_method, 'credit_card')
        self.assertEqual(self.transaction.status, 'completed')
        self.assertIsNotNone(self.transaction.created_at)
        self.assertIsNotNone(self.transaction.updated_at)
    
    def test_transaction_string_representation(self):
        """Test the string representation of a transaction"""
        expected_str = f"{self.transaction.transaction_type.title()} of $100.00 by {self.user.username}"
        self.assertEqual(str(self.transaction), expected_str)
    
    def test_game_related_transaction(self):
        """Test transaction with game related fields"""
        game_transaction = Transaction.objects.create(
            user=self.user,
            amount=Decimal('50.00'),
            transaction_type='game_bet',
            game_type='blackjack',
            game_id='123',
            status='completed'
        )
        
        self.assertEqual(game_transaction.amount, Decimal('50.00'))
        self.assertEqual(game_transaction.transaction_type, 'game_bet')
        self.assertEqual(game_transaction.game_type, 'blackjack')
        self.assertEqual(game_transaction.game_id, '123')
    
    def test_transaction_with_notes(self):
        """Test transaction with additional notes"""
        transaction_with_notes = Transaction.objects.create(
            user=self.user,
            amount=Decimal('75.00'),
            transaction_type='withdrawal',
            payment_method='bank_transfer',
            status='pending',
            notes='Withdrawal to Bank XYZ, Account #1234'
        )
        
        self.assertEqual(transaction_with_notes.amount, Decimal('75.00'))
        self.assertEqual(transaction_with_notes.notes, 'Withdrawal to Bank XYZ, Account #1234')

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
        
        self.game = Game.objects.create(
            user=self.user,
            game_type='blackjack',
            bet_amount=Decimal('50.00'),
            state='in_progress'
        )
        
        self.blackjack_game = BlackjackGame.objects.create(
            game=self.game,
            player_hand=json.dumps(['H10', 'S7']),
            dealer_hand=json.dumps(['D4']),
            player_score=17,
            dealer_score=4,
            deck=json.dumps(['C2', 'D7', 'S9', 'H5', 'S2'])
        )
    
    def test_blackjack_game_creation(self):
        """Test blackjack game creation with basic attributes"""
        self.assertEqual(self.blackjack_game.game, self.game)
        self.assertEqual(json.loads(self.blackjack_game.player_hand), ['H10', 'S7'])
        self.assertEqual(json.loads(self.blackjack_game.dealer_hand), ['D4'])
        self.assertEqual(self.blackjack_game.player_score, 17)
        self.assertEqual(self.blackjack_game.dealer_score, 4)
        self.assertEqual(json.loads(self.blackjack_game.deck), ['C2', 'D7', 'S9', 'H5', 'S2'])
    
    def test_blackjack_game_string_representation(self):
        """Test the string representation of a blackjack game"""
        expected_str = f"Blackjack Game #{self.game.id}"
        self.assertEqual(str(self.blackjack_game), expected_str)
    
    def test_player_hit(self):
        """Test player hitting and receiving a card"""
        old_player_hand = json.loads(self.blackjack_game.player_hand)
        old_deck = json.loads(self.blackjack_game.deck)
        
        # Simulate player hit
        new_card = old_deck.pop(0)
        new_player_hand = old_player_hand + [new_card]
        
        self.blackjack_game.player_hand = json.dumps(new_player_hand)
        self.blackjack_game.deck = json.dumps(old_deck)
        self.blackjack_game.player_score = 19  # Assuming new card is C2 with value 2
        self.blackjack_game.save()
        
        updated_bj = BlackjackGame.objects.get(id=self.blackjack_game.id)
        self.assertEqual(json.loads(updated_bj.player_hand), ['H10', 'S7', 'C2'])
        self.assertEqual(updated_bj.player_score, 19)
        self.assertEqual(len(json.loads(updated_bj.deck)), 4)  # Deck should have one less card
    
    def test_dealer_play(self):
        """Test dealer playing their hand"""
        old_dealer_hand = json.loads(self.blackjack_game.dealer_hand)
        old_deck = json.loads(self.blackjack_game.deck)
        
        # Simulate dealer hitting until 17
        new_dealer_hand = old_dealer_hand + ['D7', 'S9']  # Draw cards to reach 20
        updated_deck = old_deck[2:]  # Remove the first two cards
        
        self.blackjack_game.dealer_hand = json.dumps(new_dealer_hand)
        self.blackjack_game.deck = json.dumps(updated_deck)
        self.blackjack_game.dealer_score = 20  # 4 + 7 + 9
        self.blackjack_game.save()
        
        updated_bj = BlackjackGame.objects.get(id=self.blackjack_game.id)
        self.assertEqual(json.loads(updated_bj.dealer_hand), ['D4', 'D7', 'S9'])
        self.assertEqual(updated_bj.dealer_score, 20)
        self.assertEqual(len(json.loads(updated_bj.deck)), 3)  # Deck should have two less cards

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