import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import RoleSetup from './pages/RoleSetup';
import QuestionBank from './pages/QuestionBank';
import MockConfig from './pages/MockConfig';
import Interview from './pages/Interview';
import Report from './pages/Report';
// Removed D-ID test routes
import InterviewRoom from './pages/InterviewRoom';

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="pt-16">
        <Routes>
          <Route path="/" element={<RoleSetup />} />
          <Route path="/questions" element={<QuestionBank />} />
          <Route path="/mock" element={<MockConfig />} />
          <Route path="/interview/:id" element={<Interview />} />
          <Route path="/report/:id" element={<Report />} />
          <Route path="/interview-room" element={<InterviewRoom />} />
          {/** D-ID test routes removed **/}

        </Routes>
      </main>
    </div>
  );
}

export default App;
