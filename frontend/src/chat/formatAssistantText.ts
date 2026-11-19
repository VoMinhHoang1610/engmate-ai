/** Plain-text presentation for legacy and current assistant replies, including partial SSE text. */
export function assistantText(text: string): string {
  return text
    .replace(/\r\n?/g, '\n')
    .replace(/^[\t ]*`{3,}[^\n]*$/gm, '')
    .replace(/^[\t ]*#+[\t ]*/gm, '')
    .replace(/^[\t ]*[*+-][\t ]+(?=\S)/gm, '• ')
    .replace(/[*`]/g, '');
}

/** Remove visual list markers as well as markup before sending text to speech. */
export function assistantSpeechText(text: string): string {
  return assistantText(text)
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[_#>|]/g, '')
    .replace(/^[\t ]*(?:[•+-]|\d+[.)])[\t ]+/gm, '')
    .trim();
}
