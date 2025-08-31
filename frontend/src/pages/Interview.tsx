import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { submitAnswer, getNextQuestion, finishSession } from '../api';
import { QuestionDTO } from '../types';
import { useInterviewStore } from '../store';

import { useDidStreamOptimized } from '../hooks/useDidStreamOptimized';

const Interview: React.FC = () => {
  const { id: sessionId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { technical, background, setSessionId } = useInterviewStore();
  
  const [questions, setQuestions] = useState<QuestionDTO[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [currentAnswer, setCurrentAnswer] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [started, setStarted] = useState(false);

  // D-ID Talk hook for real-time conversation
  const {
    videoRef: talkVideoRef,
    say: talkSay,
    ready: talkReady,
    error: talkError
  } = useDidStreamOptimized("https://d-id-public-bucket.s3.us-west-2.amazonaws.com/alice.jpg");

  useEffect(() => {
    if (sessionId) {
      setSessionId(sessionId);
    }
    const allQuestions = [...technical, ...background];
    if (allQuestions.length > 0) {
      setQuestions(allQuestions);
    }
  }, [sessionId, technical, background, setSessionId]);

  const currentQuestion = questions[currentQuestionIndex];

  const handleStart = async () => {
    if (!currentQuestion || !talkReady) return;
    setStarted(true);

    // Use Talk to speak the question in real-time
    try {
      await talkSay(currentQuestion.text);
    } catch (error) {
      console.error('Failed to speak question:', error);
    }
  };

  const handleSubmitAnswer = async (answer: string) => {
    if (!sessionId || !currentQuestion) return;

    setIsLoading(true);
    try {
      await submitAnswer(sessionId, currentQuestionIndex + 1, answer);
      setCurrentAnswer(answer);
    } catch (error) {
      console.error('Failed to submit answer:', error);
      setCurrentAnswer(answer);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNextQuestion = async () => {
    if (currentQuestionIndex >= questions.length - 1) {
      await handleFinishInterview();
      return;
    }

    try {
      if (sessionId) {
        await getNextQuestion(sessionId);
      }
      setCurrentQuestionIndex(prev => prev + 1);
      setCurrentAnswer('');
    } catch (error) {
      console.error('Failed to get next question:', error);
      setCurrentQuestionIndex(prev => prev + 1);
      setCurrentAnswer('');
    }
  };

  const handleFinishInterview = async () => {
    if (!sessionId) return;

    setIsLoading(true);
    try {
      await finishSession(sessionId);
      navigate(`/report/${sessionId}`);
    } catch (error) {
      console.error('Failed to finish session:', error);
      navigate(`/report/${sessionId}`);
    } finally {
      setIsLoading(false);
    }
  };

  if (!currentQuestion) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            No Questions Available
          </h2>
          <p className="text-gray-600 mb-6">
            Please go back to generate interview questions.
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
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Progress Header */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-900">
                Mock Interview in Progress
              </h1>
            </div>
            <div className="text-sm text-gray-600">
              Question {currentQuestionIndex + 1} of {questions.length}
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Current Question with D-ID Talk */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            <div className="w-full h-64 md:h-80 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center">
              <div className="w-full h-full flex flex-col items-center justify-center p-2">
                {!talkReady ? (
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                    <div className="text-sm text-gray-600">
                      Connecting to virtual interviewer...
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Status: {talkReady ? "Ready" : "Connecting..."}
                    </div>
                  </div>
                ) : !started ? (
                  <button
                    onClick={handleStart}
                    disabled={!talkReady}
                    className="px-6 py-3 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Start Interview
                  </button>
                ) : (
                  <div className="w-full h-full">
                    <video
                      ref={talkVideoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover rounded"
                    />
                    {talkError && (
                      <div className="text-red-600 mt-2 text-xs text-center">
                        Error: {talkError}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="md:col-span-2">
              <div className="flex items-center space-x-3 mb-4">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  currentQuestion.type === 'technical' 
                    ? 'bg-blue-100 text-blue-800' 
                    : 'bg-purple-100 text-purple-800'
                }`}>
                  {currentQuestion.type}
                </span>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  currentQuestion.difficulty <= 2 
                    ? 'bg-green-100 text-green-800' 
                    : currentQuestion.difficulty <= 4 
                    ? 'bg-yellow-100 text-yellow-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {currentQuestion.difficulty <= 2 ? 'Beginner' : currentQuestion.difficulty <= 4 ? 'Intermediate' : 'Advanced'}
                </span>
              </div>
              
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                {currentQuestion.text}
              </h2>

              {/* Tags */}
              <div className="flex flex-wrap gap-2 mb-4">
                {currentQuestion.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-md"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              {/* Expected Points */}
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Expected Points:</h4>
                <div className="flex flex-wrap gap-2">
                  {currentQuestion.expectedPoints.map((point, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-md"
                    >
                      {point}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Answer Input */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Your Answer
          </h3>
          
          <div className="space-y-4">
            <textarea
              value={currentAnswer}
              onChange={(e) => setCurrentAnswer(e.target.value)}
              placeholder="Type your answer here..."
              className="w-full h-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              disabled={isLoading}
            />
            
            <div className="flex justify-end">
              <button
                onClick={() => handleSubmitAnswer(currentAnswer)}
                disabled={!currentAnswer.trim() || isLoading}
                className={`px-6 py-2 rounded-md font-medium transition-colors ${
                  !currentAnswer.trim() || isLoading
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2'
                }`}
              >
                {isLoading ? 'Submitting...' : 'Submit Answer'}
              </button>
            </div>
          </div>
        </div>



        {/* Current Answer Display */}
        {currentAnswer && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Your Answer
            </h3>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-gray-800">{currentAnswer}</p>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between">
          <button
            onClick={() => navigate('/mock')}
            className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors"
          >
            ← Back to Config
          </button>
          
          <div className="flex space-x-4">
            {currentQuestionIndex < questions.length - 1 ? (
              <button
                onClick={handleNextQuestion}
                disabled={!currentAnswer || isLoading}
                className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                  !currentAnswer || isLoading
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                Next Question →
              </button>
            ) : (
              <button
                onClick={handleFinishInterview}
                disabled={!currentAnswer || isLoading}
                className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                  !currentAnswer || isLoading
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-green-600 text-white hover:bg-green-700'
                }`}
              >
                {isLoading ? 'Finishing...' : 'Finish Interview'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Interview;
