import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import PriceTicks from './PriceTicks';
import StrikeDealsPage from './StrikeDealsPage';
import BoardMeetingsPage from './BoardMeetingsPage';

function App() {
  return (
    <Router>
      <div style={{ padding: '20px' }}>
        <nav style={{ marginBottom: '20px' }}>
          <Link to="/" style={{ marginRight: '15px' }}>Price Ticks</Link>
          <Link to="/strike-deals" style={{ marginRight: '15px' }}>Strike Deals</Link>
          <Link to="/board-meetings">Board Meetings</Link>
        </nav>
        <Routes>
          <Route path="/" element={<PriceTicks />} />
          <Route path="/strike-deals" element={<StrikeDealsPage />} />
          <Route path="/board-meetings" element={<BoardMeetingsPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
