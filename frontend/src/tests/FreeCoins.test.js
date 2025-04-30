import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import FreeCoins from '../../../components/FreeCoins';
import { AuthContext } from '../../../contexts/AuthContext';
import * as walletAPI from '../../../api/walletAPI';

// Mock the wallet API module
jest.mock('../../../api/walletAPI');

describe('FreeCoins Component', () => {
  // Mock user data for AuthContext
  const mockUser = {
    id: 1,
    username: 'testuser',
    token: 'mocktoken123'
  };

  // Mock wallet data
  const mockWallet = {
    balance: 100.00
  };

  // Mock claim free coins response
  const mockClaimResponse = {
    message: 'Free coins claimed successfully!',
    amount: 50.00,
    new_balance: 150.00
  };

  // Mock daily bonus response
  const mockDailyBonusResponse = {
    message: 'Daily bonus claimed successfully!',
    amount: 100.00,
    new_balance: 250.00
  };

  // Mock already claimed response
  const mockAlreadyClaimedResponse = {
    error: 'You have already claimed your free coins today. Try again tomorrow.'
  };

  // Setup before each test
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Mock API calls
    walletAPI.getWalletInfo.mockResolvedValue(mockWallet);
    walletAPI.claimFreeCoins.mockResolvedValue(mockClaimResponse);
    walletAPI.claimDailyBonus.mockResolvedValue(mockDailyBonusResponse);
  });

  // Helper function to render component with context
  const renderComponent = () => {
    return render(
      <AuthContext.Provider value={{ user: mockUser, isAuthenticated: true }}>
        <FreeCoins />
      </AuthContext.Provider>
    );
  };

  test('renders the free coins component correctly', async () => {
    renderComponent();
    
    // Check for component title
    expect(screen.getByText(/Free Coins/i)).toBeInTheDocument();
    
    // Check for wallet balance
    await waitFor(() => {
      expect(screen.getByText(/Current Balance: \$100.00/i)).toBeInTheDocument();
    });
    
    // Check for claim buttons
    expect(screen.getByRole('button', { name: /Claim Free Coins/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Claim Daily Bonus/i })).toBeInTheDocument();
  });

  test('claims free coins successfully', async () => {
    renderComponent();
    
    // Click the claim free coins button
    const claimButton = screen.getByRole('button', { name: /Claim Free Coins/i });
    fireEvent.click(claimButton);
    
    // Check if API was called
    await waitFor(() => {
      expect(walletAPI.claimFreeCoins).toHaveBeenCalledTimes(1);
    });
    
    // Check if success message is displayed
    await waitFor(() => {
      expect(screen.getByText(/Free coins claimed successfully!/i)).toBeInTheDocument();
      expect(screen.getByText(/\+\$50.00/i)).toBeInTheDocument();
    });
    
    // Check if balance is updated
    await waitFor(() => {
      expect(screen.getByText(/Current Balance: \$150.00/i)).toBeInTheDocument();
    });
  });

  test('claims daily bonus successfully', async () => {
    renderComponent();
    
    // Click the claim daily bonus button
    const bonusButton = screen.getByRole('button', { name: /Claim Daily Bonus/i });
    fireEvent.click(bonusButton);
    
    // Check if API was called
    await waitFor(() => {
      expect(walletAPI.claimDailyBonus).toHaveBeenCalledTimes(1);
    });
    
    // Check if success message is displayed
    await waitFor(() => {
      expect(screen.getByText(/Daily bonus claimed successfully!/i)).toBeInTheDocument();
      expect(screen.getByText(/\+\$100.00/i)).toBeInTheDocument();
    });
    
    // Check if balance is updated
    await waitFor(() => {
      expect(screen.getByText(/Current Balance: \$250.00/i)).toBeInTheDocument();
    });
  });

  test('shows error when trying to claim bonus twice', async () => {
    // Override the mock to simulate already claimed
    walletAPI.claimFreeCoins.mockRejectedValueOnce(mockAlreadyClaimedResponse);
    
    renderComponent();
    
    // Click the claim free coins button
    const claimButton = screen.getByRole('button', { name: /Claim Free Coins/i });
    fireEvent.click(claimButton);
    
    // Check if error message is displayed
    await waitFor(() => {
      expect(screen.getByText(/You have already claimed your free coins today/i)).toBeInTheDocument();
    });
    
    // Balance should not change
    await waitFor(() => {
      expect(screen.getByText(/Current Balance: \$100.00/i)).toBeInTheDocument();
    });
  });

  test('shows countdown timer when on cooldown', async () => {
    // Mock API to return cooldown info
    walletAPI.checkClaimStatus.mockResolvedValue({
      can_claim: false,
      cooldown_remaining: 3600 // 1 hour in seconds
    });
    
    renderComponent();
    
    // Click the claim free coins button
    const claimButton = screen.getByRole('button', { name: /Claim Free Coins/i });
    fireEvent.click(claimButton);
    
    // Check if cooldown timer is displayed
    await waitFor(() => {
      expect(screen.getByText(/Next claim available in/i)).toBeInTheDocument();
      expect(screen.getByText(/1:00:00/i)).toBeInTheDocument(); // HH:MM:SS format
    });
    
    // Claim button should be disabled
    expect(claimButton).toBeDisabled();
  });

  test('clicking refer a friend shows referral code', async () => {
    // Mock API to return referral code
    walletAPI.getReferralCode.mockResolvedValue({
      code: 'TESTUSER123',
      bonus_amount: 100.00
    });
    
    renderComponent();
    
    // Click the refer a friend button
    const referButton = screen.getByRole('button', { name: /Refer a Friend/i });
    fireEvent.click(referButton);
    
    // Check if referral code is displayed
    await waitFor(() => {
      expect(screen.getByText(/Your Referral Code: TESTUSER123/i)).toBeInTheDocument();
      expect(screen.getByText(/Earn \$100.00 for each friend who signs up!/i)).toBeInTheDocument();
    });
    
    // Check if copy button is available
    expect(screen.getByRole('button', { name: /Copy Code/i })).toBeInTheDocument();
  });

  test('shows verification status for bonus eligibility', async () => {
    // Mock API to return verification required
    walletAPI.checkBonusEligibility.mockResolvedValue({
      eligible: false,
      reason: 'Account requires email verification',
      verification_url: '/verify-email'
    });
    
    renderComponent();
    
    // Click the claim daily bonus button
    const bonusButton = screen.getByRole('button', { name: /Claim Daily Bonus/i });
    fireEvent.click(bonusButton);
    
    // Check if verification message is displayed
    await waitFor(() => {
      expect(screen.getByText(/Account requires email verification/i)).toBeInTheDocument();
    });
    
    // Check if verification link is displayed
    const verifyLink = screen.getByRole('button', { name: /Verify Email/i });
    expect(verifyLink).toBeInTheDocument();
    
    // Check if clicking the link navigates correctly
    fireEvent.click(verifyLink);
    await waitFor(() => {
      // This would typically navigate to /verify-email
      expect(walletAPI.navigateToVerification).toHaveBeenCalledWith('/verify-email');
    });
  });

  test('handles API errors gracefully', async () => {
    // Mock API error
    walletAPI.claimFreeCoins.mockRejectedValueOnce(new Error('API Error'));
    
    renderComponent();
    
    // Click the claim free coins button
    const claimButton = screen.getByRole('button', { name: /Claim Free Coins/i });
    fireEvent.click(claimButton);
    
    // Check for error message
    await waitFor(() => {
      expect(screen.getByText(/Error: API Error/i)).toBeInTheDocument();
    });
  });
}); 