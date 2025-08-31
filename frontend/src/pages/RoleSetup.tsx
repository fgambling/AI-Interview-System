import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { generateQuestions } from '../api';
import { useInterviewStore } from '../store';
import RoleForm from '../components/RoleForm';

const RoleSetup: React.FC = () => {
  const navigate = useNavigate();
  const { setRole, setQuestions } = useInterviewStore();
  const [isLoading, setIsLoading] = useState(false);

  const handleGenerateQuestions = async (role: string) => {
    setIsLoading(true);
    try {
      setRole(role);
      const result = await generateQuestions(role, 5, 5);
      setQuestions(result);
      navigate('/questions');
    } catch (error) {
      console.error('Failed to generate questions:', error);
      // Even if API fails, we can still navigate with mock data
      navigate('/questions');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            AI Interviewer
          </h1>
          <p className="text-xl text-gray-600">
            Generate personalized interview questions for any role
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <RoleForm onSubmit={handleGenerateQuestions} isLoading={isLoading} />
        </div>

        {/* Features */}
        <div className="mt-16 grid md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Smart Generation</h3>
            <p className="text-gray-600">AI-powered question generation based on role requirements</p>
          </div>

          <div className="text-center">
            <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Customizable</h3>
            <p className="text-gray-600">Adjust difficulty, type ratio, and question count</p>
          </div>

          <div className="text-center">
            <div className="bg-purple-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Ready to Use</h3>
            <p className="text-gray-600">Generate professional interview questions in seconds</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoleSetup;

