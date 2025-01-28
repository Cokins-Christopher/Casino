import React from 'react';
import '../styles/Games.css';
import blackjackImage from '../images/blackjack.png';
import rouletteImage from '../images/roulette.png';
import slotsImage from '../images/slots.png';
import pokerImage from '../images/poker.png';

const Games = () => {
  const games = [
    {
      name: 'Blackjack',
      description: 'Test your skills in the classic card game of 21.',
      minBet: '$1',
      maxBet: '$500',
      howToWin: 'Beat the dealer by getting closer to 21 without going over.',
      image: blackjackImage,
    },
    {
      name: 'Roulette',
      description: 'Spin the wheel and bet on your lucky number or color.',
      minBet: '$1',
      maxBet: '$1000',
      howToWin: 'Predict where the ball will land after the spin.',
      image: rouletteImage,
    },
    {
      name: 'Slots',
      description: 'Pull the lever and hit the jackpot with slot machines.',
      minBet: '$0.25',
      maxBet: '$100',
      howToWin: 'Match symbols across the reels to win payouts.',
      image: slotsImage,
    },
    {
      name: 'Video Poker',
      description: 'Test your luck and strategy in the classic video poker game.',
      minBet: '$1',
      maxBet: '$200',
      howToWin: 'Create the best poker hand to win payouts.',
      image: pokerImage,
    },
  ];

  return (
    <div className="games-container">
      <h1>Available Games</h1>
      <div className="games-grid">
        {games.map((game) => (
          <div key={game.name} className="game-card">
            <img src={game.image} alt={game.name} className="game-image" />
            <h2 className="game-name">{game.name}</h2>
            <p className="game-description">{game.description}</p>
            <p className="game-bet">Min Bet: {game.minBet} | Max Bet: {game.maxBet}</p>
            <p className="game-how-to-win"><strong>How to Win:</strong> {game.howToWin}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Games;
