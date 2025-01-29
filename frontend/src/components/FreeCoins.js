import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import '../styles/FreeCoins.css';

const FreeCoins = () => {
  const { user, updateBalance } = useContext(AuthContext);
  const [hasSpun, setHasSpun] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [reward, setReward] = useState(null);
  const [rotation, setRotation] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [errorMessage, setErrorMessage] = useState(null);

  const API_BASE_URL = "http://127.0.0.1:8000/api";

  const prizes = [50, 100, 250, 500, 1000, 5000];
  const numSlices = prizes.length;
  const sliceAngle = 360 / numSlices;
  const offsetAngle = (sliceAngle / 2) - 90;

  useEffect(() => {
    if (user) {
      axios.get(`${API_BASE_URL}/last-spin/${user.id}/`)
        .then(response => {
          const { lastSpinTime } = response.data;
          if (lastSpinTime) {
            const lastSpinDate = new Date(lastSpinTime);
            const now = new Date();
            const timeDiff = now - lastSpinDate;

            if (timeDiff < 24 * 60 * 60 * 1000) {
              setHasSpun(true);
              setTimeLeft(24 * 60 * 60 * 1000 - timeDiff);
            }
          }
        })
        .catch(error => {
          console.error("Error fetching last spin time:", error);
          setErrorMessage("Failed to load spin data. Please try again later.");
        });
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

  const spinWheel = async () => {
    if (!user || hasSpun || spinning) return;
  
    setSpinning(true);
    setErrorMessage(null);
  
    const randomIndex = Math.floor(Math.random() * prizes.length);
    const targetRotation = (sliceAngle * (prizes.length - randomIndex - 1)) + (5 * 360) - offsetAngle;
  
    setRotation(targetRotation);
  
    setTimeout(async () => {
      try {
        const response = await axios.post("http://127.0.0.1:8000/api/update-spin/", {
          userId: user.id, // ✅ Ensure user ID is sent correctly
          amount: prizes[randomIndex],
        });
  
        const data = response.data;
        console.log("✅ Spin response:", data); // Debugging log
  
        setReward(prizes[randomIndex]);
        setHasSpun(true);
        updateBalance(data.balance); // ✅ Update balance
  
      } catch (error) {
        console.error("❌ Spin error:", error);
        setErrorMessage(error.response?.data?.error || "An error occurred. Try again later.");
      }
  
      setSpinning(false);
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

      <div className="wheel-container" onClick={!hasSpun && !spinning ? spinWheel : null}>
        <div className="wheel" style={{ transform: `rotate(${rotation}deg)`, transition: spinning ? "3s ease-out" : "none" }}>
          {prizes.map((prize, index) => (
            <div key={index} className="wheel-segment" style={{ transform: `rotate(${sliceAngle * index}deg)` }}>
              <span className="wheel-text">{prize}</span>
            </div>
          ))}
        </div>
        <div className="wheel-pointer">▼</div>
      </div>

      {reward && <p className="reward-message">🎉 You won {reward} coins! 🎉</p>}
      {errorMessage && <p className="error-message">{errorMessage}</p>}
      {hasSpun && <p className="cooldown-message">⏳ You can spin again in: {formatTime(timeLeft)}</p>}
    </div>
  );
};

export default FreeCoins;
