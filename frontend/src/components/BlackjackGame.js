import React, { useState, useContext, useEffect } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import '../styles/BlackjackGame.css';

const BlackjackGame = () => {
  const { user, updateBalance } = useContext(AuthContext);
  const navigate = useNavigate();
  const [gameState, setGameState] = useState('betting'); // betting, playing, dealer, busted, result
  const [betAmount, setBetAmount] = useState(1);
  const [playerHands, setPlayerHands] = useState({});
  const [currentHand, setCurrentHand] = useState('main');
  const [dealerHand, setDealerHand] = useState([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [canDouble, setCanDouble] = useState(false);
  const [canSplit, setCanSplit] = useState(false);
  const [potentialBalance, setPotentialBalance] = useState(0);
  const [currentBalance, setCurrentBalance] = useState(0);
  const [handResults, setHandResults] = useState({});
  // Add a new state to track action history
  const [actionHistory, setActionHistory] = useState({});

  const API_BASE_URL = "http://127.0.0.1:8000/api";

  // Set up axios interceptor to include authentication
  useEffect(() => {
    const token = sessionStorage.getItem('token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      console.log("Setting auth token:", token);
    }
    
    // Add a request interceptor to ensure the token is always set
    axios.interceptors.request.use(
      config => {
        // Always check for the token before each request
        const currentToken = sessionStorage.getItem('token');
        if (currentToken) {
          config.headers.Authorization = `Bearer ${currentToken}`;
        }
        return config;
      },
      error => {
        return Promise.reject(error);
      }
    );
    
    // Add a response interceptor to handle authentication errors
    axios.interceptors.response.use(
      response => {
        return response;
      },
      error => {
        // Handle 401 Unauthorized errors
        if (error.response && error.response.status === 401) {
          console.error("Authentication error:", error.response.data);
          // Clear session storage and redirect to login if needed
          if (window.location.pathname !== '/login') {
            setError('Please log in to continue');
            // Avoid immediate redirect to prevent loops
            setTimeout(() => {
              navigate('/login');
            }, 1000);
          }
        }
        return Promise.reject(error);
      }
    );
  }, [navigate]);

  // Initialize balance from user context
  useEffect(() => {
    if (user && user.balance !== undefined) {
      setCurrentBalance(user.balance);
      setPotentialBalance(user.balance - betAmount);
    }
  }, [user]);

  // Update potential balance when bet amount changes
  useEffect(() => {
    if (currentBalance !== undefined) {
      setPotentialBalance(currentBalance - betAmount);
    }
  }, [betAmount, currentBalance]);

  // Function to start a new game
  const startGame = async () => {
    if (!user) {
      setError('Please log in to play');
      navigate('/login');
      return;
    }

    if (betAmount < 1 || betAmount > 500) {
      setError('Bet must be between $1 and $500');
      return;
    }

    if (betAmount > currentBalance) {
      setError('Insufficient balance');
      return;
    }

    try {
      // Get the token from session storage
      const token = sessionStorage.getItem('token');
      
      const response = await axios.post(`${API_BASE_URL}/blackjack/start/`, {
        user_id: user.id,
        bets: { main: betAmount }
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      console.log("Game start response:", response.data);
      
      // Handle the player_hands with potentially nested arrays
      let processedPlayerHands = {};
      
      if (response.data.player_hands) {
        // Process player hands - flatten nested arrays
        Object.entries(response.data.player_hands).forEach(([handKey, handCards]) => {
          // Check if we got an array of arrays (typical backend format)
          if (Array.isArray(handCards) && handCards.length > 0 && Array.isArray(handCards[0])) {
            // Flatten one level
            processedPlayerHands[handKey] = handCards.flat();
          } else {
            // Already flat or other format
            processedPlayerHands[handKey] = handCards;
          }
        });
        
        console.log("Processed player hands:", processedPlayerHands);
      } else {
        setError('No player hands received from server');
        return;
      }
      
      // Set the processed player hands
      setPlayerHands(processedPlayerHands);
      setCurrentHand('main');
      
      // Process dealer hand
      const dealerHand = response.data.dealer_hand || [];
      setDealerHand(dealerHand);
      
      setGameState('playing');
      setError('');
      setHandResults({});
      
      // Check if player can double/split based on the received hands
      const mainHand = processedPlayerHands.main || [];
      if (mainHand && mainHand.length >= 2) {
        setCanDouble(true);
        
        const card1 = mainHand[0];
        const card2 = mainHand[1];
        
        const canSplitValue = card1 && card2 && card1.rank === card2.rank;
        setCanSplit(canSplitValue);
      }
      
      // Update balance
      const newBalance = currentBalance - betAmount;
      setCurrentBalance(newBalance);
      updateBalance(newBalance);
    } catch (error) {
      console.error('Start game error:', error);
      setError(error.response?.data?.error || 'Failed to start game');
      if (error.response?.status === 401) {
        navigate('/login');
      }
    }
  };

  // Function to handle player actions (hit, stand, double, split)
  const handleAction = async (action) => {
    try {
      // Save current state before making the API call
      const currentHandState = {...playerHands};
      
      // Disable buttons during processing
      document.querySelectorAll('.game-controls button').forEach(btn => {
        btn.disabled = true;
      });

      // Ensure we have a valid user ID
      if (!user || !user.id) {
        setError('Please log in to play');
        navigate('/login');
        return;
      }
      
      // Get the token from session storage
      const token = sessionStorage.getItem('token');
      
      // Make API request for the action with explicit authentication header
      const response = await axios.post(`${API_BASE_URL}/blackjack/action/`, {
        user_id: user.id,
        action: action,
        hand: currentHand
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      // Log the API response for debugging
      console.log(`${action} API RESPONSE:`, response.data);
      
      // Initialize processedPlayerHands here so it's available in the whole function scope
      let processedPlayerHands = {...playerHands}; // Start with current hands as fallback
      
      // IMPORTANT: Process player_hands data
      if (response.data && response.data.player_hands) {
        // Process player hands data - convert nested arrays if needed
        processedPlayerHands = {};
        
        Object.entries(response.data.player_hands).forEach(([handKey, handCards]) => {
          // Check if we have an array of arrays (format inconsistency)
          if (Array.isArray(handCards) && handCards.length > 0) {
            if (Array.isArray(handCards[0]) && handCards.every(item => Array.isArray(item))) {
              // We got a nested array structure, flatten one level
              processedPlayerHands[handKey] = handCards.flat();
            } else {
              // Regular array of cards, keep as is
              processedPlayerHands[handKey] = handCards;
            }
          } else {
            // Other formats or empty arrays, keep as is
            processedPlayerHands[handKey] = handCards;
          }
        });
        
        // Update the player hands state with the processed data
        setPlayerHands(processedPlayerHands);
        
        // Update action history as well
        setActionHistory(prev => ({
          ...prev,
          [action]: {
            time: new Date().getTime(),
            playerHands: processedPlayerHands
          }
        }));
      }
      
      // Process dealer hand if available
      if (response.data && response.data.dealer_hand) {
        setDealerHand(response.data.dealer_hand);
      }
      
      // Check if this is a response with results (game complete)
      if (response.data.results) {
        // Set the results that came from the API
        setHandResults(response.data.results || {});
        
        // Check if a player bust occurred
        const isTrueBust = response.data.results[currentHand] === "Bust ❌";
        
        if (isTrueBust) {
          // If player busted, show the busted state first
          setMessage(`You busted with ${calculateHandValue(processedPlayerHands[currentHand] || [])}!`);
          setGameState('busted');
          
          // Wait before showing result
          setTimeout(() => {
            setGameState('result');
            
            // Update balance if provided
            if (response.data.new_balance !== undefined) {
              const newBalance = parseFloat(response.data.new_balance);
              setCurrentBalance(newBalance);
              updateBalance(newBalance);
            }
          }, 2000);
        } else {
          // For normal game completion, set game state to dealer first
          setGameState('dealer');
          
          // Wait before showing result
          setTimeout(() => {
            setGameState('result');
            
            // Update balance if provided
            if (response.data.new_balance !== undefined) {
              const newBalance = parseFloat(response.data.new_balance);
              setCurrentBalance(newBalance);
              updateBalance(newBalance);
            }
          }, 1500);
        }
        
        return;
      }
      
      // Normal response handling (action taken but game continues)
      if (action === 'hit') {
        // For HIT action - special handling
        const currentHandCards = processedPlayerHands?.[currentHand] || [];
        const handValue = calculateHandValue(currentHandCards);
        
        // No more double or split after hitting
        setCanDouble(false);
        setCanSplit(false);
        
        // Check if player busts
        if (handValue > 21) {
          // Create a copy of the current player hands to force update
          const updatedPlayerHands = {...processedPlayerHands};
          
          // Force the player hands update and explicitly wait for it
          setPlayerHands(updatedPlayerHands);
          
          // Mark the bust in hand results
          setHandResults(prev => ({
            ...prev,
            [currentHand]: "Bust ❌"
          }));
          
          // Set message
          setMessage(`You busted with ${handValue}!`);
          
          // Use a staggered timing approach to ensure all updates are processed
          setTimeout(() => {
            if (Object.keys(playerHands).length > 1) {
              // If multiple hands, move to the next one
              const allHandKeys = Object.keys(playerHands);
              const currentIndex = allHandKeys.indexOf(currentHand);
              
              if (currentIndex < allHandKeys.length - 1) {
                // Move to next hand
                setCurrentHand(allHandKeys[currentIndex + 1]);
                setCanDouble(false);
                setCanSplit(false);
              } else {
                // Process dealer if this was the last hand
                processDealer();
              }
            } else {
              // Process dealer for a single hand
              processDealer();
            }
          }, 1200);
        }
      }
      
      // Re-enable buttons
      setTimeout(() => {
        document.querySelectorAll('.game-controls button').forEach(btn => {
          btn.disabled = false;
        });
      }, 300);
      
    } catch (error) {
      console.error('Action error:', error);
      setError('Error during gameplay: ' + (error.response?.data?.error || error.message));
      
      // Re-enable buttons on error
      document.querySelectorAll('.game-controls button').forEach(btn => {
        btn.disabled = false;
      });
    }
  };

  // Process dealer action to complete the game
  const processDealer = async () => {
    try {
      console.log("Processing dealer...");
      
      // Ensure we have a valid user ID
      if (!user || !user.id) {
        setError('Please log in to play');
        navigate('/login');
        return;
      }
      
      // Get the token from session storage
      const token = sessionStorage.getItem('token');
      
      // Make API request to process dealer with explicit authentication header
      const response = await axios.post(`${API_BASE_URL}/blackjack/action/`, {
        user_id: user.id,
        action: 'stand',
        hand: currentHand,
        process_dealer: true
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log("Dealer processing response:", response.data);
      
      // Ensure we have valid dealer hand
      if (response.data.dealer_hand) {
        let formattedDealerHand = response.data.dealer_hand;
        
        // Handle nested array case
        if (Array.isArray(formattedDealerHand) && formattedDealerHand.length > 0 && 
            Array.isArray(formattedDealerHand[0]) && formattedDealerHand.every(item => Array.isArray(item))) {
          formattedDealerHand = formattedDealerHand.flat();
        }
        
        // Update the dealer's hand
        setDealerHand(formattedDealerHand);
      }
      
      // Set the game state to 'dealer' to show dealer action animation
      setGameState('dealer');
      
      // After a delay to show dealer action, move to results
      setTimeout(() => {
        // Set the results if provided
        if (response.data.results) {
          setHandResults(response.data.results);
        }
        
        // Change to result state
        setGameState('result');
        
        // Update balance if provided
        if (response.data.new_balance !== undefined) {
          const newBalance = parseFloat(response.data.new_balance);
          setCurrentBalance(newBalance);
          updateBalance(newBalance);
        }
      }, 1500);
    } catch (error) {
      console.error('Dealer processing error:', error);
      setError('Error during dealer processing: ' + (error.response?.data?.error || error.message));
      
      // If there's an error with dealer processing, still try to move to result state
      setGameState('result');
    }
  };

  // Calculate the value of a hand
  const calculateHandValue = (hand) => {
    if (!hand || !Array.isArray(hand)) {
      return 0;
    }
    
    let value = 0;
    let aces = 0;

    hand.forEach(card => {
      // Handle array of arrays case
      let cardToProcess = card;
      if (Array.isArray(card)) {
        cardToProcess = card[0];
      }

      // Skip if card is 'Hidden' or not an object
      if (cardToProcess === 'Hidden' || typeof cardToProcess !== 'object') {
        return;
      }

      if (cardToProcess.rank === 'A') {
        aces += 1;
        value += 11;
      } else if (['K', 'Q', 'J'].includes(cardToProcess.rank)) {
        value += 10;
      } else {
        value += parseInt(cardToProcess.rank) || 0;
      }
    });

    while (value > 21 && aces > 0) {
      value -= 10;
      aces -= 1;
    }

    return value;
  };

  // Render a card
  const renderCard = (card, index, handArray) => {
    // Debug logging to help diagnose issues
    if (index === 0) {
      console.log(`Rendering hand with ${handArray?.length} cards:`, handArray);
    }
    
    if (!card) {
      console.warn("Attempted to render null/undefined card");
      return null;
    }
    
    if (card === 'Hidden') {
      return <div key={index} className="card hidden">?</div>;
    }

    // Handle different card formats from API
    // Sometimes we get an array within an array from backend
    if (Array.isArray(card)) {
      console.log("Card is an array:", card);
      card = card[0]; // Take the first card from the array
    }
    
    if (!card || typeof card !== 'object') {
      console.warn("Invalid card format after processing:", card);
      return <div key={index} className="card invalid">Invalid</div>;
    }

    // Check if this is the last card in a busted hand
    const isLastCard = index === handArray.length - 1;
    const handValue = calculateHandValue(handArray);
    const isBustedHand = handValue > 21;
    
    // Determine if this is a bust card - either explicitly marked or inferred
    const isBustCard = (isLastCard && isBustedHand) || card.isBustCard;
    
    // Determine if this is a double card
    const isDoubleCard = card.isDoubleCard;
    
    // Create class names 
    const cardSuit = card.suit?.toLowerCase() || '';
    let cardClasses = `card ${cardSuit}`;
    if (isBustCard) {
      cardClasses += ' subtle-bust-card';
    } else if (isDoubleCard) {
      cardClasses += ' double-card';
    }
    
    return (
      <div key={index} className={cardClasses}>
        <div className="card-value">{card.rank || '?'}</div>
        <div className="card-suit">{getSuitSymbol(card.suit)}</div>
        {isBustCard && <div className="subtle-bust-indicator">Bust</div>}
        {isDoubleCard && !isBustCard && <div className="double-indicator">Double</div>}
      </div>
    );
  };

  // Get suit symbol
  const getSuitSymbol = (suit) => {
    switch (suit) {
      case '♥': return '♥';
      case '♦': return '♦';
      case '♣': return '♣';
      case '♠': return '♠';
      default: return suit || '';
    }
  };

  // Reset the game
  const resetGame = () => {
    // Instead of relying on an API call, just reset the frontend state
    // This ensures the New Game button always works, even if there's an API issue
    console.log("Resetting game to betting state");
    
    // Reset all state variables
    setGameState('betting');
    setBetAmount(1);
    setPlayerHands({});
    setCurrentHand('main');
    setDealerHand([]);
    setMessage('');
    setError('');
    setCanDouble(false);
    setCanSplit(false);
    setHandResults({});
    
    // Try to reset on the backend as well, but don't depend on it
    try {
      // Get the token from session storage
      const token = sessionStorage.getItem('token');
      
      axios.post(`${API_BASE_URL}/blackjack/reset/`, {
        user_id: user.id
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }).catch(err => {
        // Silently handle the error - frontend is already reset
        console.log("Backend reset failed, but frontend is reset:", err);
      });
    } catch (error) {
      // Ignore errors - the frontend is already reset
      console.log("Error in backend reset, frontend still reset");
    }
  };

  // Get a label for a hand
  const getHandLabel = (handKey) => {
    if (handKey === 'main') {
      return 'Hand 1';
    } else if (handKey.startsWith('split_')) {
      return `Hand ${handKey.replace('split_', '')}`;
    }
    return handKey;
  };

  // Add a function to handle temporary balance increase for testing
  const addTestBalance = async () => {
    try {
      // Update local state first for immediate feedback
      const newBalance = currentBalance + 50;
      setCurrentBalance(newBalance);
      setPotentialBalance(newBalance - betAmount);
      
      // Then update the backend if possible
      if (user && user.id) {
        try {
          // Get the token from session storage
          const token = sessionStorage.getItem('token');
          
          // Try to update balance on backend
          await axios.post(`${API_BASE_URL}/users/update-balance/`, {
            user_id: user.id,
            new_balance: newBalance
          }, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          // Update context
          updateBalance(newBalance);
        } catch (error) {
          console.log("Backend balance update failed, but UI is updated:", error);
          // Still update the context even if backend fails
          updateBalance(newBalance);
        }
      }
    } catch (error) {
      console.error("Error adding test balance:", error);
    }
  };

  return (
    <div className="blackjack-container">
      <h1>Blackjack</h1>
      
      {error && <p className="error-message">{error}</p>}
      {message && <p className="game-message">{message}</p>}

      {gameState === 'betting' && (
        <div className="betting-interface">
          <div className="balance-display">
            Current Balance: ${currentBalance.toFixed(2)}
            {betAmount > 0 && (
              <div className="potential-balance">
                Balance After Bet: ${potentialBalance.toFixed(2)}
              </div>
            )}
          </div>
          <div className="bet-controls">
            <input
              type="number"
              min="1"
              max={Math.min(500, currentBalance)}
              value={betAmount}
              onChange={(e) => setBetAmount(parseInt(e.target.value) || 1)}
              placeholder="Enter bet amount"
            />
            <button 
              onClick={startGame} 
              disabled={!betAmount || betAmount > currentBalance || !user}
            >
              Start Game
            </button>
            
            {/* Temporary testing button */}
            <button 
              onClick={addTestBalance}
              className="test-button"
              style={{ 
                marginTop: '10px', 
                backgroundColor: '#666', 
                color: 'white',
                border: '1px dashed #FFD700'
              }}
            >
              + Add $50 (Testing)
            </button>
          </div>
        </div>
      )}

      {(gameState === 'playing' || gameState === 'dealer' || gameState === 'result' || gameState === 'busted') && (
        <div className="game-interface">
          <div className="dealer-hand">
            <h2>Dealer's Hand {gameState === 'result' && `(${calculateHandValue(dealerHand)})`}</h2>
            <div className="cards">
              {Array.isArray(dealerHand) && dealerHand.map((card, index) => 
                renderCard(card, index, dealerHand)
              )}
            </div>
            {gameState === 'result' && (
              <div className="hand-value">
                Dealer Value: {calculateHandValue(dealerHand)}
              </div>
            )}
          </div>

          <div className="player-hands">
            {Object.entries(playerHands).map(([handKey, hand]) => {
              // Check if this hand is busted
              const handValue = calculateHandValue(hand);
              const isBusted = handValue > 21;
              const handClasses = `player-hand ${handKey === currentHand && gameState === 'playing' ? 'active-hand' : ''} ${isBusted ? 'busted-hand' : ''}`;
              
              return (
                <div 
                  key={handKey} 
                  className={handClasses}
                  data-hand-key={handKey}
                >
                  <h2>
                    {getHandLabel(handKey)} 
                    {handKey === currentHand && gameState === 'playing' && ' (Active)'}
                    {isBusted && ' (Busted)'}
                    {gameState === 'result' && ` (${handValue})`}
                  </h2>
                  <div className="cards">
                    {Array.isArray(hand) && hand.map((card, index) => {
                      console.log(`Rendering card ${index} of ${hand.length} for ${handKey}:`, card);
                      return renderCard(card, index, hand);
                    })}
                  </div>
                  <div className="hand-value">
                    Value: {handValue}
                    {gameState === 'result' && handResults[handKey] && (
                      <span className="hand-result"> - {handResults[handKey]}</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {gameState === 'playing' && (
            <div className="game-controls">
              <button onClick={() => handleAction('hit')}>Hit</button>
              <button onClick={() => handleAction('stand')}>Stand</button>
              {canDouble && <button onClick={() => handleAction('double')}>Double</button>}
              {canSplit && <button onClick={() => handleAction('split')}>Split</button>}
              <div className="current-hand-indicator">
                Playing: {getHandLabel(currentHand)}
              </div>
            </div>
          )}

          {(gameState === 'dealer' || gameState === 'busted') && (
            <div className="dealer-message">
              {gameState === 'busted' ? "You busted..." : "Dealer is playing..."}
            </div>
          )}

          {gameState === 'result' && (
            <button onClick={resetGame} className="new-game-btn">
              New Game
            </button>
          )}
        </div>
      )}
    </div>
  );
};

export default BlackjackGame; 