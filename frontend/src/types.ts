export type QuestionType = "technical" | "background";

export interface QuestionDTO {
  id?: string;                 // Frontend generated temporary id
  type: QuestionType;
  difficulty: number;          // 1-5
  text: string;
  tags: string[];
  expectedPoints: string[];
  selected?: boolean;          // For manual selection mode
}

export interface GenRequest {
  role: string;
  total: number;
  techRatio: number;
}

export interface GenResult {
  questions: QuestionDTO[];
}

export interface CreateSessionReq {
  configId?: string;
  questions?: QuestionDTO[];
}

export interface AnswerReq {
  sessionId: string;
  orderNo: number;
  answerText: string;
}



export interface QuestionEvaluation {
  QuestionText: string;
  UserAnswer: string;
  Feedback: string;
  Strengths: string[];
  Weaknesses: string[];
  Suggestions: string[];
  Score: number;
}

export interface ReportJson {
  Overall: string;
  Verdict: string;
  QuestionEvaluations: QuestionEvaluation[];
}

export interface InterviewConfig {
  mode: "manual" | "random";
  total: number;              // Default is 10
  ratio: number | "random";   // 0-100 or "random"
}

export interface InterviewSession {
  id: string;
  status: string;
  startedAt: string;
  endedAt: string;
  createdAt: string;
}

export interface SessionQuestion {
  id: string;
  sessionId: string;
  orderNo: number;
  questionText: string;
  type: string;
  difficulty: number;
  answerText: string;

  scoreJson: string;
  createdAt: string;
}

export interface InterviewReport {
  id: string;
  sessionId: string;
  reportJson: string;
  createdAt: string;
}
