export interface VocabularyWord {
  id: string;
  term: string;
  part_of_speech: 'noun' | 'verb' | 'adjective' | 'adverb' | 'phrase';
  ipa: string;
  meaning_vi: string;
  example_en: string;
  example_vi: string;
  cefr: string;
}

export interface TopicSummary {
  id: string;
  title_vi: string;
  title_en: string;
  description: string;
  icon: 'coffee' | 'briefcase';
  word_count: number;
  levels: string[];
}

export interface VocabularyCatalog {
  version: string;
  accent: 'en-GB';
  review_status: 'ai_authored_unreviewed';
  topics: TopicSummary[];
}

export interface VocabularyTopic extends Omit<TopicSummary, 'word_count' | 'levels'> {
  words: VocabularyWord[];
}

export interface WordState {
  topic_id: string;
  word_id: string;
  remembered: boolean;
  version: number;
}

export interface VocabularyStates {
  states: WordState[];
  legacy_imported: boolean;
}

export type VocabularyAction =
  | {
      kind: 'state';
      topicId: string;
      wordId: string;
      body: { client_request_id: string; remembered: boolean; version: number };
    }
  | { kind: 'import'; body: { client_request_id: string; remembered_keys: string[] } };
