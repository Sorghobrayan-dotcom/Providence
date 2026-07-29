import type { BossPhaseConfig } from '../entities/Boss';

/**
 * "La Nuit du Bâton" — the hackathon's vertical slice boss: the twin
 * spirits behind Pharaoh's magicians (Jannès et Jambrès, named in
 * 2 Timothée 3:8), fused into a single Prince for the final phase. Three
 * phases, three lies, three verses — the last one judged free-form.
 */
export const PRINCES_MAGICIENS_ENCOUNTER: readonly BossPhaseConfig[] = [
  {
    name: 'Jannès, Ombre du Premier Signe',
    maxHp: 60,
    lie: "Ton peuple n'a plus de Dieu après quatre cents ans d'esclavage. Il vous a oubliés dans cette terre.",
    correctVerseId: 'josue-1-5',
    riseSpeedMultiplier: 1.15,
    patterns: [
      {
        id: 'griffe-ombre',
        telegraphMs: 550,
        activeMs: 150,
        recoveryMs: 400,
        damage: 10,
        reach: 90,
        parryable: true,
      },
      {
        id: 'onde-de-doute',
        telegraphMs: 700,
        activeMs: 180,
        recoveryMs: 480,
        damage: 14,
        reach: 220,
        parryable: false,
      },
    ],
  },
  {
    name: 'Jambrès, Ombre du Bâton Inversé',
    maxHp: 80,
    lie: 'Regarde ce bâton dans ta main : un morceau de bois ne courbe pas un empire.',
    correctVerseId: 'zacharie-4-6',
    riseSpeedMultiplier: 1.2,
    patterns: [
      {
        id: 'fouet-ombre',
        telegraphMs: 450,
        activeMs: 130,
        recoveryMs: 350,
        damage: 12,
        reach: 100,
        parryable: true,
      },
      {
        id: 'onde-de-doute',
        telegraphMs: 600,
        activeMs: 180,
        recoveryMs: 420,
        damage: 16,
        reach: 240,
        parryable: false,
      },
      {
        id: 'griffe-ombre',
        telegraphMs: 400,
        activeMs: 140,
        recoveryMs: 320,
        damage: 12,
        reach: 90,
        parryable: true,
      },
    ],
  },
  {
    name: 'Le Prince Sans Visage',
    maxHp: 100,
    lie: 'Ton peuple a oublié son Dieu en quatre cents ans dans cette terre. Un bâton ne réveille pas les morts.',
    correctVerseId: null,
    riseSpeedMultiplier: 1.25,
    freeformFallbackKeywords: ['promesse', 'souvien', 'fidèle', 'fidele', 'alliance', 'oublie', 'vivant', 'puissance'],
    patterns: [
      {
        id: 'fouet-ombre',
        telegraphMs: 380,
        activeMs: 120,
        recoveryMs: 300,
        damage: 14,
        reach: 100,
        parryable: true,
      },
      {
        id: 'onde-de-doute',
        telegraphMs: 520,
        activeMs: 170,
        recoveryMs: 380,
        damage: 18,
        reach: 250,
        parryable: false,
      },
    ],
  },
];
