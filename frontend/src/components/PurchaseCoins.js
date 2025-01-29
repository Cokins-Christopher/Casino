import React, { useContext, useState } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import '../styles/PurchaseCoins.css';

const PurchaseCoins = () => {
  const { user, updateBalance } = useContext(AuthContext); // ✅ Check updateBalance
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const API_BASE_URL = "http://127.0.0.1:8000/api";

  const coinPackages = [
    { price: 4.99, coins: 500 },
    { price: 9.99, coins: 1200 },
    { price: 19.99, coins: 2500 },
    { price: 49.99, coins: 7000 },
    { price: 99.99, coins: 15000 },
    { price: 199.99, coins: 35000 },
  ];

  const handlePurchase = async (coins) => {
    if (!user) {
      navigate('/login');
      return;
    }

    try {
      const response = await axios.post(`${API_BASE_URL}/purchase-coins/`, {
        userId: user.id,
        amount: coins,
      });

      const data = response.data;

      updateBalance(data.balance); // ✅ Update the user's balance in context
      setMessage(data.message);

    } catch (error) {
      setMessage("Failed to process purchase. Please try again.");
    }
  };

  return (
    <div className="purchase-container">
      <h2>Purchase Coins</h2>
      {message && <p className="purchase-message">{message}</p>}
      <div className="coin-options">
        {coinPackages.map((pkg, index) => (
          <div
            key={index}
            className="coin-package"
            onClick={() => handlePurchase(pkg.coins)}
          >
            <p>{pkg.coins} Coins</p>
            <p>${pkg.price.toFixed(2)}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PurchaseCoins;
