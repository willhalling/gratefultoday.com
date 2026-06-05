export function buildHighlightSet(words?: string[]): Set<string> {
  return new Set((words ?? []).map((w) => w.toLowerCase()));
}

export function isWordHighlighted(word: string, hlSet: Set<string>): boolean {
  return hlSet.has(word.toLowerCase());
}
