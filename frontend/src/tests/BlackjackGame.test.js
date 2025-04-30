import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import '@testing-library/jest-dom';
import BlackjackGame from '../components/BlackjackGame';
import { AuthContext } from '../contexts/AuthContext';
import * as gameAPI from '../api/gameAPI';

// Mock the gameAPI module
jest.mock('../api/gameAPI');

describe('BlackjackGame Component', () => {
  // Mock user data for AuthContext
  const mockUser = {
    id: 1,
    username: 'testuser',
    token: 'mocktoken123'
  };

  // Mock wallet data
  const mockWallet = {
    balance: 1000.00
  };

  // Mock initial game state
  const mockInitialGame = {
    id: 123,
    game_type: 'blackjack',
    bet_amount: '50.00',
    state: 'in_progress',
    player_cards: ['HA', 'C9'],
    dealer_cards: ['D7'],
    player_total: 20,
    dealer_total: 7
  };

  // Mock hit response
  const mockHitResponse = {
    ...mockInitialGame,
    player_cards: ['HA', 'C9', 'S4'],
    player_total: 14 // Ace now counts as 1
  };

  // Mock stand response
  const mockStandResponse = {
    ...mockInitialGame,
    state: 'player_won',
    dealer_cards: ['D7', 'C8'],
    dealer_total: 15,
    result: 'Player wins!',
    payout_amount: '100.00'
  };

  // Mock double response
  const mockDoubleResponse = {
    ...mockInitialGame,
    state: 'dealer_won',
    bet_amount: '100.00',
    player_cards: ['HA', 'C9', 'D10'],
    player_total: 20,
    dealer_cards: ['D7', 'CA'],
    dealer_total: 21,
    result: 'Dealer wins with blackjack'
  };

  // Mock player busts response
  const mockBustResponse = {
    ...mockInitialGame,
    state: 'dealer_won',
    player_cards: ['HA', 'C9', 'SK'],
    player_total: 30,
    result: 'Player busts'
  };

  // Setup before each test
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Mock API calls
    gameAPI.startGame.mockResolvedValue(mockInitialGame);
    gameAPI.performGameAction.mockImplementation((gameId, action) => {
      switch (action) {
        case 'hit':
          return Promise.resolve(mockHitResponse);
        case 'stand':
          return Promise.resolve(mockStandResponse);
        case 'double':
          return Promise.resolve(mockDoubleResponse);
        default:
          return Promise.reject(new Error('Invalid action'));
      }
    });
    gameAPI.getWalletInfo.mockResolvedValue(mockWallet);
  });

  // Helper function to render component with context
  const renderComponent = () => {
    return render(
      <AuthContext.Provider value={{ user: mockUser, isAuthenticated: true }}>
        <BlackjackGame />
      </AuthContext.Provider>
    );
  };

  test('renders the initial game state correctly', async () => {
    renderComponent();
    
    // Check for game title
    expect(screen.getByText(/Blackjack/i)).toBeInTheDocument();
    
    // Check for bet input
    expect(screen.getByLabelText(/Bet Amount/i)).toBeInTheDocument();
    
    // Check for deal button
    const dealButton = screen.getByRole('button', { name: /Deal/i });
    expect(dealButton).toBeInTheDocument();
    
    // Check for wallet balance
    await waitFor(() => {
      expect(screen.getByText(/Balance: \$1000.00/i)).toBeInTheDocument();
    });
  });

  test('starts a new game when Deal button is clicked', async () => {
    renderComponent();
    
    // Set bet amount
    const betInput = screen.getByLabelText(/Bet Amount/i);
    fireEvent.change(betInput, { target: { value: '50' } });
    
    // Click deal button
    const dealButton = screen.getByRole('button', { name: /Deal/i });
    fireEvent.click(dealButton);
    
    // Check if API was called with correct parameters
    await waitFor(() => {
      expect(gameAPI.startGame).toHaveBeenCalledWith({
        game_type: 'blackjack',
        bet_amount: '50'
      });
    });
    
    // Check if game state is displayed
    await waitFor(() => {
      expect(screen.getByText(/Player: 20/i)).toBeInTheDocument();
      expect(screen.getByText(/Dealer: 7/i)).toBeInTheDocument();
    });
    
    // Check if action buttons appear
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Hit/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Stand/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Double/i })).toBeInTheDocument();
    });
  });

  test('performs hit action correctly', async () => {
    renderComponent();
    
    // Start game first
    const betInput = screen.getByLabelText(/Bet Amount/i);
    fireEvent.change(betInput, { target: { value: '50' } });
    
    const dealButton = screen.getByRole('button', { name: /Deal/i });
    fireEvent.click(dealButton);
    
    // Wait for game to start
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Hit/i })).toBeInTheDocument();
    });
    
    // Click hit button
    const hitButton = screen.getByRole('button', { name: /Hit/i });
    fireEvent.click(hitButton);
    
    // Check if API was called with correct parameters
    await waitFor(() => {
      expect(gameAPI.performGameAction).toHaveBeenCalledWith(123, 'hit');
    });
    
    // Check if game state is updated
    await waitFor(() => {
      expect(screen.getByText(/Player: 14/i)).toBeInTheDocument();
    });
  });

  test('performs stand action correctly and shows result', async () => {
    renderComponent();
    
    // Start game first
    const betInput = screen.getByLabelText(/Bet Amount/i);
    fireEvent.change(betInput, { target: { value: '50' } });
    
    const dealButton = screen.getByRole('button', { name: /Deal/i });
    fireEvent.click(dealButton);
    
    // Wait for game to start
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Stand/i })).toBeInTheDocument();
    });
    
    // Click stand button
    const standButton = screen.getByRole('button', { name: /Stand/i });
    fireEvent.click(standButton);
    
    // Check if API was called with correct parameters
    await waitFor(() => {
      expect(gameAPI.performGameAction).toHaveBeenCalledWith(123, 'stand');
    });
    
    // Check if result is displayed
    await waitFor(() => {
      expect(screen.getByText(/Player wins!/i)).toBeInTheDocument();
      expect(screen.getByText(/Dealer: 15/i)).toBeInTheDocument();
      expect(screen.getByText(/Payout: \$100.00/i)).toBeInTheDocument();
    });
    
    // Check if play again button appears
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Play Again/i })).toBeInTheDocument();
    });
  });

  test('performs double action correctly', async () => {
    renderComponent();
    
    // Start game first
    const betInput = screen.getByLabelText(/Bet Amount/i);
    fireEvent.change(betInput, { target: { value: '50' } });
    
    const dealButton = screen.getByRole('button', { name: /Deal/i });
    fireEvent.click(dealButton);
    
    // Wait for game to start
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Double/i })).toBeInTheDocument();
    });
    
    // Click double button
    const doubleButton = screen.getByRole('button', { name: /Double/i });
    fireEvent.click(doubleButton);
    
    // Check if API was called with correct parameters
    await waitFor(() => {
      expect(gameAPI.performGameAction).toHaveBeenCalledWith(123, 'double');
    });
    
    // Check if bet amount is doubled
    await waitFor(() => {
      expect(screen.getByText(/Bet: \$100.00/i)).toBeInTheDocument();
    });
    
    // Check if result is displayed
    await waitFor(() => {
      expect(screen.getByText(/Dealer wins with blackjack/i)).toBeInTheDocument();
    });
  });

  test('handles player bust correctly', async () => {
    // Override the hit action to simulate a bust
    gameAPI.performGameAction.mockResolvedValueOnce(mockBustResponse);
    
    renderComponent();
    
    // Start game first
    const betInput = screen.getByLabelText(/Bet Amount/i);
    fireEvent.change(betInput, { target: { value: '50' } });
    
    const dealButton = screen.getByRole('button', { name: /Deal/i });
    fireEvent.click(dealButton);
    
    // Wait for game to start
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Hit/i })).toBeInTheDocument();
    });
    
    // Click hit button
    const hitButton = screen.getByRole('button', { name: /Hit/i });
    fireEvent.click(hitButton);
    
    // Check if bust result is displayed
    await waitFor(() => {
      expect(screen.getByText(/Player busts/i)).toBeInTheDocument();
      expect(screen.getByText(/Player: 30/i)).toBeInTheDocument();
    });
  });

  test('validates minimum bet amount', async () => {
    renderComponent();
    
    // Set invalid bet amount
    const betInput = screen.getByLabelText(/Bet Amount/i);
    fireEvent.change(betInput, { target: { value: '0' } });
    
    // Click deal button
    const dealButton = screen.getByRole('button', { name: /Deal/i });
    fireEvent.click(dealButton);
    
    // Check for error message
    await waitFor(() => {
      expect(screen.getByText(/Minimum bet is \$5/i)).toBeInTheDocument();
    });
    
    // gameAPI.startGame should not be called
    expect(gameAPI.startGame).not.toHaveBeenCalled();
  });

  test('validates maximum bet amount', async () => {
    renderComponent();
    
    // Set bet amount over wallet balance
    const betInput = screen.getByLabelText(/Bet Amount/i);
    fireEvent.change(betInput, { target: { value: '1500' } });
    
    // Click deal button
    const dealButton = screen.getByRole('button', { name: /Deal/i });
    fireEvent.click(dealButton);
    
    // Check for error message
    await waitFor(() => {
      expect(screen.getByText(/Insufficient funds/i)).toBeInTheDocument();
    });
    
    // gameAPI.startGame should not be called
    expect(gameAPI.startGame).not.toHaveBeenCalled();
  });

  test('handles API errors gracefully', async () => {
    // Mock API error
    gameAPI.startGame.mockRejectedValueOnce(new Error('API Error'));
    
    renderComponent();
    
    // Set bet amount
    const betInput = screen.getByLabelText(/Bet Amount/i);
    fireEvent.change(betInput, { target: { value: '50' } });
    
    // Click deal button
    const dealButton = screen.getByRole('button', { name: /Deal/i });
    fireEvent.click(dealButton);
    
    // Check for error message
    await waitFor(() => {
      expect(screen.getByText(/Error: API Error/i)).toBeInTheDocument();
    });
  });

  test('starts a new game when Play Again button is clicked', async () => {
    renderComponent();
    
    // Start and complete a game first
    const betInput = screen.getByLabelText(/Bet Amount/i);
    fireEvent.change(betInput, { target: { value: '50' } });
    
    const dealButton = screen.getByRole('button', { name: /Deal/i });
    fireEvent.click(dealButton);
    
    // Wait for game to start
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Stand/i })).toBeInTheDocument();
    });
    
    // Click stand button to complete the game
    const standButton = screen.getByRole('button', { name: /Stand/i });
    fireEvent.click(standButton);
    
    // Wait for game to complete
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Play Again/i })).toBeInTheDocument();
    });
    
    // Reset the mock for startGame
    gameAPI.startGame.mockClear();
    
    // Click play again button
    const playAgainButton = screen.getByRole('button', { name: /Play Again/i });
    fireEvent.click(playAgainButton);
    
    // Check if we return to the bet screen
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Deal/i })).toBeInTheDocument();
    });
  });
}); 