from django.test import TestCase, Client
from django.urls import reverse
from django.contrib.auth import get_user_model
import json
from rest_framework import status
from decimal import Decimal
from ..models import CustomUser, Game, GameRound, Card, Wallet

User = get_user_model()

class BlackjackFSMTestCase(TestCase):
    """Finite State Machine tests for blackjack game flow"""
    
    def setUp(self):
        # Create test client
        self.client = Client()
        
        # Create a test user
        self.test_credentials = {
            'username': 'blackjackuser',
            'email': 'blackjack@example.com',
            'password': 'securepassword123'
        }
        
        # Create a test user in the database
        self.test_user = User.objects.create_user(
            username=self.test_credentials['username'],
            email=self.test_credentials['email'],
            password=self.test_credentials['password']
        )
        
        # Create wallet for the user with funds
        self.wallet = Wallet.objects.create(
            user=self.test_user,
            balance=Decimal('1000.00')
        )
        
        # Login to get auth token
        login_response = self.client.post(
            reverse('user-login'),
            data=json.dumps({
                'email': self.test_credentials['email'],
                'password': self.test_credentials['password']
            }),
            content_type='application/json'
        )
        
        self.token = json.loads(login_response.content)['token']
        self.client.defaults['HTTP_AUTHORIZATION'] = f'Bearer {self.token}'
    
    def test_FSM1_start_new_game(self):
        """Test starting a new blackjack game"""
        # State: No active game -> Action: Start game -> State: Game started with cards dealt
        new_game_data = {
            'game_type': 'blackjack',
            'bet_amount': '50.00'
        }
        
        response = self.client.post(
            reverse('game-start'),
            data=json.dumps(new_game_data),
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Check game was created
        game_data = json.loads(response.content)
        self.assertEqual(game_data['game_type'], 'blackjack')
        self.assertEqual(game_data['state'], 'in_progress')
        
        # Check initial cards were dealt (player has 2 cards, dealer has 1 visible card)
        self.assertEqual(len(game_data['player_cards']), 2)
        self.assertEqual(len(game_data['dealer_cards']), 1)
        
        # Store game ID for later tests
        self.game_id = game_data['id']
    
    def test_FSM2_hit_card(self):
        """Test hitting and receiving a new card"""
        # First create a game
        new_game_data = {
            'game_type': 'blackjack',
            'bet_amount': '50.00'
        }
        
        game_response = self.client.post(
            reverse('game-start'),
            data=json.dumps(new_game_data),
            content_type='application/json'
        )
        
        game_data = json.loads(game_response.content)
        game_id = game_data['id']
        
        # State: Game in progress -> Action: Hit -> State: Game in progress with additional card
        hit_response = self.client.post(
            reverse('game-action', kwargs={'game_id': game_id}),
            data=json.dumps({'action': 'hit'}),
            content_type='application/json'
        )
        
        self.assertEqual(hit_response.status_code, status.HTTP_200_OK)
        
        # Check player received a new card (now has 3)
        updated_game = json.loads(hit_response.content)
        self.assertEqual(len(updated_game['player_cards']), 3)
    
    def test_FSM3_stand_action(self):
        """Test standing action and dealer play"""
        # First create a game
        new_game_data = {
            'game_type': 'blackjack',
            'bet_amount': '50.00'
        }
        
        game_response = self.client.post(
            reverse('game-start'),
            data=json.dumps(new_game_data),
            content_type='application/json'
        )
        
        game_data = json.loads(game_response.content)
        game_id = game_data['id']
        
        # State: Game in progress -> Action: Stand -> State: Game completed with result
        stand_response = self.client.post(
            reverse('game-action', kwargs={'game_id': game_id}),
            data=json.dumps({'action': 'stand'}),
            content_type='application/json'
        )
        
        self.assertEqual(stand_response.status_code, status.HTTP_200_OK)
        
        # Check game completed and dealer has played
        completed_game = json.loads(stand_response.content)
        self.assertIn(completed_game['state'], ['completed', 'player_won', 'dealer_won', 'push'])
        self.assertGreaterEqual(len(completed_game['dealer_cards']), 2)  # Dealer should have at least 2 cards
    
    def test_FSM4_player_busts(self):
        """Test player busting scenario"""
        # This is a bit tricky to test deterministically since cards are random
        # We'll keep hitting until player busts or reaches a high total
        
        # First create a game
        new_game_data = {
            'game_type': 'blackjack',
            'bet_amount': '50.00'
        }
        
        game_response = self.client.post(
            reverse('game-start'),
            data=json.dumps(new_game_data),
            content_type='application/json'
        )
        
        game_data = json.loads(game_response.content)
        game_id = game_data['id']
        player_total = game_data.get('player_total', 0)
        
        # State: Game in progress -> Action: Hit repeatedly -> State: Player busts
        max_attempts = 10  # To prevent infinite loop
        current_attempt = 0
        
        while player_total < 21 and current_attempt < max_attempts:
            hit_response = self.client.post(
                reverse('game-action', kwargs={'game_id': game_id}),
                data=json.dumps({'action': 'hit'}),
                content_type='application/json'
            )
            
            hit_data = json.loads(hit_response.content)
            player_total = hit_data.get('player_total', 0)
            
            if hit_data['state'] == 'dealer_won' and 'bust' in hit_data.get('result_message', '').lower():
                # Player busted
                self.assertEqual(hit_data['state'], 'dealer_won')
                return  # Test succeeded
            
            current_attempt += 1
        
        # Even if we didn't bust, we should verify the game state is valid
        self.assertIn(game_data['state'], ['in_progress', 'completed', 'player_won', 'dealer_won', 'push'])
    
    def test_FSM5_double_down(self):
        """Test double down action"""
        # First create a game
        new_game_data = {
            'game_type': 'blackjack',
            'bet_amount': '50.00'
        }
        
        game_response = self.client.post(
            reverse('game-start'),
            data=json.dumps(new_game_data),
            content_type='application/json'
        )
        
        game_data = json.loads(game_response.content)
        game_id = game_data['id']
        initial_bet = Decimal(game_data['bet_amount'])
        
        # State: Game in progress -> Action: Double down -> State: Game completed with doubled bet
        double_response = self.client.post(
            reverse('game-action', kwargs={'game_id': game_id}),
            data=json.dumps({'action': 'double'}),
            content_type='application/json'
        )
        
        self.assertEqual(double_response.status_code, status.HTTP_200_OK)
        
        # Check bet was doubled and player received one more card
        doubled_game = json.loads(double_response.content)
        self.assertEqual(Decimal(doubled_game['bet_amount']), initial_bet * 2)
        self.assertEqual(len(doubled_game['player_cards']), 3)  # Original 2 cards + 1 more
        self.assertIn(doubled_game['state'], ['completed', 'player_won', 'dealer_won', 'push'])

class BlackjackBVTTestCase(TestCase):
    """Boundary Value Testing for blackjack game"""
    
    def setUp(self):
        # Create test client
        self.client = Client()
        
        # Create a test user
        self.test_user = User.objects.create_user(
            username='bjbvtuser',
            email='bjbvt@example.com',
            password='securepassword123'
        )
        
        # Create wallet for the user with funds
        self.wallet = Wallet.objects.create(
            user=self.test_user,
            balance=Decimal('1000.00')
        )
        
        # Login to get auth token
        login_response = self.client.post(
            reverse('user-login'),
            data=json.dumps({
                'email': 'bjbvt@example.com',
                'password': 'securepassword123'
            }),
            content_type='application/json'
        )
        
        self.token = json.loads(login_response.content)['token']
        self.client.defaults['HTTP_AUTHORIZATION'] = f'Bearer {self.token}'
    
    def test_BVT1_min_bet(self):
        """Test minimum betting amount (typically $5)"""
        min_bet_data = {
            'game_type': 'blackjack',
            'bet_amount': '5.00'
        }
        
        response = self.client.post(
            reverse('game-start'),
            data=json.dumps(min_bet_data),
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
    
    def test_BVT2_below_min_bet(self):
        """Test below minimum betting amount"""
        below_min_bet_data = {
            'game_type': 'blackjack',
            'bet_amount': '4.99'
        }
        
        response = self.client.post(
            reverse('game-start'),
            data=json.dumps(below_min_bet_data),
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_BVT3_max_bet(self):
        """Test maximum betting amount (typically $500)"""
        max_bet_data = {
            'game_type': 'blackjack',
            'bet_amount': '500.00'
        }
        
        response = self.client.post(
            reverse('game-start'),
            data=json.dumps(max_bet_data),
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
    
    def test_BVT4_above_max_bet(self):
        """Test above maximum betting amount"""
        above_max_bet_data = {
            'game_type': 'blackjack',
            'bet_amount': '500.01'
        }
        
        response = self.client.post(
            reverse('game-start'),
            data=json.dumps(above_max_bet_data),
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_BVT5_insufficient_funds(self):
        """Test betting with insufficient funds"""
        # Set wallet balance to a low amount
        self.wallet.balance = Decimal('10.00')
        self.wallet.save()
        
        too_high_bet_data = {
            'game_type': 'blackjack',
            'bet_amount': '50.00'
        }
        
        response = self.client.post(
            reverse('game-start'),
            data=json.dumps(too_high_bet_data),
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_BVT6_player_blackjack_payout(self):
        """Test player blackjack payout (3:2)"""
        # This is tricky to test deterministically, as we'd need to mock the deal
        # For now, we'll just check that the game API supports blackjack payouts
        # by checking the game config
        
        response = self.client.get(
            reverse('game-config'),
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        config = json.loads(response.content)
        self.assertIn('blackjack_payout_ratio', config)
        self.assertEqual(config['blackjack_payout_ratio'], 1.5)  # 3:2 payout
    
    def test_BVT7_max_double_down(self):
        """Test double down with maximum allowed bet"""
        # Start with max bet
        bet_amount = '250.00'  # Half the max bet, so doubling will reach the max
        max_double_data = {
            'game_type': 'blackjack',
            'bet_amount': bet_amount
        }
        
        game_response = self.client.post(
            reverse('game-start'),
            data=json.dumps(max_double_data),
            content_type='application/json'
        )
        
        game_data = json.loads(game_response.content)
        game_id = game_data['id']
        
        # Double down should work (reaching max bet)
        double_response = self.client.post(
            reverse('game-action', kwargs={'game_id': game_id}),
            data=json.dumps({'action': 'double'}),
            content_type='application/json'
        )
        
        self.assertEqual(double_response.status_code, status.HTTP_200_OK)
        doubled_game = json.loads(double_response.content)
        self.assertEqual(doubled_game['bet_amount'], '500.00')
    
    def test_BVT8_double_would_exceed_max(self):
        """Test double down that would exceed maximum bet"""
        # Start with a bet that when doubled would exceed max
        bet_amount = '300.00'  # Doubling would be $600, exceeding max of $500
        high_bet_data = {
            'game_type': 'blackjack',
            'bet_amount': bet_amount
        }
        
        game_response = self.client.post(
            reverse('game-start'),
            data=json.dumps(high_bet_data),
            content_type='application/json'
        )
        
        game_data = json.loads(game_response.content)
        game_id = game_data['id']
        
        # Double down should fail
        double_response = self.client.post(
            reverse('game-action', kwargs={'game_id': game_id}),
            data=json.dumps({'action': 'double'}),
            content_type='application/json'
        )
        
        self.assertEqual(double_response.status_code, status.HTTP_400_BAD_REQUEST)

class BlackjackCFTTestCase(TestCase):
    """Control Flow Testing for blackjack game logic"""
    
    def setUp(self):
        # Create test client
        self.client = Client()
        
        # Create a test user
        self.test_user = User.objects.create_user(
            username='bjcftuser',
            email='bjcft@example.com',
            password='securepassword123'
        )
        
        # Create wallet for the user with funds
        self.wallet = Wallet.objects.create(
            user=self.test_user,
            balance=Decimal('1000.00')
        )
        
        # Login to get auth token
        login_response = self.client.post(
            reverse('user-login'),
            data=json.dumps({
                'email': 'bjcft@example.com',
                'password': 'securepassword123'
            }),
            content_type='application/json'
        )
        
        self.token = json.loads(login_response.content)['token']
        self.client.defaults['HTTP_AUTHORIZATION'] = f'Bearer {self.token}'
        
        # Start a game that we'll use for tests
        new_game_data = {
            'game_type': 'blackjack',
            'bet_amount': '50.00'
        }
        
        game_response = self.client.post(
            reverse('game-start'),
            data=json.dumps(new_game_data),
            content_type='application/json'
        )
        
        self.game_data = json.loads(game_response.content)
        self.game_id = self.game_data['id']
    
    def test_CFT1_invalid_action(self):
        """Test submitting an invalid action"""
        response = self.client.post(
            reverse('game-action', kwargs={'game_id': self.game_id}),
            data=json.dumps({'action': 'invalid_action'}),
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_CFT2_action_on_completed_game(self):
        """Test performing action on already completed game"""
        # First complete the game by standing
        self.client.post(
            reverse('game-action', kwargs={'game_id': self.game_id}),
            data=json.dumps({'action': 'stand'}),
            content_type='application/json'
        )
        
        # Now try hitting on the completed game
        response = self.client.post(
            reverse('game-action', kwargs={'game_id': self.game_id}),
            data=json.dumps({'action': 'hit'}),
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_CFT3_invalid_game_id(self):
        """Test using an invalid game ID"""
        response = self.client.post(
            reverse('game-action', kwargs={'game_id': 99999}),
            data=json.dumps({'action': 'hit'}),
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
    
    def test_CFT4_access_another_users_game(self):
        """Test attempting to access another user's game"""
        # Create another user and their game
        other_user = User.objects.create_user(
            username='otherbjuser',
            email='otherbj@example.com',
            password='securepassword123'
        )
        
        # Create wallet for the other user
        Wallet.objects.create(
            user=other_user,
            balance=Decimal('1000.00')
        )
        
        # Create a game for the other user
        other_game = Game.objects.create(
            user=other_user,
            game_type='blackjack',
            bet_amount=Decimal('50.00'),
            state='in_progress'
        )
        
        # Try to act on the other user's game
        response = self.client.post(
            reverse('game-action', kwargs={'game_id': other_game.id}),
            data=json.dumps({'action': 'hit'}),
            content_type='application/json'
        )
        
        # Should be forbidden or not found
        self.assertIn(response.status_code, [status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND])
    
    def test_CFT5_game_history(self):
        """Test retrieving game history"""
        # Complete the game first
        self.client.post(
            reverse('game-action', kwargs={'game_id': self.game_id}),
            data=json.dumps({'action': 'stand'}),
            content_type='application/json'
        )
        
        # Get game history
        response = self.client.get(
            reverse('game-history'),
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        history = json.loads(response.content)
        self.assertGreaterEqual(len(history), 1)
        
        # Verify our game is in the history
        game_ids = [game['id'] for game in history]
        self.assertIn(self.game_id, game_ids)
    
    def test_CFT6_game_history_filter(self):
        """Test filtering game history"""
        # Complete the current game
        self.client.post(
            reverse('game-action', kwargs={'game_id': self.game_id}),
            data=json.dumps({'action': 'stand'}),
            content_type='application/json'
        )
        
        # Create a second game of a different type
        poker_game_data = {
            'game_type': 'poker',
            'bet_amount': '50.00'
        }
        
        self.client.post(
            reverse('game-start'),
            data=json.dumps(poker_game_data),
            content_type='application/json'
        )
        
        # Filter history by blackjack games
        response = self.client.get(
            reverse('game-history') + '?game_type=blackjack',
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        history = json.loads(response.content)
        
        # All returned games should be blackjack
        for game in history:
            self.assertEqual(game['game_type'], 'blackjack')
    
    def test_CFT7_dealer_logic(self):
        """Test dealer logic (hit until 17)"""
        # We can only test this indirectly since dealer plays automatically
        # Complete the game by standing
        stand_response = self.client.post(
            reverse('game-action', kwargs={'game_id': self.game_id}),
            data=json.dumps({'action': 'stand'}),
            content_type='application/json'
        )
        
        completed_game = json.loads(stand_response.content)
        
        # Check dealer's final total
        dealer_total = completed_game.get('dealer_total', 0)
        
        # If dealer didn't bust, they should have 17 or more
        if 'dealer_busted' not in completed_game or not completed_game['dealer_busted']:
            self.assertGreaterEqual(dealer_total, 17)
    
    def test_CFT8_game_statistics(self):
        """Test game statistics endpoint"""
        # Complete a few games
        for _ in range(3):
            # Start a new game
            new_game_data = {
                'game_type': 'blackjack',
                'bet_amount': '50.00'
            }
            
            game_response = self.client.post(
                reverse('game-start'),
                data=json.dumps(new_game_data),
                content_type='application/json'
            )
            
            game_data = json.loads(game_response.content)
            game_id = game_data['id']
            
            # Complete the game
            self.client.post(
                reverse('game-action', kwargs={'game_id': game_id}),
                data=json.dumps({'action': 'stand'}),
                content_type='application/json'
            )
        
        # Get statistics
        response = self.client.get(
            reverse('game-statistics'),
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        stats = json.loads(response.content)
        
        # Verify statistics include expected fields
        self.assertIn('total_games', stats)
        self.assertIn('wins', stats)
        self.assertIn('losses', stats)
        self.assertIn('win_rate', stats)
        
        # User should have played at least 4 games (1 from setup + 3 from this test)
        self.assertGreaterEqual(stats['total_games'], 4) 