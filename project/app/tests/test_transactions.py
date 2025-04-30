from django.test import TestCase, Client
from django.urls import reverse
from django.contrib.auth import get_user_model
import json
from rest_framework import status
from decimal import Decimal
from ..models import CustomUser, Transaction, Wallet

User = get_user_model()

class TransactionFSMTestCase(TestCase):
    """Finite State Machine tests for transaction flow"""
    
    def setUp(self):
        # Create test client
        self.client = Client()
        
        # Create a test user
        self.test_credentials = {
            'username': 'transactionuser',
            'email': 'transaction@example.com',
            'password': 'securepassword123'
        }
        
        # Create a test user in the database
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
    
    def test_FSM1_deposit_flow(self):
        """Test successful deposit transaction flow"""
        deposit_data = {
            'amount': '500.00',
            'transaction_type': 'deposit',
            'payment_method': 'credit_card'
        }
        
        response = self.client.post(
            reverse('transaction-create'),
            data=json.dumps(deposit_data),
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Verify wallet balance increased
        self.wallet.refresh_from_db()
        self.assertEqual(self.wallet.balance, Decimal('1500.00'))
        
        # Verify transaction was created
        transaction = Transaction.objects.latest('created_at')
        self.assertEqual(transaction.amount, Decimal('500.00'))
        self.assertEqual(transaction.transaction_type, 'deposit')
    
    def test_FSM2_withdrawal_flow(self):
        """Test successful withdrawal transaction flow"""
        withdrawal_data = {
            'amount': '200.00',
            'transaction_type': 'withdrawal',
            'payment_method': 'bank_transfer'
        }
        
        response = self.client.post(
            reverse('transaction-create'),
            data=json.dumps(withdrawal_data),
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Verify wallet balance decreased
        self.wallet.refresh_from_db()
        self.assertEqual(self.wallet.balance, Decimal('800.00'))
        
        # Verify transaction was created
        transaction = Transaction.objects.latest('created_at')
        self.assertEqual(transaction.amount, Decimal('200.00'))
        self.assertEqual(transaction.transaction_type, 'withdrawal')
    
    def test_FSM3_insufficient_funds(self):
        """Test withdrawal with insufficient funds"""
        withdrawal_data = {
            'amount': '2000.00',  # More than wallet balance
            'transaction_type': 'withdrawal',
            'payment_method': 'bank_transfer'
        }
        
        response = self.client.post(
            reverse('transaction-create'),
            data=json.dumps(withdrawal_data),
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        
        # Verify wallet balance unchanged
        self.wallet.refresh_from_db()
        self.assertEqual(self.wallet.balance, Decimal('1000.00'))
    
    def test_FSM4_game_winnings_flow(self):
        """Test game winnings transaction flow"""
        winnings_data = {
            'amount': '150.00',
            'transaction_type': 'game_winning',
            'game_id': '1',
            'game_type': 'blackjack'
        }
        
        response = self.client.post(
            reverse('transaction-create'),
            data=json.dumps(winnings_data),
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Verify wallet balance increased
        self.wallet.refresh_from_db()
        self.assertEqual(self.wallet.balance, Decimal('1150.00'))
        
        # Verify transaction was created with game data
        transaction = Transaction.objects.latest('created_at')
        self.assertEqual(transaction.amount, Decimal('150.00'))
        self.assertEqual(transaction.transaction_type, 'game_winning')
        self.assertEqual(transaction.game_id, '1')
    
    def test_FSM5_game_bet_flow(self):
        """Test game bet transaction flow"""
        bet_data = {
            'amount': '50.00',
            'transaction_type': 'game_bet',
            'game_id': '2',
            'game_type': 'blackjack'
        }
        
        response = self.client.post(
            reverse('transaction-create'),
            data=json.dumps(bet_data),
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Verify wallet balance decreased
        self.wallet.refresh_from_db()
        self.assertEqual(self.wallet.balance, Decimal('950.00'))
        
        # Verify transaction was created with game data
        transaction = Transaction.objects.latest('created_at')
        self.assertEqual(transaction.amount, Decimal('50.00'))
        self.assertEqual(transaction.transaction_type, 'game_bet')
        self.assertEqual(transaction.game_id, '2')

class TransactionBVTTestCase(TestCase):
    """Boundary Value Testing for transactions"""
    
    def setUp(self):
        # Create test client
        self.client = Client()
        
        # Create a test user
        self.test_user = User.objects.create_user(
            username='bvtuser',
            email='bvt@example.com',
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
                'email': 'bvt@example.com',
                'password': 'securepassword123'
            }),
            content_type='application/json'
        )
        
        self.token = json.loads(login_response.content)['token']
        self.client.defaults['HTTP_AUTHORIZATION'] = f'Bearer {self.token}'
    
    def test_BVT1_min_deposit(self):
        """Test minimum deposit amount (typically $10)"""
        min_deposit = {
            'amount': '10.00',
            'transaction_type': 'deposit',
            'payment_method': 'credit_card'
        }
        
        response = self.client.post(
            reverse('transaction-create'),
            data=json.dumps(min_deposit),
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
    
    def test_BVT2_below_min_deposit(self):
        """Test below minimum deposit amount"""
        below_min_deposit = {
            'amount': '9.99',
            'transaction_type': 'deposit',
            'payment_method': 'credit_card'
        }
        
        response = self.client.post(
            reverse('transaction-create'),
            data=json.dumps(below_min_deposit),
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_BVT3_max_deposit(self):
        """Test maximum deposit amount (typically $10,000)"""
        max_deposit = {
            'amount': '10000.00',
            'transaction_type': 'deposit',
            'payment_method': 'bank_transfer'
        }
        
        response = self.client.post(
            reverse('transaction-create'),
            data=json.dumps(max_deposit),
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
    
    def test_BVT4_above_max_deposit(self):
        """Test above maximum deposit amount"""
        above_max_deposit = {
            'amount': '10001.00',
            'transaction_type': 'deposit',
            'payment_method': 'bank_transfer'
        }
        
        response = self.client.post(
            reverse('transaction-create'),
            data=json.dumps(above_max_deposit),
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_BVT5_min_withdrawal(self):
        """Test minimum withdrawal amount (typically $20)"""
        min_withdrawal = {
            'amount': '20.00',
            'transaction_type': 'withdrawal',
            'payment_method': 'bank_transfer'
        }
        
        response = self.client.post(
            reverse('transaction-create'),
            data=json.dumps(min_withdrawal),
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
    
    def test_BVT6_below_min_withdrawal(self):
        """Test below minimum withdrawal amount"""
        below_min_withdrawal = {
            'amount': '19.99',
            'transaction_type': 'withdrawal',
            'payment_method': 'bank_transfer'
        }
        
        response = self.client.post(
            reverse('transaction-create'),
            data=json.dumps(below_min_withdrawal),
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_BVT7_max_withdrawal(self):
        """Test maximum withdrawal amount (typically $5,000)"""
        # First add enough funds to the wallet
        self.wallet.balance = Decimal('10000.00')
        self.wallet.save()
        
        max_withdrawal = {
            'amount': '5000.00',
            'transaction_type': 'withdrawal',
            'payment_method': 'bank_transfer'
        }
        
        response = self.client.post(
            reverse('transaction-create'),
            data=json.dumps(max_withdrawal),
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
    
    def test_BVT8_above_max_withdrawal(self):
        """Test above maximum withdrawal amount"""
        # First add enough funds to the wallet
        self.wallet.balance = Decimal('10000.00')
        self.wallet.save()
        
        above_max_withdrawal = {
            'amount': '5001.00',
            'transaction_type': 'withdrawal',
            'payment_method': 'bank_transfer'
        }
        
        response = self.client.post(
            reverse('transaction-create'),
            data=json.dumps(above_max_withdrawal),
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_BVT9_zero_amount(self):
        """Test transaction with zero amount"""
        zero_amount = {
            'amount': '0.00',
            'transaction_type': 'deposit',
            'payment_method': 'credit_card'
        }
        
        response = self.client.post(
            reverse('transaction-create'),
            data=json.dumps(zero_amount),
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_BVT10_negative_amount(self):
        """Test transaction with negative amount"""
        negative_amount = {
            'amount': '-100.00',
            'transaction_type': 'deposit',
            'payment_method': 'credit_card'
        }
        
        response = self.client.post(
            reverse('transaction-create'),
            data=json.dumps(negative_amount),
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

class TransactionCFTTestCase(TestCase):
    """Control Flow Testing for transaction logic"""
    
    def setUp(self):
        # Create test client
        self.client = Client()
        
        # Create a test user
        self.test_user = User.objects.create_user(
            username='cftuser',
            email='cft@example.com',
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
                'email': 'cft@example.com',
                'password': 'securepassword123'
            }),
            content_type='application/json'
        )
        
        self.token = json.loads(login_response.content)['token']
        self.client.defaults['HTTP_AUTHORIZATION'] = f'Bearer {self.token}'
    
    def test_CFT1_transaction_list(self):
        """Test transaction list endpoint"""
        # Create some test transactions first
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
        
        # Test listing all transactions
        response = self.client.get(
            reverse('transaction-list'),
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = json.loads(response.content)
        self.assertEqual(len(data), 2)
    
    def test_CFT2_transaction_filter_by_type(self):
        """Test transaction filtering by type"""
        # Create some test transactions first
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
        
        # Test filtering by deposit type
        response = self.client.get(
            reverse('transaction-list') + '?type=deposit',
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = json.loads(response.content)
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]['transaction_type'], 'deposit')
    
    def test_CFT3_transaction_filter_by_date_range(self):
        """Test transaction filtering by date range"""
        # Create some test transactions with specific dates
        import datetime
        from django.utils import timezone
        
        # Create transaction for today
        Transaction.objects.create(
            user=self.test_user,
            amount=Decimal('100.00'),
            transaction_type='deposit',
            payment_method='credit_card',
            created_at=timezone.now()
        )
        
        # Create transaction for yesterday
        yesterday = timezone.now() - datetime.timedelta(days=1)
        Transaction.objects.create(
            user=self.test_user,
            amount=Decimal('50.00'),
            transaction_type='withdrawal',
            payment_method='bank_transfer',
            created_at=yesterday
        )
        
        # Test filtering by today's date
        today = timezone.now().date().isoformat()
        response = self.client.get(
            reverse('transaction-list') + f'?start_date={today}',
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = json.loads(response.content)
        self.assertEqual(len(data), 1)
        self.assertEqual(data[0]['amount'], '100.00')
    
    def test_CFT4_transaction_detail(self):
        """Test accessing a specific transaction"""
        # Create a test transaction
        transaction = Transaction.objects.create(
            user=self.test_user,
            amount=Decimal('100.00'),
            transaction_type='deposit',
            payment_method='credit_card'
        )
        
        # Test getting transaction detail
        response = self.client.get(
            reverse('transaction-detail', kwargs={'transaction_id': transaction.id}),
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = json.loads(response.content)
        self.assertEqual(data['amount'], '100.00')
        self.assertEqual(data['transaction_type'], 'deposit')
    
    def test_CFT5_transaction_status_check(self):
        """Test transaction status verification endpoint"""
        # Create a pending transaction
        transaction = Transaction.objects.create(
            user=self.test_user,
            amount=Decimal('100.00'),
            transaction_type='withdrawal',
            payment_method='bank_transfer',
            status='pending'
        )
        
        # Test checking transaction status
        response = self.client.get(
            reverse('transaction-status', kwargs={'transaction_id': transaction.id}),
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = json.loads(response.content)
        self.assertEqual(data['status'], 'pending')
    
    def test_CFT6_missing_transaction_fields(self):
        """Test transaction creation with missing required fields"""
        incomplete_data = {
            'amount': '100.00',
            # Missing transaction_type
            'payment_method': 'credit_card'
        }
        
        response = self.client.post(
            reverse('transaction-create'),
            data=json.dumps(incomplete_data),
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_CFT7_access_other_user_transaction(self):
        """Test attempting to access another user's transaction"""
        # Create another user and their transaction
        other_user = User.objects.create_user(
            username='otheruser',
            email='other@example.com',
            password='securepassword123'
        )
        
        other_transaction = Transaction.objects.create(
            user=other_user,
            amount=Decimal('100.00'),
            transaction_type='deposit',
            payment_method='credit_card'
        )
        
        # Try to access the other user's transaction with our authenticated user
        response = self.client.get(
            reverse('transaction-detail', kwargs={'transaction_id': other_transaction.id}),
            content_type='application/json'
        )
        
        # Should be forbidden or not found
        self.assertIn(response.status_code, [status.HTTP_403_FORBIDDEN, status.HTTP_404_NOT_FOUND]) 