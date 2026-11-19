import { assistantText } from './formatAssistantText';
import './assistant-text.css';

/** Keep a single text node while streaming; React escapes any supplied HTML. */
export function AssistantText({ text }: { text: string }) {
  return <span className="assistant-text">{assistantText(text)}</span>;
}
