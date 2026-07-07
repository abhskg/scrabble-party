import { readFile } from 'node:fs/promises';
import wordListPath from 'word-list';

export async function loadDictionary(): Promise<Set<string>> {
  const raw = await readFile(wordListPath, 'utf8');
  return new Set(raw.split('\n').map(w => w.trim().toUpperCase()).filter(Boolean));
}

export function isWordValid(dict: Set<string>, word: string): boolean {
  return dict.has(word.toUpperCase());
}
