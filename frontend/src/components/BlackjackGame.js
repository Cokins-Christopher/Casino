import React, { useState, useContext, useEffect } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import '../styles/BlackjackGame.css';

const BlackjackGame = () => {
  const { user, updateBalance } = useContext(AuthContext);
  const navigate = useNavigate();
  const [gameState, setGameState] = useState('betting'); // betting, playing, dealer, result
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
      
      // IMPORTANT BUG FIX: The API returns different formats based on whether the hit causes a bust
      // 1. Normal hit: returns player_hands with updated cards
      // 2. Bust hit: returns dealer_hand and results directly (final state)
      
      // Check if this looks like a bust response (has results but no player_hands)
      const isBustResponse = response.data.results && !response.data.player_hands;
      
      if (isBustResponse) {
        console.log("Detected bust response from API - handling special case");
        
        // First check if this was a hit action
        if (action === 'hit' || action === 'double') {
          /**************************************************************************
           * IMPORTANT DEVELOPER NOTE:
           * 
           * The current API has a limitation: when a hit/double action completes the game
           * (either by busting or automatically moving to dealer turn), the API response 
           * only includes the final results (dealer_hand, results) but NOT the updated
           * player_hands with the final card that was dealt.
           * 
           * Ideally, the backend API should be modified to always include:
           * 1. The complete player_hands in every response
           * 2. The specific last card that was dealt
           * 
           * For now, we have to generate a synthetic card that makes sense based on
           * the game outcome. This is a workaround until the API can be improved.
           * 
           * Proper API fix would be to always include player_hands and last_action in
           * the response, even when the game is complete.
           **************************************************************************/
          
          // Get the current hand from state
          const currentStateHand = [...playerHands[currentHand]];
          
          // CRITICAL: Check if this is actually a bust or just a completed double
          // Look at the results to see if it's a bust or not
          const isTrueBust = response.data.results[currentHand] === "Bust ❌";
          
          // Check what our current hand value is
          const currentHandValue = calculateHandValue(currentStateHand);
          
          // For display purposes, compute what the final card could realistically be
          let lastCard;
          
          if (isTrueBust) {
            // Handle true bust case - reconstruct a card that would cause a bust
            // Minimum value needed to bust
            const minValueToBust = 22 - currentHandValue;
            
            // Choose a card that would cause a bust based on current hand value
            if (minValueToBust <= 10) {
              // Any 10-value card would cause a bust
              lastCard = {
                rank: ['10', 'J', 'Q', 'K'][Math.floor(Math.random() * 4)],
                suit: ['♥', '♦', '♣', '♠'][Math.floor(Math.random() * 4)],
                value: 10,
                isBustCard: true
              };
            } else {
              // This shouldn't happen in blackjack (would need a value > 10 to bust)
              // But just in case, use a value that would cause a bust
              lastCard = {
                rank: minValueToBust.toString(),
                suit: ['♥', '♦', '♣', '♠'][Math.floor(Math.random() * 4)],
                value: minValueToBust,
                isBustCard: true
              };
            }
            
            // Create an updated hand with the bust card
            const updatedHand = [...currentStateHand, lastCard];
            
            // Create updated player hands
            const updatedPlayerHands = {
              ...playerHands,
              [currentHand]: updatedHand
            };
            
            console.log("Reconstructed player hand with bust card:", updatedPlayerHands);
            
            // Update the player hands
            setPlayerHands(updatedPlayerHands);
            
            // Show a message about busting
            setMessage(`You busted with a high value!`);
            
            // Set game state to busted to pause
            setGameState('busted');
          } else {
            // This is a double that didn't bust
            // Determine a realistic card based on the final outcome
            // If the result is a win, create a strong card
            // If the result is a loss, create a weaker card
            
            const isWin = response.data.results[currentHand]?.includes('Win');
            const cardValues = [];
            
            // Choose card values that make sense for the outcome
            // For wins, prefer high cards, for losses, prefer lower cards
            if (isWin) {
              // For wins, create cards that give good hand values (17-21)
              const neededForGood = Math.max(1, Math.min(10, 21 - currentHandValue));
              cardValues.push(neededForGood);
              
              // If an ace could be 1 or 11 and give a good result, use an ace
              if (currentHandValue <= 10) {
                cardValues.push('A');
              }
            } else {
              // For losses, create cards that give mediocre hand values (12-16)
              const neededForMediocre = Math.max(1, Math.min(10, 16 - currentHandValue));
              cardValues.push(neededForMediocre);
            }
            
            // Choose a realistic card based on the outcome
            let cardRank = cardValues[Math.floor(Math.random() * cardValues.length)];
            if (cardRank === 'A') {
              lastCard = {
                rank: 'A',
                suit: ['♥', '♦', '♣', '♠'][Math.floor(Math.random() * 4)],
                value: 11,
                isDoubleCard: true
              };
            } else if (typeof cardRank === 'number') {
              // For number cards
              if (cardRank === 10) {
                // 10 value cards can be 10, J, Q, or K
                lastCard = {
                  rank: ['10', 'J', 'Q', 'K'][Math.floor(Math.random() * 4)],
                  suit: ['♥', '♦', '♣', '♠'][Math.floor(Math.random() * 4)],
                  value: 10,
                  isDoubleCard: true
                };
              } else {
                lastCard = {
                  rank: cardRank.toString(),
                  suit: ['♥', '♦', '♣', '♠'][Math.floor(Math.random() * 4)],
                  value: cardRank,
                  isDoubleCard: true
                };
              }
            }
            
            // Create updated hand with double card
            const updatedHand = [...currentStateHand, lastCard];
            
            // Create updated player hands
            const updatedPlayerHands = {
              ...playerHands,
              [currentHand]: updatedHand
            };
            
            console.log("Reconstructed player hand with double card:", updatedPlayerHands);
            
            // Update player hands with our reconstructed version
            setPlayerHands(updatedPlayerHands);
            
            // Set appropriate message for doubling
            setMessage(`You doubled your bet and received a card.`);
            
            // Skip the busted state as we didn't bust
            setGameState('dealer');
          }
          
          // Set dealer hand from response data
          setDealerHand(response.data.dealer_hand);
          
          // Set the results that came from the API
          setHandResults(response.data.results || {});
          
          // Wait before showing final result
          setTimeout(() => {
            // Skip process dealer since we already have the results
            setGameState('result');
            
            // Update balance if provided
            if (response.data.new_balance !== undefined) {
              const newBalance = parseFloat(response.data.new_balance);
              setCurrentBalance(newBalance);
              updateBalance(newBalance);
            }
          }, 2000);
          
          return;
        }
      }
      
      // Normal response handling (non-bust case)
      // Always update player hands from response
      if (response.data && response.data.player_hands) {
        // Log player hands specifically
        console.log("PLAYER HANDS FROM API:", JSON.stringify(response.data.player_hands, null, 2));
        console.log("Type of player_hands:", typeof response.data.player_hands);
        console.log("Is Array?", Array.isArray(response.data.player_hands));
        
        // Critical: Update player hands immediately with new card data
        setPlayerHands(response.data.player_hands);
        
        // For HIT action - special handling to ensure bust card is visible
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
      
      // If we receive direct results (e.g., from double or dealer bust)
      if (response.data.dealer_hand && response.data.results) {
        setDealerHand(response.data.dealer_hand);
        setHandResults(response.data.results);
        setGameState('result');
        
        // Create result message
        const resultMessages = Object.entries(response.data.results)
          .map(([hand, result]) => `Hand ${hand.replace('main', '1')}: ${result}`)
          .join(' | ');
        
        setMessage(resultMessages);
        
        // Update balance
        if (response.data.new_balance !== undefined) {
          const newBalance = parseFloat(response.data.new_balance);
          setCurrentBalance(newBalance);
          updateBalance(newBalance);
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

      if (response.data && response.data.dealer_hand) {
        // Update dealer's hand first and let it render
        setDealerHand(response.data.dealer_hand);
        
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
    
    // Determine if this is a bust card
    const isBustCard = (isLastCard && isBustedHand) || card.isBustCard;
    const isDoubleCard = card.isDoubleCard;
    
    // Create class names - use a subtle highlight for bust cards or a different highlight for double
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
        {isDoubleCard && <div className="double-indicator">Double</div>}
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