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
    }
  }, []);

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
      const response = await axios.post(`${API_BASE_URL}/blackjack/start/`, {
        user_id: user.id,
        bets: { main: betAmount }
      });

      const { player_hands, dealer_hand } = response.data;
      
      if (!player_hands || !player_hands.main) {
        throw new Error('Invalid game data received');
      }
      
      setPlayerHands(player_hands);
      setCurrentHand('main');
      setDealerHand(dealer_hand);
      setGameState('playing');
      setError('');
      setHandResults({});
      
      // Check if player can double/split
      if (player_hands.main && player_hands.main.length >= 2) {
        setCanDouble(true);
        const card1 = player_hands.main[0];
        const card2 = player_hands.main[1];
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

      // Make API request for the action
      const response = await axios.post(`${API_BASE_URL}/blackjack/action/`, {
        user_id: user.id,
        action: action,
        hand: currentHand
      });

      // CRITICAL: Log the COMPLETE raw API response
      console.log(`FULL ${action} API RESPONSE:`, JSON.stringify(response.data, null, 2));
      
      // IMPORTANT: The API now should include player_hands even in bust/complete responses
      // If it doesn't (backward compatibility), we can fetch it using the last_action endpoint
      
      // Check if we need to fetch player_hands separately (if the response doesn't include it)
      if (!response.data.player_hands && response.data.results) {
        try {
          // Attempt to fetch player_hands using the last_action endpoint
          const lastActionResponse = await axios.post(`${API_BASE_URL}/blackjack/last_action/`, {
            user_id: user.id
          });
          
          if (lastActionResponse.data && lastActionResponse.data.player_hands) {
            // Add player_hands to our response
            response.data.player_hands = lastActionResponse.data.player_hands;
            console.log("Retrieved player_hands from last_action endpoint:", 
              JSON.stringify(response.data.player_hands, null, 2));
          }
        } catch (error) {
          console.log("Error fetching player_hands from last_action:", error);
        }
      }
      
      // Always update player hands from response if available
      if (response.data && response.data.player_hands) {
        // Save the latest player hands
        setPlayerHands(response.data.player_hands);
        
        // Also update our action history
        setActionHistory(prev => ({
          ...prev,
          [action]: {
            time: new Date().getTime(),
            playerHands: response.data.player_hands
          }
        }));
      }
      
      // Check if this is a response with results (game complete)
      if (response.data.results) {
        // Set dealer hand from response data
        setDealerHand(response.data.dealer_hand);
        
        // Set the results that came from the API
        setHandResults(response.data.results || {});
        
        // Check if a player bust occurred
        const isTrueBust = response.data.results[currentHand] === "Bust ❌";
        
        if (isTrueBust) {
          // If player busted, show the busted state first
          setMessage(`You busted with ${calculateHandValue(response.data.player_hands[currentHand])}!`);
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
      if (response.data && response.data.player_hands) {
        // For HIT action - special handling
        if (action === 'hit') {
          const currentHandCards = response.data.player_hands[currentHand];
          const handValue = calculateHandValue(currentHandCards);
          
          // No more double or split after hitting
          setCanDouble(false);
          setCanSplit(false);
          
          // Check if player busts
          if (handValue > 21) {
            // CRITICAL: First, explicitly log the cards being received from API
            console.log(`DEBUG: Hit caused bust. API returned these cards for ${currentHand}:`, currentHandCards);
            
            // Special handling for busts - important to force an update of the cards
            // Create a copy of the current player hands
            const updatedPlayerHands = {...response.data.player_hands};
            
            // Ensure we're seeing the complete hand with the new card
            console.log("Complete hand that caused bust:", updatedPlayerHands[currentHand]);
            
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
              // After a brief delay, set the game state to busted
              setGameState('busted');
              
              // Wait longer before proceeding to dealer
              setTimeout(() => {
                // We want to clearly see the bust card before moving to dealer phase
                processDealer();
              }, 2000);
            }, 500);
            
            return;
          }
        }
        
        // For STAND action
        if (action === 'stand') {
          const handKeys = Object.keys(response.data.player_hands);
          const currentIndex = handKeys.indexOf(currentHand);
          
          if (currentIndex < handKeys.length - 1) {
            // Move to next hand
            const nextHand = handKeys[currentIndex + 1];
            setCurrentHand(nextHand);
            setCanDouble(true);
            setCanSplit(false);
          } else {
            // All hands played, move to dealer
            processDealer();
          }
        }
        
        // For DOUBLE action
        if (action === 'double') {
          const currentHandCards = response.data.player_hands[currentHand];
          const handValue = calculateHandValue(currentHandCards);
          
          // Check if player busts on double
          if (handValue > 21) {
            // Mark the bust
            setHandResults(prev => ({
              ...prev,
              [currentHand]: "Bust ❌"
            }));
            
            setMessage(`You doubled and busted with ${handValue}!`);
            setGameState('busted'); // Pause here before moving to dealer
            setTimeout(() => {
              processDealer(); // Continue after delay
            }, 1500); // This ensures React completes DOM rendering with the last drawn card
            return;
          }
          
          // If not bust, process next hand or dealer
          const handKeys = Object.keys(response.data.player_hands);
          const currentIndex = handKeys.indexOf(currentHand);
          
          if (currentIndex < handKeys.length - 1) {
            // Move to next hand
            const nextHand = handKeys[currentIndex + 1];
            setCurrentHand(nextHand);
            setCanDouble(true);
            setCanSplit(false);
          } else {
            // All hands played, move to dealer
            processDealer();
          }
        }
        
        // For SPLIT action
        if (action === 'split') {
          // After splitting, stay on first hand
          const firstHandKey = Object.keys(response.data.player_hands)[0];
          setCurrentHand(firstHandKey);
          setCanDouble(true);
          setCanSplit(false);
          
          // Update balance
          if (response.data.new_balance !== undefined) {
            const newBalance = parseFloat(response.data.new_balance);
            setCurrentBalance(newBalance);
            updateBalance(newBalance);
          }
        }
      }
    } catch (error) {
      console.error('Action error:', error);
      setError(error.response?.data?.error || 'Failed to process action');
    } finally {
      // Re-enable buttons if still in playing state
      setTimeout(() => {
        if (gameState === 'playing') {
          document.querySelectorAll('.game-controls button').forEach(btn => {
            btn.disabled = false;
          });
        }
      }, 300);
    }
  };

  // Function to process dealer's turn
  const processDealer = async () => {
    try {
      // First mark the state as 'dealer' so UI can reflect it
      setGameState('dealer');
      
      // Process the dealer's turn
      const response = await axios.post(`${API_BASE_URL}/blackjack/action/`, {
        user_id: user.id,
        action: 'stand',
        process_dealer: true
      });

      console.log("DEALER RESPONSE:", JSON.stringify(response.data, null, 2));

      if (response.data) {
        // If response contains player_hands, update it
        if (response.data.player_hands) {
          setPlayerHands(response.data.player_hands);
        }
        
        // Update dealer's hand
        if (response.data.dealer_hand) {
          setDealerHand(response.data.dealer_hand);
        }
        
        // Check if dealer busted
        const dealerValue = calculateHandValue(response.data.dealer_hand);
        const dealerBusted = dealerValue > 21;
        
        // If the dealer busted, give more time to see the bust card
        const waitTime = dealerBusted ? 1500 : 1000;
        
        // Wait to ensure dealer cards are rendered before showing results
        setTimeout(() => {
          // Update game results
          if (response.data.results) {
            setHandResults(response.data.results);
            
            // Create a summary message from all results
            const resultMessages = Object.entries(response.data.results)
              .map(([hand, result]) => `Hand ${hand.replace('main', '1')}: ${result}`)
              .join(' | ');
            
            // Add dealer bust message if applicable
            const displayMessage = dealerBusted ? 
              `Dealer busted with ${dealerValue}! ${resultMessages}` : 
              resultMessages;
            
            setMessage(displayMessage);
          } else {
            setMessage(dealerBusted ? `Dealer busted with ${dealerValue}!` : "Game over");
          }
          
          // Update balance
          if (response.data.new_balance !== undefined) {
            const newBalance = parseFloat(response.data.new_balance);
            setCurrentBalance(newBalance);
            updateBalance(newBalance);
          }
          
          // Finally change to result state
          setGameState('result');
        }, waitTime);
      } else {
        setError('Invalid dealer response data');
      }
    } catch (error) {
      console.error('Process dealer error:', error);
      setError(error.response?.data?.error || 'Failed to process dealer turn');
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
      if (card.rank === 'A') {
        aces += 1;
        value += 11;
      } else if (['K', 'Q', 'J'].includes(card.rank)) {
        value += 10;
      } else {
        value += parseInt(card.rank) || 0;
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
    if (!card) return null;
    
    if (card === 'Hidden') {
      return <div key={index} className="card hidden">?</div>;
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
    let cardClasses = `card ${card.suit?.toLowerCase() || ''}`;
    if (isBustCard) {
      cardClasses += ' subtle-bust-card';
    } else if (isDoubleCard) {
      cardClasses += ' double-card';
    }
    
    return (
      <div key={index} className={cardClasses}>
        <div className="card-value">{card.rank}</div>
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
      axios.post(`${API_BASE_URL}/blackjack/reset/`, {
        user_id: user.id
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
          // Try to update balance on backend
          await axios.post(`${API_BASE_URL}/users/update-balance/`, {
            user_id: user.id,
            new_balance: newBalance
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