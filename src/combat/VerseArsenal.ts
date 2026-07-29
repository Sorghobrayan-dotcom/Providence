import { VERSE_LIBRARY, type Verse } from '../data/verses';

export function getCarriedArsenal(): readonly Verse[] {
  return VERSE_LIBRARY;
}

/** A null correctVerseId means the phase is closed by free-form judgment, never by picking. */
export function isCorrectVerse(selectedVerseId: string, correctVerseId: string | null): boolean {
  if (correctVerseId === null) return false;
  return selectedVerseId === correctVerseId;
}
