import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useInterviewStore } from '../store';

const Navbar: React.FC = () => {
  const location = useLocation();
  const { sessionId } = useInterviewStore();

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <nav className="fixed top-0 left-0 right-0 bg-white shadow-md z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex-shrink-0">
              <h1 className="text-xl font-bold text-gray-900">AI Interviewer</h1>
            </Link>
          </div>
          
          <div className="flex items-center space-x-8">
            <Link
              to="/"
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive('/') 
                  ? 'bg-blue-100 text-blue-700' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              Home
            </Link>
            <Link
              to="/questions"
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive('/questions') 
                  ? 'bg-blue-100 text-blue-700' 
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              Questions
            </Link>
            <Link
              to="/mock"
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive('/mock')
                  ? 'bg-blue-100 text-blue-700'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
              }`}
            >
              Mock Interview
            </Link>

            
            {sessionId && (
              <Link
                to={`/report/${sessionId}`}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive(`/report/${sessionId}`) 
                    ? 'bg-blue-100 text-blue-700' 
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                Report
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
