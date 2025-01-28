import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import HomePage from './components/HomePage';
import SignupPage from './components/SignUp';
import LoginPage from './components/LoginPage';
import Navbar from './components/Navbar';
import Games from './components/Games';
import Promotions from './components/Promotions';

function App() {
  return (
    <Router>
      <div>
        <Navbar />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/games" element={<Games />} />
          <Route path="/promotions" element={<Promotions />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
