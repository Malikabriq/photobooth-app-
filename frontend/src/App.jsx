import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import RoomPage from './pages/RoomPage';
import ResultPage from './pages/ResultPage';

function App() {
  return (
    <Router>
      <div className="min-h-screen flex flex-col font-sans">
        <main className="flex-grow flex flex-col relative overflow-hidden">
          {/* Abstract background blobs */}
          <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 blur-[120px] rounded-full pointer-events-none" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-secondary/20 blur-[120px] rounded-full pointer-events-none" />
          
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/room/:roomId" element={<RoomPage />} />
            <Route path="/result" element={<ResultPage />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
