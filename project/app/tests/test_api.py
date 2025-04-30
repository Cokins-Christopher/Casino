from django.test import TestCase, Client
from django.urls import reverse
from django.contrib.auth import get_user_model
import json
from rest_framework import status
from decimal import Decimal
from ..models import CustomUser, Wallet, Transaction, Game

User = get_user_model()

class UserAPITestCase(TestCase):
    """Tests for user-related API endpoints"""
    
    def setUp(self):
        # Create test client
        self.client = Client()
        
        # Create a test user
        self.test_credentials = {
            'username': 'apiuser',
            'email': 'api@example.com',
            'password': 'securepassword123'
        }
        
        self.test_user = User.objects.create_user(
            username=self.test_credentials['username'],
            email=self.test_credentials['email'],
            password=self.test_credentials['password']
        )
        
        # Create wallet for the user
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
    
    def test_user_register_endpoint(self):
        """Test user registration endpoint"""
        # Remove auth token for this test
        self.client.defaults.pop('HTTP_AUTHORIZATION', None)
        
        new_user_data = {
            'username': 'newuser',
            'email': 'new@example.com',
            'password': 'securepassword123'
        }
        
        response = self.client.post(
            reverse('user-register'),
            data=json.dumps(new_user_data),
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Verify user was created
        self.assertTrue(User.objects.filter(username='newuser').exists())
        
        # Verify wallet was created for the user
        new_user = User.objects.get(username='newuser')
        self.assertTrue(Wallet.objects.filter(user=new_user).exists())
    
    def test_user_login_endpoint(self):
        """Test user login endpoint"""
        # Remove auth token for this test
        self.client.defaults.pop('HTTP_AUTHORIZATION', None)
        
        login_data = {
            'email': self.test_credentials['email'],
            'password': self.test_credentials['password']
        }
        
        response = self.client.post(
            reverse('user-login'),
            data=json.dumps(login_data),
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = json.loads(response.content)
        self.assertIn('token', data)
        self.assertIn('user_id', data)
    
    def test_account_info_endpoint(self):
        """Test account info retrieval endpoint"""
        response = self.client.get(
            reverse('account-info', kwargs={'user_id': self.test_user.id}),
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = json.loads(response.content)
        self.assertEqual(data['username'], self.test_credentials['username'])
        self.assertEqual(data['email'], self.test_credentials['email'])
        self.assertEqual(data['wallet_balance'], '1000.00')
    
    def test_account_update_endpoint(self):
        """Test account update endpoint"""
        update_data = {
            'edit_type': 'username',
            'old_value': self.test_credentials['username'],
            'new_value': 'updateduser'
        }
        
        response = self.client.post(
            reverse('account-info', kwargs={'user_id': self.test_user.id}),
            data=json.dumps(update_data),
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify the username was updated
        self.test_user.refresh_from_db()
        self.assertEqual(self.test_user.username, 'updateduser')
    
    def test_account_access_restriction(self):
        """Test that users cannot access other users' account info"""
        # Create another user
        other_user = User.objects.create_user(
            username='otheruser',
            email='other@example.com',
            password='securepassword123'
        )
        
        # Try to access other user's account info
        response = self.client.get(
            reverse('account-info', kwargs={'user_id': other_user.id}),
            content_type='application/json'
        )
        
        self.assertIn(response.status_code, [status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND])

class WalletAPITestCase(TestCase):
    """Tests for wallet-related API endpoints"""
    
    def setUp(self):
        # Create test client
        self.client = Client()
        
        # Create a test user
        self.test_user = User.objects.create_user(
            username='walletuser',
            email='wallet@example.com',
            password='securepassword123'
        )
        
        # Create wallet for the user
        self.wallet = Wallet.objects.create(
            user=self.test_user,
            balance=Decimal('1000.00')
        )
        
        # Login to get auth token
        login_response = self.client.post(
            reverse('user-login'),
            data=json.dumps({
                'email': 'wallet@example.com',
                'password': 'securepassword123'
            }),
            content_type='application/json'
        )
        
        self.token = json.loads(login_response.content)['token']
        self.client.defaults['HTTP_AUTHORIZATION'] = f'Bearer {self.token}'
    
    def test_wallet_info_endpoint(self):
        """Test wallet info retrieval endpoint"""
        response = self.client.get(
            reverse('wallet-info'),
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = json.loads(response.content)
        self.assertEqual(data['balance'], '1000.00')
    
    def test_transaction_history_endpoint(self):
        """Test transaction history endpoint"""
        # Create some test transactions
        Transaction.objects.create(
            user=self.test_user,
            amount=Decimal('100.00'),
            transaction_type='deposit',
            payment_method='credit_card'
        )
        
        Transaction.objects.create(
            user=self.test_user,
            amount=Decimal('50.00'),
            transaction_type='withdrawal',
            payment_method='bank_transfer'
        )
        
        response = self.client.get(
            reverse('transaction-list'),
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = json.loads(response.content)
        self.assertEqual(len(data), 2)

class GameAPITestCase(TestCase):
    """Tests for game-related API endpoints"""
    
    def setUp(self):
        # Create test client
        self.client = Client()
        
        # Create a test user
        self.test_user = User.objects.create_user(
            username='gameapiuser',
            email='gameapi@example.com',
            password='securepassword123'
        )
        
        # Create wallet for the user
        self.wallet = Wallet.objects.create(
            user=self.test_user,
            balance=Decimal('1000.00')
        )
        
        # Login to get auth token
        login_response = self.client.post(
            reverse('user-login'),
            data=json.dumps({
                'email': 'gameapi@example.com',
                'password': 'securepassword123'
            }),
            content_type='application/json'
        )
        
        self.token = json.loads(login_response.content)['token']
        self.client.defaults['HTTP_AUTHORIZATION'] = f'Bearer {self.token}'
    
    def test_start_game_endpoint(self):
        """Test game start endpoint"""
        game_data = {
            'game_type': 'blackjack',
            'bet_amount': '50.00'
        }
        
        response = self.client.post(
            reverse('game-start'),
            data=json.dumps(game_data),
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        data = json.loads(response.content)
        self.assertEqual(data['game_type'], 'blackjack')
        self.assertEqual(data['bet_amount'], '50.00')
        self.assertEqual(data['state'], 'in_progress')
    
    def test_game_action_endpoint(self):
        """Test game action endpoint"""
        # First create a game
        game_data = {
            'game_type': 'blackjack',
            'bet_amount': '50.00'
        }
        
        game_response = self.client.post(
            reverse('game-start'),
            data=json.dumps(game_data),
            content_type='application/json'
        )
        
        game = json.loads(game_response.content)
        game_id = game['id']
        
        # Now perform an action
        action_response = self.client.post(
            reverse('game-action', kwargs={'game_id': game_id}),
            data=json.dumps({'action': 'hit'}),
            content_type='application/json'
        )
        
        self.assertEqual(action_response.status_code, status.HTTP_200_OK)
        action_data = json.loads(action_response.content)
        self.assertEqual(len(action_data['player_cards']), 3)  # Original 2 cards + 1 more
    
    def test_game_history_endpoint(self):
        """Test game history endpoint"""
        # Create and complete a few games
        for _ in range(3):
            game_data = {
                'game_type': 'blackjack',
                'bet_amount': '50.00'
            }
            
            game_response = self.client.post(
                reverse('game-start'),
                data=json.dumps(game_data),
                content_type='application/json'
            )
            
            game = json.loads(game_response.content)
            game_id = game['id']
            
            # Complete the game
            self.client.post(
                reverse('game-action', kwargs={'game_id': game_id}),
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
        self.assertEqual(len(history), 3)
    
    def test_game_detail_endpoint(self):
        """Test game detail endpoint"""
        # Create a game
        game_data = {
            'game_type': 'blackjack',
            'bet_amount': '50.00'
        }
        
        game_response = self.client.post(
            reverse('game-start'),
            data=json.dumps(game_data),
            content_type='application/json'
        )
        
        game = json.loads(game_response.content)
        game_id = game['id']
        
        # Get game details
        response = self.client.get(
            reverse('game-detail', kwargs={'game_id': game_id}),
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        detail = json.loads(response.content)
        self.assertEqual(detail['id'], game_id)
        self.assertEqual(detail['game_type'], 'blackjack')
    
    def test_available_games_endpoint(self):
        """Test available games endpoint"""
        response = self.client.get(
            reverse('available-games'),
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        games = json.loads(response.content)
        
        # Verify response contains list of available games
        self.assertIsInstance(games, list)
        self.assertIn('blackjack', [game['type'] for game in games])

class AdminAPITestCase(TestCase):
    """Tests for admin-related API endpoints"""
    
    def setUp(self):
        # Create test client
        self.client = Client()
        
        # Create an admin user
        self.admin_user = User.objects.create_user(
            username='adminuser',
            email='admin@example.com',
            password='secureadmin123',
            is_staff=True,
            is_superuser=True
        )
        
        # Create a regular user
        self.regular_user = User.objects.create_user(
            username='regularuser',
            email='regular@example.com',
            password='secureregular123'
        )
        
        # Create wallets
        Wallet.objects.create(
            user=self.admin_user,
            balance=Decimal('1000.00')
        )
        
        Wallet.objects.create(
            user=self.regular_user,
            balance=Decimal('500.00')
        )
        
        # Login as admin to get token
        login_response = self.client.post(
            reverse('user-login'),
            data=json.dumps({
                'email': 'admin@example.com',
                'password': 'secureadmin123'
            }),
            content_type='application/json'
        )
        
        self.admin_token = json.loads(login_response.content)['token']
        self.client.defaults['HTTP_AUTHORIZATION'] = f'Bearer {self.admin_token}'
    
    def test_admin_user_list_endpoint(self):
        """Test admin endpoint for listing all users"""
        response = self.client.get(
            reverse('admin-users'),
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        users = json.loads(response.content)
        
        # Should be at least 2 users (admin and regular)
        self.assertGreaterEqual(len(users), 2)
        
        # Verify correct user information is returned
        usernames = [user['username'] for user in users]
        self.assertIn('adminuser', usernames)
        self.assertIn('regularuser', usernames)
    
    def test_admin_transaction_list_endpoint(self):
        """Test admin endpoint for listing all transactions"""
        # Create some transactions
        Transaction.objects.create(
            user=self.admin_user,
            amount=Decimal('100.00'),
            transaction_type='deposit',
            payment_method='credit_card'
        )
        
        Transaction.objects.create(
            user=self.regular_user,
            amount=Decimal('50.00'),
            transaction_type='deposit',
            payment_method='credit_card'
        )
        
        response = self.client.get(
            reverse('admin-transactions'),
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        transactions = json.loads(response.content)
        
        # Should be at least 2 transactions
        self.assertGreaterEqual(len(transactions), 2)
    
    def test_admin_transaction_filter_endpoint(self):
        """Test admin endpoint for filtering transactions"""
        # Create some transactions
        Transaction.objects.create(
            user=self.admin_user,
            amount=Decimal('100.00'),
            transaction_type='deposit',
            payment_method='credit_card'
        )
        
        Transaction.objects.create(
            user=self.regular_user,
            amount=Decimal('50.00'),
            transaction_type='withdrawal',
            payment_method='bank_transfer'
        )
        
        # Filter by transaction type
        response = self.client.get(
            reverse('admin-transactions') + '?type=deposit',
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        transactions = json.loads(response.content)
        
        # All should be deposits
        for transaction in transactions:
            self.assertEqual(transaction['transaction_type'], 'deposit')
    
    def test_admin_user_details_endpoint(self):
        """Test admin endpoint for getting user details"""
        response = self.client.get(
            reverse('admin-user-detail', kwargs={'user_id': self.regular_user.id}),
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        user_data = json.loads(response.content)
        
        self.assertEqual(user_data['username'], 'regularuser')
        self.assertEqual(user_data['email'], 'regular@example.com')
        self.assertEqual(user_data['wallet_balance'], '500.00')
    
    def test_admin_modify_user_endpoint(self):
        """Test admin endpoint for modifying user data"""
        update_data = {
            'username': 'modifieduser',
            'email': 'modified@example.com'
        }
        
        response = self.client.put(
            reverse('admin-user-detail', kwargs={'user_id': self.regular_user.id}),
            data=json.dumps(update_data),
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify user was updated
        self.regular_user.refresh_from_db()
        self.assertEqual(self.regular_user.username, 'modifieduser')
        self.assertEqual(self.regular_user.email, 'modified@example.com')
    
    def test_admin_modify_wallet_endpoint(self):
        """Test admin endpoint for modifying user wallet"""
        update_data = {
            'balance': '1000.00'
        }
        
        response = self.client.put(
            reverse('admin-wallet', kwargs={'user_id': self.regular_user.id}),
            data=json.dumps(update_data),
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify wallet was updated
        wallet = Wallet.objects.get(user=self.regular_user)
        self.assertEqual(wallet.balance, Decimal('1000.00'))
    
    def test_regular_user_cannot_access_admin_endpoints(self):
        """Test that regular users cannot access admin endpoints"""
        # Login as regular user
        login_response = self.client.post(
            reverse('user-login'),
            data=json.dumps({
                'email': 'regular@example.com',
                'password': 'secureregular123'
            }),
            content_type='application/json'
        )
        
        regular_token = json.loads(login_response.content)['token']
        self.client.defaults['HTTP_AUTHORIZATION'] = f'Bearer {regular_token}'
        
        # Try to access admin endpoint
        response = self.client.get(
            reverse('admin-users'),
            content_type='application/json'
        )
        
        # Should be forbidden
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN) 