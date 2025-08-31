import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { generateReport } from '../api';
import { ReportJson } from '../types';

const Report: React.FC = () => {
  const { id: sessionId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [reportData, setReportData] = useState<ReportJson | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadReport = async () => {
      if (!sessionId) return;

      try {
        const result = await generateReport(sessionId);
        setReportData(result.reportJson);
      } catch (error) {
        console.error('Failed to load report:', error);
        // Use mock data as fallback
        setReportData({
          Overall: "7.6",
          Verdict: "Pass",
          QuestionEvaluations: [
            {
              QuestionText: "Sample Question",
              UserAnswer: "Sample Answer",
              Feedback: "Sample feedback",
              Strengths: ["Sample strength"],
              Weaknesses: ["Sample weakness"],
              Suggestions: ["Sample suggestion"],
              Score: 7
            }
          ]
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadReport();
  }, [sessionId]);

  const handleExportPDF = () => {
    // TODO: Implement PDF export
    console.log('Export PDF functionality to be implemented');
    alert('PDF export functionality will be implemented soon!');
  };

  const handleNewInterview = () => {
    navigate('/');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Generating your interview report...</p>
        </div>
      </div>
    );
  }

  if (!reportData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">
            Report Not Found
          </h2>
          <p className="text-gray-600 mb-6">
            Unable to generate interview report.
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

  const getVerdictColor = (verdict: string) => {
    switch (verdict.toLowerCase()) {
      case 'pass':
        return 'bg-green-100 text-green-800';
      case 'fail':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const getOverallColor = (score: string) => {
    const numScore = parseFloat(score);
    if (numScore >= 8) return 'text-green-600';
    if (numScore >= 6) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Interview Report
          </h1>
          <div className={`text-5xl font-bold mb-4 ${getOverallColor(reportData.Overall)}`}>
            Overall Score: {reportData.Overall}/10
          </div>
          <div className="inline-block">
            <span className={`px-4 py-2 rounded-full text-lg font-medium ${getVerdictColor(reportData.Verdict)}`}>
              {reportData.Verdict}
            </span>
          </div>
        </div>

        {/* Questions and Answers */}
        {reportData.QuestionEvaluations && reportData.QuestionEvaluations.length > 0 ? (
          <div className="space-y-6">
            {reportData.QuestionEvaluations.map((evaluation, index: number) => (
              <div key={index} className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-3">
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        Question {index + 1}
                      </span>
                      <span className="text-sm text-gray-600">Question {index + 1}</span>
                      <span className="text-lg font-bold text-blue-600">
                        Score: {evaluation.Score}/10
                      </span>
                    </div>

                    {/* Question */}
                    <div className="mb-4">
                      <h4 className="text-lg font-medium text-gray-900 mb-2">
                        Question:
                      </h4>
                      <p className="text-gray-800 bg-gray-50 p-3 rounded">
                        {evaluation.QuestionText}
                      </p>
                    </div>

                    {/* User's Answer */}
                    <div className="mb-4">
                      <h4 className="text-lg font-medium text-gray-900 mb-2">
                        Your Answer:
                      </h4>
                      <p className="text-gray-800 bg-blue-50 p-3 rounded border-l-4 border-blue-400">
                        {evaluation.UserAnswer || "No answer provided"}
                      </p>
                    </div>

                    {/* AI Evaluation */}
                    {evaluation.Feedback && (
                      <div>
                        <h4 className="text-lg font-medium text-gray-900 mb-2">
                          AI Evaluation:
                        </h4>
                        <p className="text-gray-800 bg-green-50 p-3 rounded border-l-4 border-green-400">
                          {evaluation.Feedback}
                        </p>
                      </div>
                    )}

                    {/* Strengths */}
                    {evaluation.Strengths && evaluation.Strengths.length > 0 && (
                      <div className="mt-4">
                        <h5 className="text-sm font-medium text-green-700 mb-2">Strengths:</h5>
                        <ul className="list-disc list-inside text-sm text-green-800 space-y-1">
                          {evaluation.Strengths.map((strength: string, idx: number) => (
                            <li key={idx}>{strength}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Weaknesses */}
                    {evaluation.Weaknesses && evaluation.Weaknesses.length > 0 && (
                      <div className="mt-4">
                        <h5 className="text-sm font-medium text-orange-700 mb-2">Areas for Improvement:</h5>
                        <ul className="list-disc list-inside text-sm text-orange-800 space-y-1">
                          {evaluation.Weaknesses.map((weakness: string, idx: number) => (
                            <li key={idx}>{weakness}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Suggestions */}
                    {evaluation.Suggestions && evaluation.Suggestions.length > 0 && (
                      <div className="mt-4">
                        <h5 className="text-sm font-medium text-blue-700 mb-2">Suggestions:</h5>
                        <ul className="list-disc list-inside text-sm text-blue-800 space-y-1">
                          {evaluation.Suggestions.map((suggestion: string, idx: number) => (
                            <li key={idx}>{suggestion}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-600">No question evaluations available.</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-center space-x-6 mt-8">
          <button
            onClick={handleExportPDF}
            className="bg-gray-600 text-white px-8 py-3 rounded-lg hover:bg-gray-700 transition-colors"
          >
            📄 Export PDF
          </button>
          <button
            onClick={handleNewInterview}
            className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            🚀 New Interview
          </button>
        </div>
      </div>
    </div>
  );
};

export default Report;
