import type { Conversation } from '../types';

export interface LearningCheck {
  id: string;
  prompt: string;
  options: string[];
  skill: string;
  mode: string;
  stimulus: string | null;
}
export interface LearningLesson {
  id: string;
  title: string;
  minutes: number;
  objective: string;
  explanation: string;
  pattern: string;
  example: string;
  translation: string;
  situation: string;
  opening: string;
  practice: string[];
  vocabulary: { term: string; meaning: string; example: string }[];
  reading: { text: string; question: string };
  listening: { text: string; question: string };
  checks: LearningCheck[];
}
export interface LearningModule {
  id: string;
  title: string;
  parts: number[];
  lessons: LearningLesson[];
}
export interface LearningStage {
  id: string;
  title: string;
  target: string;
  description: string;
  level: string;
  modules: LearningModule[];
}
export interface LearningCatalog {
  version: string;
  stages: LearningStage[];
}
export interface LearningPlan {
  version: number;
  goal_score: number;
  start_stage: string;
  minutes: number;
  exam_date: string | null;
}
export interface LessonProgress {
  lesson_id: string;
  conversation_id: number | null;
  phase: number;
  practice_turns: number;
  completed: boolean;
  check_correct: number;
  check_total: number;
  review_due: string | null;
}
export interface LearningProgress {
  lessons: LessonProgress[];
  recommended_lesson_id: string | null;
  review_lesson_ids: string[];
}
export interface LessonStart {
  conversation: Conversation;
  progress: LessonProgress;
}
export interface CheckResult {
  correct: number;
  total: number;
  passed: boolean;
  feedback: { question_id: string; correct: boolean; explanation: string; answer: number }[];
  progress: LessonProgress;
}
