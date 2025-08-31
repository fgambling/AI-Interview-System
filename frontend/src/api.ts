import axios from 'axios';
import { QuestionDTO, ReportJson } from './types';

const API_BASE_URL = 'http://localhost:8080/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Mock data for fallback
const mockTechnicalQuestions: QuestionDTO[] = [
  {
    id: 'mock_tech_1',
    type: 'technical',
    difficulty: 3,
    text: 'Explain how React Hooks work and when to use them',
    tags: ['React', 'Hooks', 'Frontend'],
    expectedPoints: ['useState', 'useEffect', 'Lifecycle', 'Custom Hooks']
  },
  {
    id: 'mock_tech_2',
    type: 'technical',
    difficulty: 4,
    text: 'Describe the differences between REST and GraphQL APIs',
    tags: ['API', 'Backend', 'Architecture'],
    expectedPoints: ['Data Fetching', 'Over-fetching', 'Under-fetching', 'Schema']
  }
];

const mockBackgroundQuestions: QuestionDTO[] = [
  {
    id: 'mock_bg_1',
    type: 'background',
    difficulty: 2,
    text: 'How do you handle team conflicts?',
    tags: ['Teamwork', 'Communication'],
    expectedPoints: ['Active listening', 'Compromise', 'Documentation']
  },
  {
    id: 'mock_bg_2',
    type: 'background',
    difficulty: 3,
    text: 'Describe a challenging project you worked on',
    tags: ['Project Management', 'Problem Solving'],
    expectedPoints: ['Challenge description', 'Solution approach', 'Lessons learned']
  }
];



const mockReport: ReportJson = {
  Overall: "7.6",
  Verdict: "Pass",
  QuestionEvaluations: [
    {
      QuestionText: "What is TypeScript and how does it differ from JavaScript?",
      UserAnswer: "TypeScript is a superset of JavaScript that adds static typing. It helps catch errors at compile time and provides better tooling support.",
      Feedback: "Good understanding of TypeScript's core concept. The answer shows awareness of static typing benefits and tooling advantages.",
      Strengths: ["Clear explanation", "Understanding of benefits", "Tooling awareness"],
      Weaknesses: ["Could provide more examples", "Missing compilation process details"],
      Suggestions: ["Add practical examples of type annotations", "Explain the compilation process"],
      Score: 8
    },
    {
      QuestionText: "Describe a challenging project you worked on and how you overcame obstacles.",
      UserAnswer: "I worked on a large-scale e-commerce platform that had performance issues. I implemented caching strategies and database optimization.",
      Feedback: "Good problem identification and solution approach. The answer demonstrates technical problem-solving skills.",
      Strengths: ["Problem identification", "Technical solution", "Performance focus"],
      Weaknesses: ["Could elaborate on specific obstacles", "Missing metrics or results"],
      Suggestions: ["Provide specific performance metrics", "Detail the obstacles faced"],
      Score: 7
    }
  ]
};

// Helper function to separate questions by type
const separateQuestionsByType = (questions: QuestionDTO[]) => {
  const technical: QuestionDTO[] = [];
  const background: QuestionDTO[] = [];
  
  questions.forEach(q => {
    if (q.type === 'technical') {
      technical.push(q);
    } else {
      background.push(q);
    }
  });
  
  return { technical, background };
};

export const generateQuestions = async (
  role: string, 
  techCount: number = 10, 
  bgCount: number = 10
): Promise<{ technical: QuestionDTO[]; background: QuestionDTO[] }> => {
  try {
    const total = techCount + bgCount;
    const techRatio = Math.round((techCount / total) * 100);
    
    const response = await api.post('/questions/generate', {
      role,
      total,
      techRatio
    });
    
    const questions = response.data.questions || [];
    return separateQuestionsByType(questions);
  } catch (error) {
    console.error('Failed to generate questions:', error);
    // Return mock data as fallback
    return {
      technical: mockTechnicalQuestions,
      background: mockBackgroundQuestions
    };
  }
};

export const createSession = async (payload: any): Promise<{ sessionId: string }> => {
  try {
    const response = await api.post('/session/create', payload);
    return response.data;
  } catch (error) {
    console.error('Failed to create session:', error);
    // Return mock session ID as fallback
    return { sessionId: 'mock-session-id' };
  }
};

export const submitAnswer = async (
  sessionId: string, 
  orderNo: number, 
  answerText: string
): Promise<{ message: string }> => {
  try {
    const response = await api.post(`/session/${sessionId}/answer`, {
      sessionId,
      orderNo,
      answerText
    });
    return response.data;
  } catch (error) {
    console.error('Failed to submit answer:', error);
    // Return mock data as fallback
    return { message: 'Answer submitted successfully' };
  }
};

export const getNextQuestion = async (sessionId: string): Promise<any> => {
  try {
    const response = await api.get(`/session/${sessionId}/next`);
    return response.data;
  } catch (error) {
    console.error('Failed to get next question:', error);
    // Return mock data as fallback
    return {
      orderNo: 1,
      question: "What is your experience with TypeScript?",
      type: "Technical",
      difficulty: 3
    };
  }
};

export const finishSession = async (sessionId: string): Promise<{ message: string }> => {
  try {
    const response = await api.post(`/session/${sessionId}/finish`);
    return response.data;
  } catch (error) {
    console.error('Failed to finish session:', error);
    // Return mock data as fallback
    return { message: 'Mock session finished' };
  }
};

export const generateReport = async (sessionId: string): Promise<{ reportJson: ReportJson }> => {
  try {
    const response = await api.post(`/session/${sessionId}/report`);
    return response.data;
  } catch (error) {
    console.error('Failed to generate report:', error);
    // Return mock data as fallback
    return { reportJson: mockReport };
  }
};

// Get available D-ID presenters for Clips Streams
export const getPresenters = async () => {
  try {
    const response = await api.get('/presenters');
    return response.data;
  } catch (error) {
    console.error('Failed to fetch presenters:', error);
    // Return fixed Fiona presenter as fallback
    return [
      {
        id: 'v2_Fiona_NoHands_BlackJacket_ClassRoom@1BOeggEufb',
        name: 'Fiona',
        description: 'Teacher-style virtual human, wearing black jacket, suitable for interview environment'
      }
    ];
  }
};
