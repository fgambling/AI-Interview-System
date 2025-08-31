import React from 'react';
import { QuestionDTO } from '../types';

interface QuestionListProps {
  items: QuestionDTO[];
  type: "technical" | "background";
  onDelete: (id: string) => void;
  selectable?: boolean;
  onToggleSelect?: (id: string) => void;
  selectedQuestions?: string[];
}

const QuestionList: React.FC<QuestionListProps> = ({ 
  items, 
  type, 
  onDelete, 
  selectable = false, 
  onToggleSelect, 
  selectedQuestions = []
}) => {
  const getDifficultyColor = (difficulty: number) => {
    if (difficulty <= 2) return 'bg-green-100 text-green-800';
    if (difficulty <= 4) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  const getDifficultyText = (difficulty: number) => {
    if (difficulty <= 2) return 'Beginner';
    if (difficulty <= 4) return 'Intermediate';
    return 'Advanced';
  };

  const getTypeColor = (type: QuestionDTO['type']) => {
    return type === 'technical' 
      ? 'bg-blue-100 text-blue-800' 
      : 'bg-purple-100 text-purple-800';
  };

  if (items.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        No {type} questions available
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {items.map((question) => (
        <div key={question.id} className="bg-white rounded-lg shadow-md p-4 hover:shadow-lg transition-shadow">
          <div className="flex items-start space-x-3">
            {selectable && onToggleSelect && (
              <input
                type="checkbox"
                checked={selectedQuestions.includes(question.id!)}
                onChange={() => onToggleSelect(question.id!)}
                className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
            )}
            
            <div className="flex-1">
              <div className="flex items-start justify-between mb-3">
                <div className="flex space-x-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(question.type)}`}>
                    {question.type}
                  </span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDifficultyColor(question.difficulty)}`}>
                    {getDifficultyText(question.difficulty)}
                  </span>
                </div>
                
                <button
                  onClick={() => onDelete(question.id!)}
                  className="text-red-600 hover:text-red-800 text-sm font-medium"
                >
                  Delete
                </button>
              </div>
              
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                {question.text}
              </h3>

              <div className="space-y-3">
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Tags:</h4>
                  <div className="flex flex-wrap gap-2">
                    {question.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-md"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Expected Points:</h4>
                  <div className="flex flex-wrap gap-2">
                    {question.expectedPoints.map((point, index) => (
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
        </div>
      ))}
    </div>
  );
};

export default QuestionList;

