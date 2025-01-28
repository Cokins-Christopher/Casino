import React, { useState } from 'react';
import '../styles/HomePage.css';
import blackjackImage from '../images/blackjack.png';
import rouletteImage from '../images/roulette.png';
import slotsImage from '../images/slots.png';
import pokerImage from '../images/poker.png';

function HomePage() {
    const games = [
        { name: 'Blackjack', image: blackjackImage, description: 'Test your skills in the classic card game!' },
        { name: 'Roulette', image: rouletteImage, description: 'Spin the wheel and try your luck!' },
        { name: 'Slots', image: slotsImage, description: 'Pull the lever and hit the jackpot!' },
        { name: 'Poker', image: pokerImage, description: 'Test your luck and strategy in the classic video poker game!' },
      ];

  const [currentIndex, setCurrentIndex] = useState(0);

  const handleNext = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % games.length);
  };

  const handlePrev = () => {
    setCurrentIndex((prevIndex) => (prevIndex - 1 + games.length) % games.length);
  };

  return (
    <div className="carousel-container">
      <h1>Available Games</h1>
      <div className="carousel">
        {games.map((game, index) => {
          const isActive = index === currentIndex;
          const isPrevious = index === (currentIndex - 1 + games.length) % games.length;
          const isNext = index === (currentIndex + 1) % games.length;

          return (
            <div
              key={game.name}
              className={`carousel-item ${
                isActive ? 'active' : isPrevious ? 'previous' : isNext ? 'next' : ''
              }`}
            >
              <img src={`${game.image}`} alt={game.name} className="carousel-image" />
              <h3 className="carousel-title">{game.name}</h3>
              <p className="carousel-description">{game.description}</p>
            </div>
          );
        })}
      </div>
      <button className="carousel-btn left" onClick={handlePrev}>
        ◀
      </button>
      <button className="carousel-btn right" onClick={handleNext}>
        ▶
      </button>
    </div>
  );
}

export default HomePage;
