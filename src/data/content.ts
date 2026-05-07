// ─── Question Types ─────────────────────────────────────────────────────────
export interface FillBlankQuestion {
  id: string;
  sentenceBefore: string;
  sentenceAfter: string;
  options: string[];
  answer: string;
}

export interface MatchPair {
  id: string;
  left: string;
  right: string;
}

export interface MultipleChoiceQuestion {
  id: string;
  question: string;
  options: string[];
  answer: string;
}

export interface ReorderQuestion {
  id: string;
  words: string[];
  correctOrder: string[];
}

export interface TrueFalseQuestion {
  id: string;
  statement: string;
  isTrue: boolean;
}

export interface TypingQuestion {
  id: string;
  word: string;
  hint: string;
}

// ─── App Data Store Shape ────────────────────────────────────────────────────
import { ChallengeDef } from '../types';

export interface AppData {
  lessons: any[];
  challenges: ChallengeDef[];
  fillblank: Record<string, FillBlankQuestion[]>;
  matchword: Record<string, MatchPair[][]>;
  multiplechoice: Record<string, MultipleChoiceQuestion[]>;
  reorder: Record<string, ReorderQuestion[]>;
  truefalse: Record<string, TrueFalseQuestion[]>;
  typing: Record<string, TypingQuestion[]>;
}
