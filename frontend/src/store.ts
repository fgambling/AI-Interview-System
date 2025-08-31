import { create } from 'zustand';
import { QuestionDTO, InterviewConfig } from './types';

interface InterviewStore {
  // State
  role: string;
  technical: QuestionDTO[];
  background: QuestionDTO[];
  sessionId?: string;
  selectedQuestions: string[];   // Manually selected question IDs in manual mode
  config: InterviewConfig;
  
  // Actions
  setRole: (role: string) => void;
  setQuestions: (questions: { technical: QuestionDTO[]; background: QuestionDTO[] }) => void;
  removeQuestion: (id: string, type: QuestionDTO['type']) => void;
  regenerate10x10: () => void;
  appendMore: (techCount?: number, bgCount?: number) => void;
  toggleSelect: (id: string) => void;
  setConfig: (partial: Partial<InterviewConfig>) => void;
  setSessionId: (sessionId: string) => void;
  clearSelection: () => void;
}

export const useInterviewStore = create<InterviewStore>((set) => ({
  // Initial state
  role: '',
  technical: [],
  background: [],
  sessionId: undefined,
  selectedQuestions: [],
  config: {
    mode: 'manual',
    total: 10,
    ratio: 70
  },

  // Actions
  setRole: (role: string) => set({ role }),
  
  setQuestions: (questions) => set({ 
    technical: questions.technical.map(q => ({ ...q, id: q.id || `temp_${Date.now()}_${Math.random()}` })),
    background: questions.background.map(q => ({ ...q, id: q.id || `temp_${Date.now()}_${Math.random()}` }))
  }),
  
  removeQuestion: (id: string, type: QuestionDTO['type']) => {
    if (type === 'technical') {
      set(state => ({ 
        technical: state.technical.filter(q => q.id !== id),
        selectedQuestions: state.selectedQuestions.filter(sid => sid !== id)
      }));
    } else {
      set(state => ({ 
        background: state.background.filter(q => q.id !== id),
        selectedQuestions: state.selectedQuestions.filter(sid => sid !== id)
      }));
    }
  },
  
  regenerate10x10: () => {
    // This will be called from components after API call
    set({ selectedQuestions: [] });
  },
  
  appendMore: () => {
    // This will be called from components after API call
    // The actual questions will be added via setQuestions
  },
  
  toggleSelect: (id: string) => {
    set(state => ({
      selectedQuestions: state.selectedQuestions.includes(id)
        ? state.selectedQuestions.filter(sid => sid !== id)
        : [...state.selectedQuestions, id]
    }));
  },
  
  setConfig: (partial) => {
    set(state => ({
      config: { ...state.config, ...partial }
    }));
  },
  
  setSessionId: (sessionId: string) => set({ sessionId }),
  
  clearSelection: () => set({ selectedQuestions: [] })
}));
