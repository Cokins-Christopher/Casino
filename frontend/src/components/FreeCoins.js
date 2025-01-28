import React, { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import '../styles/FreeCoins.css';

const FreeCoins = () => {
  const { user } = useContext(AuthContext);
  const [hasSpun, setHasSpun] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [reward, setReward] = useState(null);
  const [rotation, setRotation] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);

  const prizes = [50, 100, 250, 500, 1000, 5000];
  const numSlices = prizes.length;
  const sliceAngle = 360 / numSlices;
  const offsetAngle = (sliceAngle / 2) - 90;

  useEffect(() => {
    if (user) {
      fetch(`/api/last-spin/${user.id}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.lastSpinTime) {
            const lastSpinTime = new Date(data.lastSpinTime);
            const now = new Date();
            const timeDiff = now - lastSpinTime;

            if (timeDiff < 24 * 60 * 60 * 1000) {
              setHasSpun(true);
              setTimeLeft(24 * 60 * 60 * 1000 - timeDiff);
            }
          }
        })
        .catch((err) => console.error("Error fetching last spin time:", err));
    }
  }, [user]);

  useEffect(() => {
    if (hasSpun && timeLeft > 0) {
      const interval = setInterval(() => {
        setTimeLeft((prev) => (prev > 1000 ? prev - 1000 : 0));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [hasSpun, timeLeft]);

  const spinWheel = () => {
    if (!user || hasSpun || spinning) return;

    setSpinning(true);

    const randomIndex = Math.floor(Math.random() * prizes.length);
    const targetRotation = (sliceAngle * (prizes.length - randomIndex - 1)) + (5 * 360) - offsetAngle;

    setRotation(targetRotation);

    setTimeout(() => {
      setReward(prizes[randomIndex]);
      setHasSpun(true);
      setSpinning(false);

      fetch('/api/update-spin/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, amount: prizes[randomIndex] }),
      }).catch((err) => console.error('Error updating balance:', err));
    }, 3000);
  };

  const formatTime = (milliseconds) => {
    const hours = Math.floor(milliseconds / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((milliseconds % (1000 * 60)) / 1000);
    return `${hours}h ${minutes}m ${seconds}s`;
  };

  return (
    <div className="free-coins-container">
      <h1>Spin the Wheel for Free Coins!</h1>

      <div className="wheel-container" onClick={!hasSpun ? spinWheel : null}>
        <div className="wheel" style={{ transform: `rotate(${rotation}deg)` }}>
          {prizes.map((prize, index) => (
            <div key={index} className="wheel-segment" style={{ transform: `rotate(${sliceAngle * index}deg)` }}>
              <span className="wheel-text">{prize}</span>
            </div>
          ))}
        </div>
        <div className="wheel-pointer">▼</div>
      </div>

      {reward && <p className="reward-message">🎉 You won {reward} coins! 🎉</p>}
      {hasSpun && <p className="cooldown-message">⏳ You can spin again in: {formatTime(timeLeft)}</p>}
    </div>
  );
};

export default FreeCoins;
