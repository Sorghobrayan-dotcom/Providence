export type VerseTheme = 'abandon' | 'force' | 'doute' | 'protection';

export interface Verse {
  readonly id: string;
  readonly reference: string;
  readonly textFr: string;
  readonly textEn: string;
  readonly theme: VerseTheme;
}

/**
 * Offline arsenal. Text is Segond 1910 (FR) / King James (EN) — both public
 * domain — so the game has real, correctly-attributed Scripture on screen
 * even before a YouVersion API key is wired in. YouVersionClient overlays
 * live, licensed text from the Platform API on top of this at runtime;
 * this dataset is what ships if that call fails or hasn't happened yet.
 */
export const VERSE_LIBRARY: readonly Verse[] = [
  {
    id: 'josue-1-5',
    reference: 'Josué 1:5',
    textFr: "Je ne te délaisserai point, je ne t'abandonnerai point.",
    textEn: 'I will not fail thee, nor forsake thee.',
    theme: 'abandon',
  },
  {
    id: 'zacharie-4-6',
    reference: 'Zacharie 4:6',
    textFr: "Ce n'est ni par la puissance ni par la force, mais par mon Esprit, dit l'Éternel des armées.",
    textEn: 'Not by might, nor by power, but by my spirit, saith the LORD of hosts.',
    theme: 'force',
  },
  {
    id: 'psaume-27-1',
    reference: 'Psaume 27:1',
    textFr: "L'Éternel est ma lumière et mon salut : de qui aurais-je crainte ?",
    textEn: 'The LORD is my light and my salvation; whom shall I fear?',
    theme: 'doute',
  },
  {
    id: 'exode-14-14',
    reference: 'Exode 14:14',
    textFr: "L'Éternel combattra pour vous ; vous, gardez le silence.",
    textEn: 'The LORD shall fight for you, and ye shall hold your peace.',
    theme: 'protection',
  },
];

export function findVerse(id: string): Verse | undefined {
  return VERSE_LIBRARY.find((verse) => verse.id === id);
}
