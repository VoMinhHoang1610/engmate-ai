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

export type GenerationJobStatus =
  'pending' | 'running' | 'completed' | 'failed' | 'cancelled' | 'deleted';

export interface GenerationJob {
  request_id: string;
  status: GenerationJobStatus;
  target_count: number;
  validated_count: number;
  batch_size: number;
  poll_after_ms: number;
  topic_id: string | null;
  error_code: string | null;
  retry_after: number | null;
}

export interface VocabularyUsage {
  date: string;
  jobs_started: number;
  jobs_limit: number;
  calls_reserved: number;
  calls_used: number;
  calls_limit: number;
  resets_at: string;
}

export interface CustomTopicSummary {
  topic_id: string;
  title_vi: string;
  title_en: string;
  description: string;
  word_count: number;
  remembered_count: number;
  review_status: string;
  source: 'custom';
  created_at: string;
}

export interface CustomWord extends VocabularyWord {
  remembered: boolean;
  version: number;
}

export interface CustomTopicDetail {
  topic_id: string;
  title_vi: string;
  title_en: string;
  description: string;
  word_count: number;
  review_status: string;
  source: 'custom';
  created_at: string;
  words: CustomWord[];
}

export interface CustomTopicsResponse {
  topics: CustomTopicSummary[];
  active_jobs: GenerationJob[];
  usage: VocabularyUsage;
}

export interface GenerationCreate {
  client_request_id: string;
  topic: string;
  target_count: 30 | 60;
}
