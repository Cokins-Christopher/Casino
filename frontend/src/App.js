import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext'; // Import AuthContext
import HomePage from './components/HomePage';
import SignupPage from './components/SignUp';
import LoginPage from './components/LoginPage';
import Navbar from './components/Navbar';
import Games from './components/Games';
import Promotions from './components/Promotions';
import Leaderboard from './components/Leaderboard';
import FreeCoins from './components/FreeCoins'; // Import FreeCoins component

function App() {
  return (
    <AuthProvider>
      <Router>
        <div>
          <Navbar />
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/games" element={<Games />} />
            <Route path="/promotions" element={<Promotions />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="/free-credits" element={<FreeCoins />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
