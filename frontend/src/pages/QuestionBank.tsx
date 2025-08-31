import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { generateQuestions } from '../api';
import { useInterviewStore } from '../store';
import QuestionList from '../components/QuestionList';

const QuestionBank: React.FC = () => {
  const navigate = useNavigate();
  const { 
    role, 
    technical, 
    background, 
    removeQuestion, 
    setQuestions, 
    regenerate10x10
  } = useInterviewStore();
  
  const [isLoading, setIsLoading] = useState(false);

  const handleRegenerate = async () => {
    if (!role) return;
    
    setIsLoading(true);
    try {
      const result = await generateQuestions(role, 5, 5);
      setQuestions(result);
      regenerate10x10();
    } catch (error) {
      console.error('Failed to regenerate questions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateMoreTechnical = async () => {
    if (!role) return;
    
    setIsLoading(true);
    try {
      const result = await generateQuestions(role, 2, 0);
      setQuestions({
        technical: [...technical, ...result.technical],
        background: [...background]
      });
    } catch (error) {
      console.error('Failed to generate more technical questions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateMoreBackground = async () => {
    if (!role) return;
    
    setIsLoading(true);
    try {
      const result = await generateQuestions(role, 0, 2);
      setQuestions({
        technical: [...technical],
        background: [...background, ...result.background]
      });
    } catch (error) {
      console.error('Failed to generate more background questions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartMockInterview = () => {
    navigate('/mock');
  };

  if (technical.length === 0 && background.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            No Questions Generated
          </h2>
          <p className="text-gray-600 mb-6">
            Please go back to the home page to generate interview questions.
          </p>
          <button
            onClick={() => navigate('/')}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go Back Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Question Bank
              </h1>
              <p className="text-gray-600">
                Role: {role} • {technical.length + background.length} questions available
              </p>
            </div>
            
            <div className="flex space-x-4">
              <button
                onClick={handleRegenerate}
                disabled={isLoading}
                className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                🔄 Regenerate
              </button>
              <button
                onClick={handleGenerateMoreTechnical}
                disabled={isLoading}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                ➕ More Technical (2)
              </button>
              <button
                onClick={handleGenerateMoreBackground}
                disabled={isLoading}
                className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
              >
                ➕ More Background (2)
              </button>
              <button
                onClick={handleStartMockInterview}
                className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors"
              >
                🚀 Mock Interview
              </button>
            </div>
          </div>
        </div>

        {/* Questions Grid */}
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Technical Questions */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
              <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium mr-3">
                Technical
              </span>
              {technical.length} questions
            </h2>
            <QuestionList     
              items={technical}
              type="technical"
              onDelete={(id) => removeQuestion(id, 'technical')}
            />
          </div>

          {/* Background Questions */}
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
              <span className="bg-purple-100 text-purple-800 px-3 py-1 rounded-full text-sm font-medium mr-3">
                Background
              </span>
              {background.length} questions
            </h2>
            <QuestionList
              items={background}
              type="background"
              onDelete={(id) => removeQuestion(id, 'background')}
            />
          </div>
        </div>

        {/* Summary */}
        <div className="mt-12 bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Question Bank Summary
          </h3>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">
                {technical.length}
              </div>
              <div className="text-gray-600">Technical Questions</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600 mb-2">
                {background.length}
              </div>
              <div className="text-gray-600">Background Questions</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 mb-2">
                {technical.length + background.length}
              </div>
              <div className="text-gray-600">Total Questions</div>
            </div>
          </div>
          
          <div className="mt-6 text-center">
            <button
              onClick={handleStartMockInterview}
              className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-8 py-3 rounded-lg text-lg font-semibold hover:from-green-700 hover:to-emerald-700 transition-all transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-green-300"
            >
              🚀 Start Mock Interview Now
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuestionBank;
