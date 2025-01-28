import React from 'react';
import '../styles/Promotions.css';

const Promotions = () => {
  const promotions = [
    {
      title: 'Welcome Bonus',
      description: 'Get a 200% Match Bonus on your first deposit up to $1,000!',
      code: 'WELCOME200',
      terms: 'Valid for new users only.',
    },
    {
      title: 'Weekly Free Spins',
      description: 'Enjoy 50 Free Spins every Monday on the featured slot game of the week.',
      code: 'No code required',
      terms: 'No deposit required!',
    },
    {
      title: 'High Roller Bonus',
      description: 'Deposit $500 or more and receive a $2,000 Bonus.',
      code: 'HIGHROLLER',
      terms: 'Exclusive for VIP players.',
    },
    {
      title: 'Leaderboard Challenge',
      description: 'Compete to rank on the Daily Blackjack Leaderboard and win a share of $10,000 in prizes!',
      code: 'No code required',
      terms: 'Valid for daily challenges only.',
    },
    {
      title: 'Refer a Friend',
      description: 'Invite your friends and earn $50 Bonus Credits for each referral.',
      code: 'No code required',
      terms: 'Your friend also gets $50 to play.',
    },
  ];

  return (
    <div className="promotions-container">
      <h1>Current Promotions</h1>
      <div className="promotions-list">
        {promotions.map((promo, index) => (
          <div key={index} className="promotion-card">
            <h2 className="promotion-title">{promo.title}</h2>
            <p className="promotion-description">{promo.description}</p>
            <p className="promotion-code"><strong>Code:</strong> {promo.code}</p>
            <p className="promotion-terms"><strong>Terms:</strong> {promo.terms}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Promotions;
