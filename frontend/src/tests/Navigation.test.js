import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter, MemoryRouter, Routes, Route } from 'react-router-dom';
import Navigation from '../../../components/Navigation';
import { AuthContext } from '../../../contexts/AuthContext';

// Mock navigation routes
jest.mock('../../../components/Dashboard', () => () => <div>Dashboard</div>);
jest.mock('../../../components/BlackjackGame', () => () => <div>Blackjack</div>);
jest.mock('../../../components/Profile', () => () => <div>Profile</div>);

// Mock react-router-dom's useNavigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate
}));

describe('Navigation Component', () => {
  // Mock authenticated user data
  const mockAuthenticatedUser = {
    user: {
      id: 1,
      username: 'testuser',
      token: 'token123'
    },
    isAuthenticated: true,
    login: jest.fn(),
    logout: jest.fn()
  };
  
  // Mock unauthenticated user state
  const mockUnauthenticatedUser = {
    user: null,
    isAuthenticated: false,
    login: jest.fn(),
    logout: jest.fn()
  };

  // Helper function to render component with context
  const renderWithAuth = (authState = mockAuthenticatedUser) => {
    return render(
      <AuthContext.Provider value={authState}>
        <BrowserRouter>
          <Navigation />
        </BrowserRouter>
      </AuthContext.Provider>
    );
  };

  test('renders navigation bar correctly when authenticated', () => {
    renderWithAuth();
    
    // Check for casino logo/brand
    expect(screen.getByText(/Casino/i)).toBeInTheDocument();
    
    // Check for navigation links
    expect(screen.getByText(/Dashboard/i)).toBeInTheDocument();
    expect(screen.getByText(/Games/i)).toBeInTheDocument();
    expect(screen.getByText(/Transactions/i)).toBeInTheDocument();
    
    // Check for user menu
    expect(screen.getByText(/testuser/i)).toBeInTheDocument();
  });

  test('renders authentication links when not authenticated', () => {
    renderWithAuth(mockUnauthenticatedUser);
    
    // Check for login and register links
    expect(screen.getByText(/Login/i)).toBeInTheDocument();
    expect(screen.getByText(/Register/i)).toBeInTheDocument();
    
    // User menu should not be visible
    expect(screen.queryByText(/testuser/i)).not.toBeInTheDocument();
  });

  test('user menu dropdown works correctly', async () => {
    renderWithAuth();
    
    // Click user menu to open dropdown
    const userMenu = screen.getByText(/testuser/i);
    fireEvent.click(userMenu);
    
    // Dropdown items should be visible
    await waitFor(() => {
      expect(screen.getByText(/Profile/i)).toBeInTheDocument();
      expect(screen.getByText(/Account Settings/i)).toBeInTheDocument();
      expect(screen.getByText(/Logout/i)).toBeInTheDocument();
    });
  });

  test('clicking logout calls logout function', async () => {
    renderWithAuth();
    
    // Open user menu
    const userMenu = screen.getByText(/testuser/i);
    fireEvent.click(userMenu);
    
    // Click logout
    await waitFor(() => {
      const logoutButton = screen.getByText(/Logout/i);
      fireEvent.click(logoutButton);
    });
    
    // Check if logout function was called
    expect(mockAuthenticatedUser.logout).toHaveBeenCalledTimes(1);
  });

  test('games dropdown shows available games', async () => {
    renderWithAuth();
    
    // Click games menu to open dropdown
    const gamesMenu = screen.getByText(/Games/i);
    fireEvent.click(gamesMenu);
    
    // Game options should be visible
    await waitFor(() => {
      expect(screen.getByText(/Blackjack/i)).toBeInTheDocument();
      expect(screen.getByText(/Poker/i)).toBeInTheDocument();
      expect(screen.getByText(/Slots/i)).toBeInTheDocument();
      expect(screen.getByText(/Roulette/i)).toBeInTheDocument();
    });
  });

  test('clicking a game navigates to the game page', async () => {
    renderWithAuth();
    
    // Open games menu
    const gamesMenu = screen.getByText(/Games/i);
    fireEvent.click(gamesMenu);
    
    // Click blackjack
    await waitFor(() => {
      const blackjackLink = screen.getByText(/Blackjack/i);
      fireEvent.click(blackjackLink);
    });
    
    // Check if navigation happened
    expect(mockNavigate).toHaveBeenCalledWith('/games/blackjack');
  });

  test('clicking login navigates to login page', () => {
    renderWithAuth(mockUnauthenticatedUser);
    
    // Click login
    const loginButton = screen.getByText(/Login/i);
    fireEvent.click(loginButton);
    
    // Check if navigation happened
    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });

  test('clicking register navigates to register page', () => {
    renderWithAuth(mockUnauthenticatedUser);
    
    // Click register
    const registerButton = screen.getByText(/Register/i);
    fireEvent.click(registerButton);
    
    // Check if navigation happened
    expect(mockNavigate).toHaveBeenCalledWith('/register');
  });

  test('navigation is responsive and shows hamburger menu on mobile', () => {
    // Mock window.innerWidth for mobile view
    global.innerWidth = 480;
    global.dispatchEvent(new Event('resize'));
    
    renderWithAuth();
    
    // Hamburger menu should be visible
    expect(screen.getByLabelText(/menu/i)).toBeInTheDocument();
    
    // Navigation links should be hidden
    expect(screen.queryByText(/Dashboard/i)).not.toBeInTheDocument();
    
    // Click hamburger to open menu
    const hamburgerMenu = screen.getByLabelText(/menu/i);
    fireEvent.click(hamburgerMenu);
    
    // Navigation links should now be visible
    expect(screen.getByText(/Dashboard/i)).toBeInTheDocument();
    
    // Reset window size
    global.innerWidth = 1024;
    global.dispatchEvent(new Event('resize'));
  });

  test('highlights active navigation item based on current route', () => {
    // Render with MemoryRouter to control the current route
    render(
      <AuthContext.Provider value={mockAuthenticatedUser}>
        <MemoryRouter initialEntries={['/dashboard']}>
          <Routes>
            <Route path="*" element={<Navigation />} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    );
    
    // Dashboard link should have active class
    const dashboardLink = screen.getByText(/Dashboard/i).closest('a');
    expect(dashboardLink).toHaveClass('active');
    
    // Other links should not have active class
    const gamesLink = screen.getByText(/Games/i).closest('a');
    expect(gamesLink).not.toHaveClass('active');
  });

  test('shows notification indicator when notifications exist', () => {
    // Mock notifications data
    const mockAuthWithNotifications = {
      ...mockAuthenticatedUser,
      notifications: {
        count: 3,
        hasUnread: true
      }
    };
    
    renderWithAuth(mockAuthWithNotifications);
    
    // Notification bell should be visible
    const notificationBell = screen.getByLabelText(/notifications/i);
    expect(notificationBell).toBeInTheDocument();
    
    // Notification count should be visible
    expect(screen.getByText('3')).toBeInTheDocument();
  });

  test('clicking notification bell shows notification panel', async () => {
    // Mock notifications data
    const mockAuthWithNotifications = {
      ...mockAuthenticatedUser,
      notifications: {
        count: 2,
        hasUnread: true,
        items: [
          { id: 1, text: 'You received a bonus!', read: false },
          { id: 2, text: 'Your withdrawal has been processed', read: true }
        ]
      }
    };
    
    renderWithAuth(mockAuthWithNotifications);
    
    // Click notification bell
    const notificationBell = screen.getByLabelText(/notifications/i);
    fireEvent.click(notificationBell);
    
    // Notification panel should be visible with notifications
    await waitFor(() => {
      expect(screen.getByText(/You received a bonus!/i)).toBeInTheDocument();
      expect(screen.getByText(/Your withdrawal has been processed/i)).toBeInTheDocument();
    });
    
    // Unread notification should have special styling
    const unreadNotification = screen.getByText(/You received a bonus!/i).closest('div');
    expect(unreadNotification).toHaveClass('unread');
  });

  test('shows balance in header when authenticated', () => {
    // Mock user with balance
    const mockAuthWithBalance = {
      ...mockAuthenticatedUser,
      user: {
        ...mockAuthenticatedUser.user,
        balance: '1000.00'
      }
    };
    
    renderWithAuth(mockAuthWithBalance);
    
    // Balance should be visible
    expect(screen.getByText(/\$1,000.00/i)).toBeInTheDocument();
  });
}); 