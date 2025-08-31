import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useInterviewStore } from '../store';
import QuestionList from '../components/QuestionList';
import RatioSlider from '../components/RatioSlider';
import { API_BASE } from '../apiBase';

const MockConfig: React.FC = () => {
  const navigate = useNavigate();
  const { 
    technical, 
    background, 
    config, 
    setConfig, 
    setSessionId,
    toggleSelect,
    selectedQuestions,
    clearSelection
  } = useInterviewStore();
  
  const [isLoading, setIsLoading] = useState(false);
  const [randomRatio, setRandomRatio] = useState(false);

  const handleModeChange = (mode: 'manual' | 'random') => {
    setConfig({ mode });
    if (mode === 'manual') {
      clearSelection();
    }
  };

  const handleRatioChange = (ratio: number) => {
    setConfig({ ratio });
  };

  const handleRandomRatioToggle = () => {
    setRandomRatio(!randomRatio);
    if (!randomRatio) {
      setConfig({ ratio: 'random' });
    } else {
      setConfig({ ratio: 70 });
    }
  };

  const handleTotalChange = (total: number) => {
    // Ensure value is within 1-10 range
    const clampedTotal = Math.max(1, Math.min(10, total));
    setConfig({ total: clampedTotal });
  };

  const getSelectedQuestions = () => {
    const allQuestions = [...technical, ...background];
    return allQuestions.filter(q => selectedQuestions.includes(q.id!));
  };

  const getRandomQuestions = () => {
    let techCount: number;
    let bgCount: number;

    if (randomRatio || config.ratio === 'random') {
      // Random ratio
      techCount = Math.floor(Math.random() * config.total) + 1;
      bgCount = config.total - techCount;
    } else {
      // Fixed ratio
      techCount = Math.round((config.ratio as number / 100) * config.total);
      bgCount = config.total - techCount;
    }

    // Shuffle and select questions
    const shuffledTech = [...technical].sort(() => Math.random() - 0.5).slice(0, techCount);
    const shuffledBg = [...background].sort(() => Math.random() - 0.5).slice(0, bgCount);
    
    return [...shuffledTech, ...shuffledBg];
  };

  const handleStartInterview = async () => {
    if (config.mode === 'manual' && selectedQuestions.length === 0) {
      alert('Please select at least one question for manual mode');
      return;
    }

    setIsLoading(true);
    try {
      let questionsToUse;
      if (config.mode === 'manual') {
        questionsToUse = getSelectedQuestions();
      } else {
        questionsToUse = getRandomQuestions();
      }

      // Convert frontend data structure to backend expected format
      const formattedQuestions = questionsToUse.map(q => ({
        id: q.id || `temp_${Date.now()}_${Math.random()}`,
        text: q.text,
        type: q.type === 'technical' ? 'technical' :
              q.type === 'background' ? 'behavioral' : 'technical'
      }));

      console.log('Sending questions to backend:', formattedQuestions);

      // Call video interview specific session creation API
      const response = await fetch(`${API_BASE}/video-session/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questions: formattedQuestions })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log('Session created successfully:', result);
      setSessionId(result.sessionId);
      navigate('/interview-room');
    } catch (error) {
      console.error('Failed to create session:', error);
      // Use mock session ID as fallback
      setSessionId('mock-session-id');
      navigate('/interview-room');
    } finally {
      setIsLoading(false);
    }
  };

  const selectedQuestionsList = getSelectedQuestions();

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Mock Interview Configuration
          </h1>
          <p className="text-gray-600">
            Configure your interview settings and start the mock interview
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Configuration Panel */}
          <div className="space-y-6">
            {/* Mode Selection */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Interview Mode
              </h3>
              <div className="space-y-3">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="mode"
                    value="manual"
                    checked={config.mode === 'manual'}
                    onChange={() => handleModeChange('manual')}
                    className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <span className="text-gray-700">Manual Selection</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="mode"
                    value="random"
                    checked={config.mode === 'random'}
                    onChange={() => handleModeChange('random')}
                    className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                  />
                  <span className="text-gray-700">Random Selection</span>
                </label>
              </div>
            </div>

            {/* Random Mode Settings */}
            {config.mode === 'random' && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Random Selection Settings
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="flex items-center mb-3">
                      <input
                        type="checkbox"
                        checked={randomRatio}
                        onChange={handleRandomRatioToggle}
                        className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="text-gray-700">Random Technical:Background Ratio</span>
                    </label>
                  </div>

                  {!randomRatio && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Technical:Background Ratio
                      </label>
                      <RatioSlider
                        value={config.ratio as number}
                        onChange={handleRatioChange}
                        disabled={randomRatio}
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Total Questions - only for random mode */}
            {config.mode === 'random' && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Total Questions
                </h3>
                <div className="flex items-center space-x-4">
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={config.total}
                    onChange={(e) => handleTotalChange(parseInt(e.target.value))}
                    className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                  />
                  <span className="text-2xl font-bold text-blue-600 min-w-[3rem]">
                    {config.total}
                  </span>
                </div>
                <div className="flex justify-between text-sm text-gray-500 mt-2">
                  <span>1</span>
                  <span>10</span>
                </div>
              </div>
            )}

            {/* Start Button */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <button
                onClick={handleStartInterview}
                disabled={isLoading || (config.mode === 'manual' && selectedQuestions.length === 0)}
                className={`w-full py-3 px-6 rounded-lg text-lg font-semibold transition-all transform ${
                  isLoading || (config.mode === 'manual' && selectedQuestions.length === 0)
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700 hover:scale-105 focus:outline-none focus:ring-4 focus:ring-green-300'
                }`}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                    Starting Interview...
                  </div>
                ) : (
                  '🚀 Start Mock Interview'
                )}
              </button>
            </div>
          </div>

          {/* Questions Preview */}
          <div className="space-y-6">
            {config.mode === 'manual' ? (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Manual Selection ({selectedQuestions.length} selected)
                </h3>
                {selectedQuestions.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">
                    Select questions from the question bank below
                  </p>
                ) : (
                  <div className="space-y-3">
                    {selectedQuestionsList.map((question, index) => (
                      <div key={question.id} className="bg-gray-50 p-3 rounded-lg">
                        <div className="flex items-start space-x-3">
                          <input
                            type="checkbox"
                            checked={true}
                            onChange={() => toggleSelect(question.id!)}
                            className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                question.type === 'technical' 
                                  ? 'bg-blue-100 text-blue-800' 
                                  : 'bg-purple-100 text-purple-800'
                              }`}>
                                {question.type}
                              </span>
                              <span className="text-sm text-gray-500">
                                Q{index + 1}
                              </span>
                            </div>
                            <p className="text-gray-800 text-sm">{question.text}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Random Selection Preview
                </h3>
                <p className="text-gray-600 mb-4">
                  {randomRatio || config.ratio === 'random' 
                    ? 'Questions will be randomly selected with random ratio'
                    : `Questions will be randomly selected with ${config.ratio}% technical and ${100 - (config.ratio as number)}% background`
                  }
                </p>
                <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
                  <p className="text-blue-800 text-sm">
                    Total questions: {config.total}
                  </p>
                </div>
              </div>
            )}

            {/* Question Bank for Manual Selection */}
            {config.mode === 'manual' && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Select Questions from Bank
                </h3>
                <div className="space-y-4">
                  <div>
                    <h4 className="text-md font-medium text-gray-700 mb-2">
                      Technical Questions ({technical.length})
                    </h4>
                    <QuestionList
                      items={technical}
                      type="technical"
                      onDelete={() => {}} // No delete in selection mode
                      selectable={true}
                      onToggleSelect={toggleSelect}
                      selectedQuestions={selectedQuestions}
                    />
                  </div>
                  <div>
                    <h4 className="text-md font-medium text-gray-700 mb-2">
                      Background Questions ({background.length})
                    </h4>
                    <QuestionList
                      items={background}
                      type="background"
                      onDelete={() => {}} // No delete in selection mode
                      selectable={true}
                      onToggleSelect={toggleSelect}
                      selectedQuestions={selectedQuestions}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MockConfig;
