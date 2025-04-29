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
  const [playerHands, setPlayerHands] = useState({}); // Changed to store multiple hands
  const [currentHand, setCurrentHand] = useState('main'); // Track current hand being played
  const [dealerHand, setDealerHand] = useState([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [canDouble, setCanDouble] = useState(false);
  const [canSplit, setCanSplit] = useState(false);
  const [potentialBalance, setPotentialBalance] = useState(0);
  const [currentBalance, setCurrentBalance] = useState(0);
  const [handResults, setHandResults] = useState({}); // Store results for each hand

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
      setCurrentHand('main'); // Start with main hand
      setDealerHand(dealer_hand);
      setGameState('playing');
      setError('');
      setHandResults({});
      
      // Check if player_hands.main exists and has at least 2 cards
      if (player_hands.main && player_hands.main.length >= 2) {
        setCanDouble(true);
        const card1 = player_hands.main[0];
        const card2 = player_hands.main[1];
        // Check if cards have rank property before comparing
        setCanSplit(card1 && card2 && card1.rank === card2.rank);
      }
      
      // Update balance
      const newBalance = currentBalance - betAmount;
      setCurrentBalance(newBalance);
      updateBalance(newBalance);
    } catch (error) {
      console.error('Start game error:', error);
      if (error.response?.status === 401) {
        setError('Please log in to play');
        navigate('/login');
      } else {
        setError(error.response?.data?.error || 'Failed to start game');
      }
    }
  };

  const handleAction = async (action) => {
    try {
      // Disable all buttons while action is processing to prevent multiple clicks
      document.querySelectorAll('.game-controls button').forEach(btn => {
        btn.disabled = true;
      });

      const response = await axios.post(`${API_BASE_URL}/blackjack/action/`, {
        user_id: user.id,
        action: action,
        hand: currentHand // Send current hand identifier
      });

      // For debugging
      console.log(`${action} response:`, response.data);

      // Always update player hands from response
      if (response.data && response.data.player_hands) {
        setPlayerHands(response.data.player_hands);
      }

      if (action === 'stand') {
        // Use response data, not local state
        if (response.data && response.data.player_hands) {
          const handKeys = Object.keys(response.data.player_hands);
          const currentIndex = handKeys.indexOf(currentHand);
          
          if (currentIndex < handKeys.length - 1) {
            // Move to next hand
            setCurrentHand(handKeys[currentIndex + 1]);
            setCanDouble(true); // New hand can double
            setCanSplit(false); // For simplicity, don't allow further splits
          } else {
            // All hands played, move to dealer
            setGameState('dealer');
            processDealer();
          }
        } else {
          // Fallback - move to dealer
          setGameState('dealer');
          processDealer();
        }
      } else if (action === 'double') {
        // Handle doubling: double bet, take one card, then stand
        if (response.data && response.data.player_hands) {
          // Already updated playerHands above
          
          // If the response already contains dealer results, process them directly
          if (response.data.dealer_hand && response.data.results) {
            setDealerHand(response.data.dealer_hand);
            setGameState('result');
            setHandResults(response.data.results);
            
            // Create a summary message from all results
            const resultMessages = Object.entries(response.data.results)
              .map(([hand, result]) => `Hand ${hand.replace('main', '1')}: ${result}`)
              .join(' | ');
            
            setMessage(resultMessages);
            
            if (response.data.new_balance !== undefined) {
              const newBalance = parseFloat(response.data.new_balance);
              setCurrentBalance(newBalance);
              updateBalance(newBalance);
            }
            return; // Exit early as we've processed everything
          }
          
          // Always use response data, not local state
          const currentHandCards = response.data.player_hands[currentHand];
          const isBust = calculateHandValue(currentHandCards) > 21;
          
          // If busted, show result and reveal dealer's hidden card
          if (isBust) {
            setHandResults(prev => ({
              ...prev,
              [currentHand]: "Bust ❌"
            }));
            
            // Check if this is the last hand or all hands are busted
            const handKeys = Object.keys(response.data.player_hands);
            const isLastHand = currentHand === handKeys[handKeys.length - 1];
            
            // Check if all hands are busted
            let allBusted = true;
            for (const handKey of handKeys) {
              if (calculateHandValue(response.data.player_hands[handKey]) <= 21) {
                allBusted = false;
                break;
              }
            }
            
            if (isLastHand || allBusted) {
              // Reveal dealer's hand immediately
              try {
                const dealerResponse = await axios.post(`${API_BASE_URL}/blackjack/action/`, {
                  user_id: user.id,
                  action: 'stand',
                  process_dealer: true
                });
                
                if (dealerResponse.data && dealerResponse.data.dealer_hand) {
                  setDealerHand(dealerResponse.data.dealer_hand);
                  
                  if (dealerResponse.data.results) {
                    setHandResults(dealerResponse.data.results);
                    setGameState('result');
                    
                    // Create a summary message from all results
                    const resultMessages = Object.entries(dealerResponse.data.results)
                      .map(([hand, result]) => `Hand ${hand.replace('main', '1')}: ${result}`)
                      .join(' | ');
                    
                    setMessage(resultMessages);
                    
                    if (dealerResponse.data.new_balance !== undefined) {
                      const newBalance = parseFloat(dealerResponse.data.new_balance);
                      setCurrentBalance(newBalance);
                      updateBalance(newBalance);
                    }
                    return;
                  }
                }
              } catch (error) {
                console.error('Error revealing dealer cards:', error);
              }
            }
          }
          
          // Add a delay to allow the player to see the card after doubling
          setTimeout(() => {
            // Always use response data, not local state
            const handKeys = Object.keys(response.data.player_hands);
            const currentIndex = handKeys.indexOf(currentHand);
            
            if (currentIndex < handKeys.length - 1) {
              // Move to next hand
              setCurrentHand(handKeys[currentIndex + 1]);
              setCanDouble(true);
              setCanSplit(false);
            } else {
              // All hands played, move to dealer
              setGameState('dealer');
              setTimeout(() => {
                processDealer();
              }, 300);
            }
          }, 1000); // 1 second delay to show the card after doubling
        }
      } else if (action === 'split') {
        // Handle splitting: create two hands
        if (response.data && response.data.player_hands) {
          // Already updated playerHands above
          
          // Update balance for the additional bet
          if (response.data.new_balance !== undefined) {
            setCurrentBalance(parseFloat(response.data.new_balance));
            updateBalance(parseFloat(response.data.new_balance));
          }
          
          // Stay on first hand - this works well, use the same approach
          const firstHandKey = Object.keys(response.data.player_hands)[0];
          setCurrentHand(firstHandKey);
          setCanDouble(true);
          setCanSplit(false); // For simplicity, don't allow further splits
        }
      } else if (action === 'hit') {
        // Handle hitting
        if (response.data && response.data.player_hands) {
          // Already updated playerHands above
          
          // Always use response data, not local state
          const currentHandCards = response.data.player_hands[currentHand];
          setCanDouble(false); // Can't double after hit
          setCanSplit(false); // Can't split after hit
          
          // Check if bust
          if (calculateHandValue(currentHandCards) > 21) {
            // Set result for this hand
            setHandResults(prev => ({
              ...prev,
              [currentHand]: "Bust ❌"
            }));
            
            // Check if this is the last hand or all hands are busted
            const handKeys = Object.keys(response.data.player_hands);
            const isLastHand = currentHand === handKeys[handKeys.length - 1];
            
            // Check if all hands are busted
            let allBusted = true;
            for (const handKey of handKeys) {
              if (handKey !== currentHand && calculateHandValue(response.data.player_hands[handKey]) <= 21) {
                allBusted = false;
                break;
              }
            }
            
            if (isLastHand || allBusted) {
              // Reveal dealer's cards immediately
              try {
                const dealerResponse = await axios.post(`${API_BASE_URL}/blackjack/action/`, {
                  user_id: user.id,
                  action: 'stand',
                  process_dealer: true
                });
                
                if (dealerResponse.data && dealerResponse.data.dealer_hand) {
                  setDealerHand(dealerResponse.data.dealer_hand);
                  
                  if (dealerResponse.data.results) {
                    setHandResults(dealerResponse.data.results);
                    setGameState('result');
                    
                    // Create a summary message from all results
                    const resultMessages = Object.entries(dealerResponse.data.results)
                      .map(([hand, result]) => `Hand ${hand.replace('main', '1')}: ${result}`)
                      .join(' | ');
                    
                    setMessage(resultMessages);
                    
                    if (dealerResponse.data.new_balance !== undefined) {
                      const newBalance = parseFloat(dealerResponse.data.new_balance);
                      setCurrentBalance(newBalance);
                      updateBalance(newBalance);
                    }
                    
                    // Enable buttons after dealer is done
                    document.querySelectorAll('.game-controls button').forEach(btn => {
                      btn.disabled = false;
                    });
                    
                    return; // Exit early as we've processed everything
                  }
                }
              } catch (error) {
                console.error('Error revealing dealer cards:', error);
              }
            }
            
            // Add a delay to allow the player to see the bust card
            setTimeout(() => {
              // Always use response data, not local state
              const handKeys = Object.keys(response.data.player_hands);
              const currentIndex = handKeys.indexOf(currentHand);
              
              if (currentIndex < handKeys.length - 1) {
                // Move to next hand
                setCurrentHand(handKeys[currentIndex + 1]);
                setCanDouble(true);
              } else {
                // All hands played, move to dealer
                setGameState('dealer');
                setTimeout(() => {
                  processDealer();
                }, 300);
              }
            }, 1000); // 1 second delay to show the bust card
          }
        }
      }
    } catch (error) {
      console.error('Action error:', error);
      if (error.response?.status === 401) {
        setError('Please log in to continue');
        navigate('/login');
      } else {
        setError(error.response?.data?.error || 'Failed to process action');
      }
    } finally {
      // Re-enable buttons after action completes, but only if not moving to dealer/result
      setTimeout(() => {
        if (gameState === 'playing') {
          document.querySelectorAll('.game-controls button').forEach(btn => {
            btn.disabled = false;
          });
        }
      }, 200);
    }
  };

  const processDealer = async () => {
    try {
      console.log("Processing dealer turn...");
      const response = await axios.post(`${API_BASE_URL}/blackjack/action/`, {
        user_id: user.id,
        action: 'stand',
        process_dealer: true // Add this flag to explicitly indicate we want to process dealer
      });

      console.log("Dealer response:", response.data);

      if (response.data && response.data.dealer_hand) {
        setDealerHand(response.data.dealer_hand);
        setGameState('result');
        
        if (response.data.results) {
          setHandResults(response.data.results);
          
          // Create a summary message from all results
          const resultMessages = Object.entries(response.data.results)
            .map(([hand, result]) => `Hand ${hand.replace('main', '1')}: ${result}`)
            .join(' | ');
          
          setMessage(resultMessages);
        } else {
          setMessage("Game over");
        }
        
        if (response.data.new_balance !== undefined) {
          const newBalance = parseFloat(response.data.new_balance);
          setCurrentBalance(newBalance);
          updateBalance(newBalance);
        }
      } else {
        setError('Invalid dealer response data');
        console.error("Invalid dealer response:", response.data);
      }
    } catch (error) {
      console.error('Process dealer error:', error);
      if (error.response?.status === 401) {
        setError('Please log in to continue');
        navigate('/login');
      } else {
        setError(error.response?.data?.error || 'Failed to process dealer turn');
      }
    }
  };

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

  const renderCard = (card, index) => {
    if (!card) {
      return null;
    }
    
    if (card === 'Hidden') {
      return <div key={index} className="card hidden">?</div>;
    }
    
    return (
      <div key={index} className={`card ${card.suit?.toLowerCase() || ''}`}>
        <div className="card-value">{card.rank}</div>
        <div className="card-suit">{getSuitSymbol(card.suit)}</div>
      </div>
    );
  };

  const getSuitSymbol = (suit) => {
    switch (suit) {
      case '♥': return '♥';
      case '♦': return '♦';
      case '♣': return '♣';
      case '♠': return '♠';
      default: return suit || '';
    }
  };

  const resetGame = () => {
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
  };

  const getHandLabel = (handKey) => {
    if (handKey === 'main') {
      return 'Hand 1';
    } else if (handKey.startsWith('split_')) {
      return `Hand ${handKey.replace('split_', '')}`;
    }
    return handKey;
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
          </div>
        </div>
      )}

      {(gameState === 'playing' || gameState === 'dealer' || gameState === 'result') && (
        <div className="game-interface">
          <div className="dealer-hand">
            <h2>Dealer's Hand</h2>
            <div className="cards">
              {Array.isArray(dealerHand) && dealerHand.map((card, index) => renderCard(card, index))}
            </div>
            {gameState === 'result' && (
              <div className="hand-value">
                Dealer Value: {calculateHandValue(dealerHand)}
              </div>
            )}
          </div>

          <div className="player-hands">
            {Object.entries(playerHands).map(([handKey, hand]) => (
              <div 
                key={handKey} 
                className={`player-hand ${handKey === currentHand && gameState === 'playing' ? 'active-hand' : ''}`}
              >
                <h2>{getHandLabel(handKey)} {handKey === currentHand && gameState === 'playing' && '(Active)'}</h2>
                <div className="cards">
                  {Array.isArray(hand) && hand.map((card, index) => renderCard(card, index))}
                </div>
                <div className="hand-value">
                  Value: {calculateHandValue(hand)}
                  {gameState === 'result' && handResults[handKey] && (
                    <span className="hand-result"> - {handResults[handKey]}</span>
                  )}
                </div>
              </div>
            ))}
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