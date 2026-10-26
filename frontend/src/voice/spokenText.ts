const MAX_REPLY_CHARS = 12000;
const MAX_PHRASE_CHARS = 600;
// Start the first TTS job before a long opening sentence has finished streaming.
const FIRST_CLAUSE_CHARS = 32;
const FIRST_PHRASE_CHARS = 96;
// Once two clips are already in flight, batch short sentences so a talkative
// reply does not create a new paid provider job for every sentence.
const LATER_PHRASE_CHARS = 120;

/** Preserve raw streamed text until a speakable boundary is known. */
export class SpokenText {
  private received = '';
  private pending = '';
  private consumed = 0;
  private ends: number[] = [];

  /** Raw Unicode prefix represented by the next queued phrase (not UTF-16 units). */
  nextEnd(): number {
    return this.ends.shift() ?? 0;
  }

  push(delta: string): string[] {
    if (this.received.length + delta.length > MAX_REPLY_CHARS)
      throw new Error('Câu trả lời quá dài để đọc. Bạn có thể xem nội dung trong hội thoại.');
    this.received += delta;
    this.pending += delta;
    return this.drain(false);
  }

  finish(content: string): string[] {
    if (!content.startsWith(this.received))
      throw new Error('Nội dung phản hồi hoàn tất không khớp với luồng đang đọc.');
    const chunks = this.push(content.slice(this.received.length));
    return [...chunks, ...this.drain(true)];
  }

  private emitted = 0;

  private drain(final: boolean): string[] {
    const chunks: string[] = [];
    while (this.pending.trim()) {
      const boundaries: number[] = [];
      // Wait for whitespace after punctuation: a delta ending in "3." may become "3.14".
      for (const match of this.pending.matchAll(/[.!?…]["'”’)*_`]*(?=\s)|\n+/g)) {
        const end = match.index + match[0].length;
        const prefix = this.pending.slice(0, end);
        if (prefix.lastIndexOf('[') > prefix.lastIndexOf(']')) continue;
        if (/\b(?:Mr|Mrs|Ms|Dr|Prof|Sr|Jr|e\.g|i\.e)\.$/i.test(prefix)) continue;
        boundaries.push(end);
      }
      let boundary = boundaries[0] ?? 0;
      if (this.emitted >= 2 && boundaries.length) {
        if (final) {
          // The stream is complete; keep the remaining tail in one bounded clip.
          const last = boundaries.at(-1)!;
          if (last <= MAX_PHRASE_CHARS) boundary = last;
        } else if (boundary < LATER_PHRASE_CHARS) {
          boundary =
            boundaries.find((end) => end >= LATER_PHRASE_CHARS) ??
            (this.pending.length >= MAX_PHRASE_CHARS ? boundaries.at(-1)! : 0);
        }
      }
      if (this.emitted === 0) {
        // A comma/colon gives the learner audio sooner than waiting for the
        // full sentence or the 96-character cap. Only use a clause boundary
        // before the first sentence boundary and inside the first-phrase cap.
        for (const match of this.pending.matchAll(/[,;:](?=\s)/g)) {
          const end = match.index + match[0].length;
          if (end < FIRST_CLAUSE_CHARS || end > FIRST_PHRASE_CHARS) continue;
          if (boundary && end > boundary) break;
          const prefix = this.pending.slice(0, end);
          if (prefix.lastIndexOf('[') > prefix.lastIndexOf(']')) continue;
          boundary = end;
          break;
        }
      }
      if (
        this.emitted === 0 &&
        (boundary > FIRST_PHRASE_CHARS || (!boundary && this.pending.length >= FIRST_PHRASE_CHARS))
      ) {
        // Do not wait for a long first sentence or an unpunctuated wall of text.
        const space = this.pending.lastIndexOf(' ', FIRST_PHRASE_CHARS);
        boundary = space >= FIRST_CLAUSE_CHARS ? space : FIRST_PHRASE_CHARS;
      }
      if (!boundary && this.pending.length <= MAX_PHRASE_CHARS) {
        if (!final) break;
        boundary = this.pending.length;
      }
      if (!boundary || boundary > MAX_PHRASE_CHARS) {
        const space = this.pending.lastIndexOf(' ', MAX_PHRASE_CHARS);
        boundary = space > 0 ? space : MAX_PHRASE_CHARS;
      }
      // A hard phrase cap must not split an astral character or skew receipts.
      if (
        /[\uD800-\uDBFF]/.test(this.pending[boundary - 1]) &&
        /[\uDC00-\uDFFF]/.test(this.pending[boundary] ?? '')
      )
        boundary--;
      const plain = this.pending
        .slice(0, boundary)
        .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
        .replace(/[*_`#>|]/g, '')
        .trim();
      const remainder = this.pending.slice(boundary);
      const trimmed = remainder.trimStart();
      this.consumed +=
        Array.from(this.pending.slice(0, boundary)).length +
        Array.from(remainder.slice(0, remainder.length - trimmed.length)).length;
      this.pending = trimmed;
      if (plain) {
        chunks.push(plain);
        this.emitted++;
        this.ends.push(this.consumed);
      }
    }
    return chunks;
  }
}
