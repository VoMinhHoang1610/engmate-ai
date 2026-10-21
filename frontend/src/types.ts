export interface Account {
  username: string;
  email: string;
}
export interface Capabilities {
  provider: 'mock' | 'blaze' | 'openai' | 'gemini';
  streaming?: boolean;
  is_mock: boolean;
  chat: boolean;
  speech: boolean;
  realtime: boolean;
  voice_provider?: 'blaze' | 'native';
  reason: string | null;
}
export interface Conversation {
  conversation_id: number;
  title: string;
  status: 'in_progress' | 'completed' | 'abandoned';
  created_at: string;
}
export interface Message {
  message_id: number;
  role: 'user' | 'assistant';
  content: string;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
}
export interface Turn {
  message: Message;
  reply: Message;
}
