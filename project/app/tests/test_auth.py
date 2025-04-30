from django.test import TestCase, Client
from django.urls import reverse
from django.contrib.auth import get_user_model
import json
from rest_framework import status
from ..models import CustomUser

User = get_user_model()

class AuthFSMTestCase(TestCase):
    """Finite State Machine tests for authentication flow"""
    
    def setUp(self):
        # Create test client
        self.client = Client()
        
        # Create a test user
        self.test_credentials = {
            'username': 'testuser',
            'email': 'test@example.com',
            'password': 'securepassword123'
        }
        
        # Create a test user in the database
        self.test_user = User.objects.create_user(
            username=self.test_credentials['username'],
            email=self.test_credentials['email'],
            password=self.test_credentials['password']
        )
        
        # Initial state (logged out)
        self.token = None
    
    def test_FSM1_successful_registration(self):
        """Test Case 1: User successful registration flow"""
        # State: Not registered -> Action: Register -> State: Registered not logged in
        new_user_credentials = {
            'username': 'newuser',
            'email': 'new@example.com',
            'password': 'securepassword123'
        }
        
        response = self.client.post(
            reverse('user-register'),
            data=json.dumps(new_user_credentials),
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(User.objects.filter(username='newuser').exists())
    
    def test_FSM2_login_after_registration(self):
        """Test Case 2: User login after registration"""
        # State: Registered not logged in -> Action: Login -> State: Logged in
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
        self.token = data['token']
    
    def test_FSM3_accessing_protected_resource(self):
        """Test Case 3: Accessing a protected resource when logged in"""
        # State: Logged in -> Action: Access protected resource -> State: Logged in with resource
        
        # First login to get token
        login_data = {
            'email': self.test_credentials['email'],
            'password': self.test_credentials['password']
        }
        
        login_response = self.client.post(
            reverse('user-login'),
            data=json.dumps(login_data),
            content_type='application/json'
        )
        
        token = json.loads(login_response.content)['token']
        
        # Then access a protected resource (account info)
        self.client.defaults['HTTP_AUTHORIZATION'] = f'Bearer {token}'
        response = self.client.get(
            reverse('account-info', kwargs={'user_id': self.test_user.id}),
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
    def test_FSM4_failed_login_attempt(self):
        """Test Case 4: Failed login attempt"""
        # State: Not logged in -> Action: Incorrect login -> State: Not logged in with error
        wrong_login_data = {
            'email': self.test_credentials['email'],
            'password': 'wrongpassword'
        }
        
        response = self.client.post(
            reverse('user-login'),
            data=json.dumps(wrong_login_data),
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_FSM5_logout_flow(self):
        """Test Case 5: User logout flow"""
        # State: Logged in -> Action: Logout -> State: Not logged in
        
        # Since Django REST doesn't have a standard logout, we'll test by clearing the token
        # and attempting to access a protected resource
        login_data = {
            'email': self.test_credentials['email'],
            'password': self.test_credentials['password']
        }
        
        login_response = self.client.post(
            reverse('user-login'),
            data=json.dumps(login_data),
            content_type='application/json'
        )
        
        # Now "logout" by removing auth header
        self.client.defaults.pop('HTTP_AUTHORIZATION', None)
        
        # Attempt to access protected resource
        response = self.client.get(
            reverse('account-info', kwargs={'user_id': self.test_user.id}),
            content_type='application/json'
        )
        
        # Should fail without auth
        self.assertNotEqual(response.status_code, status.HTTP_200_OK)
    
    def test_FSM6_relogin_flow(self):
        """Test Case 6: Relogin after logout"""
        # State: Not logged in (after logout) -> Action: Login -> State: Logged in
        # Similar to test_FSM2 but conceptually after logout
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
    
    def test_FSM7_account_update_flow(self):
        """Test Case 7: Account update flow"""
        # State: Logged in -> Action: Update account -> State: Logged in with updated account
        
        # First login
        login_data = {
            'email': self.test_credentials['email'],
            'password': self.test_credentials['password']
        }
        
        login_response = self.client.post(
            reverse('user-login'),
            data=json.dumps(login_data),
            content_type='application/json'
        )
        
        token = json.loads(login_response.content)['token']
        self.client.defaults['HTTP_AUTHORIZATION'] = f'Bearer {token}'
        
        # Update account info
        update_data = {
            'edit_type': 'username',
            'old_value': self.test_credentials['username'],
            'new_value': 'updatedusername'
        }
        
        response = self.client.post(
            reverse('account-info', kwargs={'user_id': self.test_user.id}),
            data=json.dumps(update_data),
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify the change
        self.test_user.refresh_from_db()
        self.assertEqual(self.test_user.username, 'updatedusername')


class AuthBVTTestCase(TestCase):
    """Boundary Value Testing for user registration and authentication"""
    
    def setUp(self):
        self.client = Client()
        self.register_url = reverse('user-register')
        
        # Valid user data that will be manipulated for boundary tests
        self.valid_user_data = {
            'username': 'validuser',
            'email': 'valid@example.com',
            'password': 'securepassword123'
        }
    
    def test_BVT1_min_username_length(self):
        """Test Case 1: Minimum username length (1 character)"""
        min_data = self.valid_user_data.copy()
        min_data['username'] = 'a'  # 1 character username
        
        response = self.client.post(
            self.register_url,
            data=json.dumps(min_data),
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
    
    def test_BVT2_empty_username(self):
        """Test Case 2: Empty username (invalid)"""
        invalid_data = self.valid_user_data.copy()
        invalid_data['username'] = ''
        
        response = self.client.post(
            self.register_url,
            data=json.dumps(invalid_data),
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_BVT3_max_username_length(self):
        """Test Case 3: Maximum username length (150 characters - Django default max)"""
        max_data = self.valid_user_data.copy()
        max_data['username'] = 'a' * 150
        
        response = self.client.post(
            self.register_url,
            data=json.dumps(max_data),
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
    
    def test_BVT4_username_exceeding_max(self):
        """Test Case 4: Username exceeding maximum length (151 characters)"""
        invalid_data = self.valid_user_data.copy()
        invalid_data['username'] = 'a' * 151
        
        response = self.client.post(
            self.register_url,
            data=json.dumps(invalid_data),
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_BVT5_valid_email_format(self):
        """Test Case 5: Valid email format"""
        # Already covered in valid_user_data
        response = self.client.post(
            self.register_url,
            data=json.dumps(self.valid_user_data),
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
    
    def test_BVT6_invalid_email_format(self):
        """Test Case 6: Invalid email format"""
        invalid_data = self.valid_user_data.copy()
        invalid_data['email'] = 'invalid-email'
        
        response = self.client.post(
            self.register_url,
            data=json.dumps(invalid_data),
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_BVT7_min_password_length(self):
        """Test Case 7: Minimum password length (8 characters - common requirement)"""
        min_data = self.valid_user_data.copy()
        min_data['password'] = 'pass123'  # 7 characters
        
        response = self.client.post(
            self.register_url,
            data=json.dumps(min_data),
            content_type='application/json'
        )
        
        # This should fail if you have password validation set up
        # But will pass if no min length is enforced
        self.assertNotEqual(response.status_code, status.HTTP_201_CREATED)
    
    def test_BVT8_empty_password(self):
        """Test Case 8: Empty password (invalid)"""
        invalid_data = self.valid_user_data.copy()
        invalid_data['password'] = ''
        
        response = self.client.post(
            self.register_url,
            data=json.dumps(invalid_data),
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_BVT9_duplicate_email(self):
        """Test Case 9: Duplicate email registration"""
        # First register a user
        self.client.post(
            self.register_url,
            data=json.dumps(self.valid_user_data),
            content_type='application/json'
        )
        
        # Now try again with the same email
        duplicate_data = self.valid_user_data.copy()
        duplicate_data['username'] = 'differentusername'  # Change username but keep same email
        
        response = self.client.post(
            self.register_url,
            data=json.dumps(duplicate_data),
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_BVT10_duplicate_username(self):
        """Test Case 10: Duplicate username registration"""
        # First register a user
        self.client.post(
            self.register_url,
            data=json.dumps(self.valid_user_data),
            content_type='application/json'
        )
        
        # Now try again with the same username
        duplicate_data = self.valid_user_data.copy()
        duplicate_data['email'] = 'different@example.com'  # Change email but keep same username
        
        response = self.client.post(
            self.register_url,
            data=json.dumps(duplicate_data),
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_BVT11_special_characters_in_username(self):
        """Test Case 11: Special characters in username"""
        special_data = self.valid_user_data.copy()
        special_data['username'] = 'user@name!'
        
        response = self.client.post(
            self.register_url,
            data=json.dumps(special_data),
            content_type='application/json'
        )
        
        # Django allows some special chars by default, but not all
        # This test will inform you about your specific configuration
        print(f"Special character test: {response.status_code}")
        print(response.content.decode())
    
    def test_BVT12_spaces_in_username(self):
        """Test Case 12: Spaces in username"""
        space_data = self.valid_user_data.copy()
        space_data['username'] = 'user name with spaces'
        
        response = self.client.post(
            self.register_url,
            data=json.dumps(space_data),
            content_type='application/json'
        )
        
        # Django allows spaces in usernames by default
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)


class AuthCFTTestCase(TestCase):
    """Control Flow Testing for authentication logic"""
    
    def setUp(self):
        self.client = Client()
        
        # Create test user
        self.test_user = User.objects.create_user(
            username='testcontrol',
            email='testcontrol@example.com',
            password='securepassword123'
        )
    
    def test_CFT1_login_success_path(self):
        """Test Case 1: Successful login path"""
        response = self.client.post(
            reverse('user-login'),
            data=json.dumps({
                'email': 'testcontrol@example.com',
                'password': 'securepassword123'
            }),
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        data = json.loads(response.content)
        self.assertIn('token', data)
    
    def test_CFT2_login_nonexistent_user(self):
        """Test Case 2: Login with non-existent user email"""
        response = self.client.post(
            reverse('user-login'),
            data=json.dumps({
                'email': 'nonexistent@example.com',
                'password': 'anypassword'
            }),
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_CFT3_login_wrong_password(self):
        """Test Case 3: Login with correct email but wrong password"""
        response = self.client.post(
            reverse('user-login'),
            data=json.dumps({
                'email': 'testcontrol@example.com',
                'password': 'wrongpassword'
            }),
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_CFT4_password_verification(self):
        """Test Case 4: Password verification endpoint control flow"""
        # Create a login session first
        login_response = self.client.post(
            reverse('user-login'),
            data=json.dumps({
                'email': 'testcontrol@example.com',
                'password': 'securepassword123'
            }),
            content_type='application/json'
        )
        
        token = json.loads(login_response.content)['token']
        self.client.defaults['HTTP_AUTHORIZATION'] = f'Bearer {token}'
        
        # Now test password verification endpoint
        response = self.client.post(
            reverse('verify-password'),
            data=json.dumps({
                'userId': self.test_user.id,
                'current_password': 'securepassword123'
            }),
            content_type='application/json'
        )
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
    
    def test_CFT5_missing_auth_header(self):
        """Test Case 5: Missing auth header when accessing protected route"""
        # No auth header set
        response = self.client.get(
            reverse('account-info', kwargs={'user_id': self.test_user.id}),
            content_type='application/json'
        )
        
        # Should fail authentication
        self.assertIn(response.status_code, [status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN]) 