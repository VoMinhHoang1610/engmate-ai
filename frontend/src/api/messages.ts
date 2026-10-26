import type { Message } from '../types';

/** Reconcile durable IDs without replacing unchanged rows or duplicating retries. */
export function mergeMessages(previous: Message[], incoming: Message[]): Message[] {
  const rows = new Map(previous.map((row) => [row.message_id, row]));
  for (const row of incoming) {
    const old = rows.get(row.message_id);
    if (!old || old.content !== row.content || old.status !== row.status || old.role !== row.role)
      rows.set(row.message_id, row);
  }
  return [...rows.values()].sort((a, b) => a.message_id - b.message_id);
}

/** Re-read pending rows and the last stable row so terminal status is reconciled. */
export function messageCursor(rows: Message[]): number {
  const pending = rows.find((row) => row.status === 'pending');
  return Math.max(0, (pending?.message_id ?? rows.at(-1)?.message_id ?? 1) - 1);
}
