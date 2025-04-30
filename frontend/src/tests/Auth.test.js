import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import Login from '../components/Login';
import Register from '../components/Register';
import { AuthContext } from '../contexts/AuthContext';
import * as authAPI from '../api/authAPI';

// Mock the auth API module
jest.mock('../api/authAPI');

// Mock react-router-dom's useNavigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate
}));

describe('Authentication Components', () => {
  // Mock auth context functions
  const mockLogin = jest.fn();
  const mockLogout = jest.fn();
  
  // Mock auth context value
  const mockAuthContext = {
    user: null,
    isAuthenticated: false,
    login: mockLogin,
    logout: mockLogout,
    error: null
  };

  // Mock successful login response
  const mockLoginResponse = {
    token: 'mock-token-123',
    user_id: 1,
    username: 'testuser'
  };

  // Mock successful registration response
  const mockRegisterResponse = {
    user_id: 1,
    username: 'newuser',
    message: 'User registered successfully'
  };

  // Reset all mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
    authAPI.login.mockResolvedValue(mockLoginResponse);
    authAPI.register.mockResolvedValue(mockRegisterResponse);
  });

  describe('Login Component', () => {
    // Helper function to render login component with context
    const renderLogin = () => {
      return render(
        <AuthContext.Provider value={mockAuthContext}>
          <BrowserRouter>
            <Login />
          </BrowserRouter>
        </AuthContext.Provider>
      );
    };

    test('renders login form correctly', () => {
      renderLogin();
      
      expect(screen.getByText(/Sign In/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Sign In/i })).toBeInTheDocument();
      expect(screen.getByText(/Don't have an account\?/i)).toBeInTheDocument();
      expect(screen.getByText(/Sign Up/i)).toBeInTheDocument();
    });

    test('handles form input and submission correctly', async () => {
      renderLogin();
      
      // Fill in form fields
      const emailInput = screen.getByLabelText(/Email/i);
      const passwordInput = screen.getByLabelText(/Password/i);
      const submitButton = screen.getByRole('button', { name: /Sign In/i });
      
      fireEvent.change(emailInput, { target: { value: 'user@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      
      // Submit the form
      fireEvent.click(submitButton);
      
      // Check if API was called with correct parameters
      await waitFor(() => {
        expect(authAPI.login).toHaveBeenCalledWith({
          email: 'user@example.com',
          password: 'password123'
        });
      });
      
      // Check if context login function was called with correct data
      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith(mockLoginResponse);
      });
      
      // Check if navigation happened
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
      });
    });

    test('shows error message when login fails', async () => {
      // Mock API error
      authAPI.login.mockRejectedValueOnce(new Error('Invalid credentials'));
      
      renderLogin();
      
      // Fill in form fields
      const emailInput = screen.getByLabelText(/Email/i);
      const passwordInput = screen.getByLabelText(/Password/i);
      const submitButton = screen.getByRole('button', { name: /Sign In/i });
      
      fireEvent.change(emailInput, { target: { value: 'user@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'wrongpassword' } });
      
      // Submit the form
      fireEvent.click(submitButton);
      
      // Check for error message
      await waitFor(() => {
        expect(screen.getByText(/Invalid credentials/i)).toBeInTheDocument();
      });
      
      // Login function should not be called
      expect(mockLogin).not.toHaveBeenCalled();
    });

    test('validates required fields', async () => {
      renderLogin();
      
      // Submit without filling fields
      const submitButton = screen.getByRole('button', { name: /Sign In/i });
      fireEvent.click(submitButton);
      
      // Check for validation messages
      await waitFor(() => {
        expect(screen.getByText(/Email is required/i)).toBeInTheDocument();
        expect(screen.getByText(/Password is required/i)).toBeInTheDocument();
      });
      
      // API should not be called
      expect(authAPI.login).not.toHaveBeenCalled();
    });

    test('navigates to register page when clicking Sign Up link', async () => {
      renderLogin();
      
      const signUpLink = screen.getByText(/Sign Up/i);
      fireEvent.click(signUpLink);
      
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/register');
      });
    });
  });

  describe('Register Component', () => {
    // Helper function to render register component with context
    const renderRegister = () => {
      return render(
        <AuthContext.Provider value={mockAuthContext}>
          <BrowserRouter>
            <Register />
          </BrowserRouter>
        </AuthContext.Provider>
      );
    };

    test('renders registration form correctly', () => {
      renderRegister();
      
      expect(screen.getByText(/Create an Account/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Username/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Password/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Confirm Password/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Sign Up/i })).toBeInTheDocument();
      expect(screen.getByText(/Already have an account\?/i)).toBeInTheDocument();
      expect(screen.getByText(/Sign In/i)).toBeInTheDocument();
    });

    test('handles form input and submission correctly', async () => {
      renderRegister();
      
      // Fill in form fields
      const usernameInput = screen.getByLabelText(/Username/i);
      const emailInput = screen.getByLabelText(/Email/i);
      const passwordInput = screen.getByLabelText(/^Password/i);
      const confirmPasswordInput = screen.getByLabelText(/Confirm Password/i);
      const submitButton = screen.getByRole('button', { name: /Sign Up/i });
      
      fireEvent.change(usernameInput, { target: { value: 'newuser' } });
      fireEvent.change(emailInput, { target: { value: 'new@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } });
      
      // Submit the form
      fireEvent.click(submitButton);
      
      // Check if API was called with correct parameters
      await waitFor(() => {
        expect(authAPI.register).toHaveBeenCalledWith({
          username: 'newuser',
          email: 'new@example.com',
          password: 'password123'
        });
      });
      
      // Check if navigation happened
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/login');
      });
    });

    test('shows error message when registration fails', async () => {
      // Mock API error
      authAPI.register.mockRejectedValueOnce(new Error('Username already exists'));
      
      renderRegister();
      
      // Fill in form fields
      const usernameInput = screen.getByLabelText(/Username/i);
      const emailInput = screen.getByLabelText(/Email/i);
      const passwordInput = screen.getByLabelText(/^Password/i);
      const confirmPasswordInput = screen.getByLabelText(/Confirm Password/i);
      const submitButton = screen.getByRole('button', { name: /Sign Up/i });
      
      fireEvent.change(usernameInput, { target: { value: 'existinguser' } });
      fireEvent.change(emailInput, { target: { value: 'new@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } });
      
      // Submit the form
      fireEvent.click(submitButton);
      
      // Check for error message
      await waitFor(() => {
        expect(screen.getByText(/Username already exists/i)).toBeInTheDocument();
      });
    });

    test('validates required fields', async () => {
      renderRegister();
      
      // Submit without filling fields
      const submitButton = screen.getByRole('button', { name: /Sign Up/i });
      fireEvent.click(submitButton);
      
      // Check for validation messages
      await waitFor(() => {
        expect(screen.getByText(/Username is required/i)).toBeInTheDocument();
        expect(screen.getByText(/Email is required/i)).toBeInTheDocument();
        expect(screen.getByText(/Password is required/i)).toBeInTheDocument();
      });
      
      // API should not be called
      expect(authAPI.register).not.toHaveBeenCalled();
    });

    test('validates password match', async () => {
      renderRegister();
      
      // Fill in form fields with mismatched passwords
      const usernameInput = screen.getByLabelText(/Username/i);
      const emailInput = screen.getByLabelText(/Email/i);
      const passwordInput = screen.getByLabelText(/^Password/i);
      const confirmPasswordInput = screen.getByLabelText(/Confirm Password/i);
      const submitButton = screen.getByRole('button', { name: /Sign Up/i });
      
      fireEvent.change(usernameInput, { target: { value: 'newuser' } });
      fireEvent.change(emailInput, { target: { value: 'new@example.com' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'differentpassword' } });
      
      // Submit the form
      fireEvent.click(submitButton);
      
      // Check for password match validation message
      await waitFor(() => {
        expect(screen.getByText(/Passwords do not match/i)).toBeInTheDocument();
      });
      
      // API should not be called
      expect(authAPI.register).not.toHaveBeenCalled();
    });

    test('validates email format', async () => {
      renderRegister();
      
      // Fill in form fields with invalid email
      const usernameInput = screen.getByLabelText(/Username/i);
      const emailInput = screen.getByLabelText(/Email/i);
      const passwordInput = screen.getByLabelText(/^Password/i);
      const confirmPasswordInput = screen.getByLabelText(/Confirm Password/i);
      const submitButton = screen.getByRole('button', { name: /Sign Up/i });
      
      fireEvent.change(usernameInput, { target: { value: 'newuser' } });
      fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
      fireEvent.change(passwordInput, { target: { value: 'password123' } });
      fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } });
      
      // Submit the form
      fireEvent.click(submitButton);
      
      // Check for email validation message
      await waitFor(() => {
        expect(screen.getByText(/Please enter a valid email/i)).toBeInTheDocument();
      });
      
      // API should not be called
      expect(authAPI.register).not.toHaveBeenCalled();
    });

    test('navigates to login page when clicking Sign In link', async () => {
      renderRegister();
      
      const signInLink = screen.getByText(/Sign In/i);
      fireEvent.click(signInLink);
      
      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/login');
      });
    });
  });
}); 