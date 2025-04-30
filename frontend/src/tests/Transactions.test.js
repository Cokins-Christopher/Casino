import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import Transactions from '../../../components/Transactions';
import { AuthContext } from '../../../contexts/AuthContext';
import * as transactionAPI from '../../../api/transactionAPI';

// Mock the transaction API module
jest.mock('../../../api/transactionAPI');

describe('Transactions Component', () => {
  // Mock user data for AuthContext
  const mockUser = {
    id: 1,
    username: 'testuser',
    token: 'mocktoken123'
  };
  
  // Mock transactions data
  const mockTransactions = [
    {
      id: 1,
      amount: '500.00',
      transaction_type: 'deposit',
      payment_method: 'credit_card',
      status: 'completed',
      created_at: '2023-05-15T10:30:00Z'
    },
    {
      id: 2,
      amount: '200.00',
      transaction_type: 'withdrawal',
      payment_method: 'bank_transfer',
      status: 'pending',
      created_at: '2023-05-14T14:20:00Z'
    },
    {
      id: 3,
      amount: '50.00',
      transaction_type: 'game_bet',
      game_type: 'blackjack',
      game_id: '123',
      status: 'completed',
      created_at: '2023-05-13T19:45:00Z'
    },
    {
      id: 4,
      amount: '150.00',
      transaction_type: 'game_winning',
      game_type: 'blackjack',
      game_id: '123',
      status: 'completed',
      created_at: '2023-05-13T20:00:00Z'
    }
  ];
  
  // Mock transaction detail
  const mockTransactionDetail = {
    id: 1,
    amount: '500.00',
    transaction_type: 'deposit',
    payment_method: 'credit_card',
    status: 'completed',
    created_at: '2023-05-15T10:30:00Z',
    updated_at: '2023-05-15T10:32:00Z',
    notes: 'Deposit via VISA card ending in 4242',
    transaction_fee: '0.00',
    payment_details: {
      card_type: 'VISA',
      last_four: '4242'
    }
  };
  
  // Mock wallet info
  const mockWallet = {
    balance: '1450.00',
    currency: 'USD',
    last_deposit: '2023-05-15T10:30:00Z',
    last_withdrawal: '2023-05-14T14:20:00Z'
  };

  // Setup before each test
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Mock API calls
    transactionAPI.getTransactionList.mockResolvedValue(mockTransactions);
    transactionAPI.getTransactionDetail.mockResolvedValue(mockTransactionDetail);
    transactionAPI.getWalletInfo.mockResolvedValue(mockWallet);
  });

  // Helper function to render component with context
  const renderComponent = () => {
    return render(
      <AuthContext.Provider value={{ user: mockUser, isAuthenticated: true }}>
        <Transactions />
      </AuthContext.Provider>
    );
  };

  test('renders transactions page with wallet summary', async () => {
    renderComponent();
    
    // Check for page title
    expect(screen.getByText(/Transactions/i)).toBeInTheDocument();
    
    // Check if wallet info is displayed
    await waitFor(() => {
      expect(screen.getByText(/Current Balance/i)).toBeInTheDocument();
      expect(screen.getByText(/\$1,450.00/i)).toBeInTheDocument();
    });
    
    // Check for transaction buttons
    expect(screen.getByText(/Deposit/i)).toBeInTheDocument();
    expect(screen.getByText(/Withdraw/i)).toBeInTheDocument();
  });

  test('displays transaction history table', async () => {
    renderComponent();
    
    // Check for table headers
    await waitFor(() => {
      expect(screen.getByText(/Transaction ID/i)).toBeInTheDocument();
      expect(screen.getByText(/Type/i)).toBeInTheDocument();
      expect(screen.getByText(/Amount/i)).toBeInTheDocument();
      expect(screen.getByText(/Date/i)).toBeInTheDocument();
      expect(screen.getByText(/Status/i)).toBeInTheDocument();
    });
    
    // Check for transaction data
    await waitFor(() => {
      expect(screen.getByText('#1')).toBeInTheDocument();
      expect(screen.getByText(/Deposit/i)).toBeInTheDocument();
      expect(screen.getByText(/\$500.00/i)).toBeInTheDocument();
      expect(screen.getByText(/pending/i)).toBeInTheDocument();
    });
  });

  test('filters transactions by type', async () => {
    renderComponent();
    
    // Find filter dropdown
    await waitFor(() => {
      expect(screen.getByLabelText(/Filter by Type/i)).toBeInTheDocument();
    });
    
    // Select deposit filter
    const filterDropdown = screen.getByLabelText(/Filter by Type/i);
    fireEvent.change(filterDropdown, { target: { value: 'deposit' } });
    
    // Check if API was called with correct filter
    await waitFor(() => {
      expect(transactionAPI.getTransactionList).toHaveBeenCalledWith({ type: 'deposit' });
    });
  });

  test('filters transactions by date range', async () => {
    renderComponent();
    
    // Find date filters
    await waitFor(() => {
      expect(screen.getByLabelText(/Start Date/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/End Date/i)).toBeInTheDocument();
    });
    
    // Set date range
    const startDateInput = screen.getByLabelText(/Start Date/i);
    const endDateInput = screen.getByLabelText(/End Date/i);
    
    fireEvent.change(startDateInput, { target: { value: '2023-05-01' } });
    fireEvent.change(endDateInput, { target: { value: '2023-05-31' } });
    
    // Click apply filter button
    const applyButton = screen.getByRole('button', { name: /Apply Filters/i });
    fireEvent.click(applyButton);
    
    // Check if API was called with correct filter
    await waitFor(() => {
      expect(transactionAPI.getTransactionList).toHaveBeenCalledWith({
        start_date: '2023-05-01',
        end_date: '2023-05-31'
      });
    });
  });

  test('paginates through transactions', async () => {
    // Mock paginated response
    transactionAPI.getTransactionList.mockResolvedValueOnce({
      results: mockTransactions.slice(0, 2),
      total_count: 4,
      page: 1,
      page_size: 2,
      total_pages: 2
    });
    
    renderComponent();
    
    // Check for pagination controls
    await waitFor(() => {
      expect(screen.getByText(/Page 1 of 2/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Next Page/i)).toBeInTheDocument();
    });
    
    // Click next page
    const nextPageButton = screen.getByLabelText(/Next Page/i);
    fireEvent.click(nextPageButton);
    
    // Check if API was called with correct page
    await waitFor(() => {
      expect(transactionAPI.getTransactionList).toHaveBeenCalledWith({ page: 2 });
    });
  });

  test('shows transaction details when clicking on a transaction', async () => {
    renderComponent();
    
    // Wait for transactions to load
    await waitFor(() => {
      expect(screen.getByText('#1')).toBeInTheDocument();
    });
    
    // Click on a transaction
    const transactionRow = screen.getByText('#1').closest('tr');
    fireEvent.click(transactionRow);
    
    // Check if API was called to get transaction details
    await waitFor(() => {
      expect(transactionAPI.getTransactionDetail).toHaveBeenCalledWith(1);
    });
    
    // Check if modal with details is shown
    await waitFor(() => {
      expect(screen.getByText(/Transaction Details/i)).toBeInTheDocument();
      expect(screen.getByText(/Deposit via VISA card ending in 4242/i)).toBeInTheDocument();
      expect(screen.getByText(/VISA \*\*\*\*4242/i)).toBeInTheDocument();
    });
  });

  test('opens deposit modal when clicking deposit button', async () => {
    renderComponent();
    
    // Click deposit button
    const depositButton = screen.getByText(/Deposit/i);
    fireEvent.click(depositButton);
    
    // Check if deposit modal is shown
    await waitFor(() => {
      expect(screen.getByText(/Make a Deposit/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Amount/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Payment Method/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Deposit/i })).toBeInTheDocument();
    });
  });

  test('submits deposit form with valid data', async () => {
    // Mock successful deposit
    transactionAPI.createTransaction.mockResolvedValueOnce({
      id: 5,
      amount: '100.00',
      transaction_type: 'deposit',
      payment_method: 'credit_card',
      status: 'completed'
    });
    
    renderComponent();
    
    // Open deposit modal
    const depositButton = screen.getByText(/Deposit/i);
    fireEvent.click(depositButton);
    
    // Fill deposit form
    await waitFor(() => {
      const amountInput = screen.getByLabelText(/Amount/i);
      const methodSelect = screen.getByLabelText(/Payment Method/i);
      
      fireEvent.change(amountInput, { target: { value: '100' } });
      fireEvent.change(methodSelect, { target: { value: 'credit_card' } });
      
      // Mock credit card form fields
      const cardNumberInput = screen.getByLabelText(/Card Number/i);
      const expiryInput = screen.getByLabelText(/Expiry/i);
      const cvvInput = screen.getByLabelText(/CVV/i);
      
      fireEvent.change(cardNumberInput, { target: { value: '4242424242424242' } });
      fireEvent.change(expiryInput, { target: { value: '12/25' } });
      fireEvent.change(cvvInput, { target: { value: '123' } });
    });
    
    // Submit form
    const submitButton = screen.getByRole('button', { name: /Deposit/i });
    fireEvent.click(submitButton);
    
    // Check if API was called with correct data
    await waitFor(() => {
      expect(transactionAPI.createTransaction).toHaveBeenCalledWith({
        amount: '100.00',
        transaction_type: 'deposit',
        payment_method: 'credit_card',
        card_details: {
          number: '4242424242424242',
          expiry: '12/25',
          cvv: '123'
        }
      });
    });
    
    // Check for success message
    await waitFor(() => {
      expect(screen.getByText(/Deposit Successful/i)).toBeInTheDocument();
    });
  });

  test('shows error when deposit form has invalid data', async () => {
    renderComponent();
    
    // Open deposit modal
    const depositButton = screen.getByText(/Deposit/i);
    fireEvent.click(depositButton);
    
    // Submit without filling in required fields
    const submitButton = screen.getByRole('button', { name: /Deposit/i });
    fireEvent.click(submitButton);
    
    // Check for validation errors
    await waitFor(() => {
      expect(screen.getByText(/Amount is required/i)).toBeInTheDocument();
      expect(screen.getByText(/Payment method is required/i)).toBeInTheDocument();
    });
    
    // API should not be called
    expect(transactionAPI.createTransaction).not.toHaveBeenCalled();
  });

  test('opens withdraw modal when clicking withdraw button', async () => {
    renderComponent();
    
    // Click withdraw button
    const withdrawButton = screen.getByText(/Withdraw/i);
    fireEvent.click(withdrawButton);
    
    // Check if withdraw modal is shown
    await waitFor(() => {
      expect(screen.getByText(/Request a Withdrawal/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Amount/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/Withdrawal Method/i)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /Withdraw/i })).toBeInTheDocument();
    });
  });

  test('submits withdrawal form with valid data', async () => {
    // Mock successful withdrawal
    transactionAPI.createTransaction.mockResolvedValueOnce({
      id: 6,
      amount: '100.00',
      transaction_type: 'withdrawal',
      payment_method: 'bank_transfer',
      status: 'pending'
    });
    
    renderComponent();
    
    // Open withdraw modal
    const withdrawButton = screen.getByText(/Withdraw/i);
    fireEvent.click(withdrawButton);
    
    // Fill withdrawal form
    await waitFor(() => {
      const amountInput = screen.getByLabelText(/Amount/i);
      const methodSelect = screen.getByLabelText(/Withdrawal Method/i);
      
      fireEvent.change(amountInput, { target: { value: '100' } });
      fireEvent.change(methodSelect, { target: { value: 'bank_transfer' } });
      
      // Mock bank details form fields
      const bankNameInput = screen.getByLabelText(/Bank Name/i);
      const accountNumberInput = screen.getByLabelText(/Account Number/i);
      const routingNumberInput = screen.getByLabelText(/Routing Number/i);
      
      fireEvent.change(bankNameInput, { target: { value: 'Test Bank' } });
      fireEvent.change(accountNumberInput, { target: { value: '123456789' } });
      fireEvent.change(routingNumberInput, { target: { value: '987654321' } });
    });
    
    // Submit form
    const submitButton = screen.getByRole('button', { name: /Withdraw/i });
    fireEvent.click(submitButton);
    
    // Check if API was called with correct data
    await waitFor(() => {
      expect(transactionAPI.createTransaction).toHaveBeenCalledWith({
        amount: '100.00',
        transaction_type: 'withdrawal',
        payment_method: 'bank_transfer',
        bank_details: {
          bank_name: 'Test Bank',
          account_number: '123456789',
          routing_number: '987654321'
        }
      });
    });
    
    // Check for success message
    await waitFor(() => {
      expect(screen.getByText(/Withdrawal Request Submitted/i)).toBeInTheDocument();
    });
  });

  test('exports transaction history as CSV', async () => {
    // Mock CSV data
    const mockCsvData = 'id,amount,type,date,status\n1,500.00,deposit,2023-05-15,completed\n2,200.00,withdrawal,2023-05-14,pending';
    transactionAPI.exportTransactions.mockResolvedValueOnce(mockCsvData);
    
    renderComponent();
    
    // Wait for transactions to load
    await waitFor(() => {
      expect(screen.getByText('#1')).toBeInTheDocument();
    });
    
    // Click export button
    const exportButton = screen.getByRole('button', { name: /Export/i });
    fireEvent.click(exportButton);
    
    // Check if API was called
    await waitFor(() => {
      expect(transactionAPI.exportTransactions).toHaveBeenCalled();
    });
    
    // In a real component, this would trigger a download
    // Here we just verify the API call happened
  });

  test('displays empty state when no transactions', async () => {
    // Mock empty transactions list
    transactionAPI.getTransactionList.mockResolvedValueOnce([]);
    
    renderComponent();
    
    // Check for empty state message
    await waitFor(() => {
      expect(screen.getByText(/No transactions found/i)).toBeInTheDocument();
      expect(screen.getByText(/Make your first deposit to start playing/i)).toBeInTheDocument();
    });
  });

  test('handles API errors gracefully', async () => {
    // Mock API error
    transactionAPI.getTransactionList.mockRejectedValueOnce(new Error('Failed to load transactions'));
    
    renderComponent();
    
    // Check for error message
    await waitFor(() => {
      expect(screen.getByText(/Error loading transactions/i)).toBeInTheDocument();
      expect(screen.getByText(/Failed to load transactions/i)).toBeInTheDocument();
    });
    
    // Check for retry button
    const retryButton = screen.getByRole('button', { name: /Retry/i });
    expect(retryButton).toBeInTheDocument();
    
    // Click retry button
    fireEvent.click(retryButton);
    
    // API should be called again
    await waitFor(() => {
      expect(transactionAPI.getTransactionList).toHaveBeenCalledTimes(2);
    });
  });
}); 