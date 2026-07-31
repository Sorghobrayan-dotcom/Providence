import type { WorldView } from '../providence/types';

/**
 * Everything a reader can touch, named once.
 *
 * It was named three times. The toolbar built its toggles from one list, the
 * cues checked themselves against a second, and the routine that marks up a cue
 * so the eye finds the control carried a third — a regular expression with
 * eleven labels typed out by hand. Rename a toggle and only the toolbar
 * changed: the cues went on naming a control that no longer existed, the check
 * that exists to catch exactly that went on passing because it was reading the
 * stale list, and the markup quietly stopped emphasising it. Three lists
 * agreeing by hand is one list and two rumours.
 *
 * The distinction the interface is built on lives here too: eleven of these are
 * things the world *is*, and three are things the player *does*. That is why the
 * three are keys and the eleven are toggles, and it is the first thing a viewer
 * has to understand about the tool.
 */

type World = Omit<WorldView, 'timeInNode'>;

/** What the world is doing. The player is not doing these; they are weather. */
export const FLAGS: readonly { key: keyof World; label: string }[] = [
  { key: 'underThreat', label: 'under threat' },
  { key: 'dangerAhead', label: 'danger ahead' },
  { key: 'atrocityImminent', label: 'atrocity imminent' },
  { key: 'playerSucceeding', label: 'player succeeding' },
  { key: 'playerReturning', label: 'player returning' },
  { key: 'playerSuffering', label: 'player suffering' },
  { key: 'observedByOthers', label: 'observed' },
  { key: 'pathBlocked', label: 'path blocked' },
  { key: 'underPressure', label: 'under pressure' },
  { key: 'playerDeceived', label: 'deceived' },
  { key: 'spoilUnguarded', label: 'spoil unguarded' },
];

/**
 * What the player does. Matched case-sensitively and on a word boundary: a
 * lowercase `s` occurs in nearly every English sentence ever written, and a
 * check that accepts it checks nothing.
 */
export const KEYS: readonly string[] = ['S', 'K', 'E'];

/** The four tabs of the inspector. */
export const PANELS: readonly string[] = ['Soul', 'Relations', 'Place', 'Grace'];

/**
 * Plain words a cue may use when the honest answer is that there is nothing to
 * press. They are accepted and deliberately not emphasised: emphasis on the
 * word "wait" would promise a button that is not there.
 */
export const PLAIN: readonly string[] = ['drag', 'walk', 'wait', 'nothing'];

/** Every name a cue is allowed to use. */
export const CONTROLS: readonly string[] = [
  ...KEYS,
  ...FLAGS.map((f) => f.label),
  ...PANELS,
  ...PLAIN,
];

/** Does this instruction name something a viewer can actually press? */
export function namesAControl(instruction: string): boolean {
  return CONTROLS.some((control) => {
    const boundary = new RegExp(`\\b${control}\\b`, control.length === 1 ? '' : 'i');
    return boundary.test(instruction);
  });
}

/**
 * Mark up the controls a cue names, so the eye finds them before the sentence.
 *
 * Escaping runs first and on the raw text, so a cue can never inject markup and
 * the tags added afterwards are the only ones in the result.
 */
export function markControls(instruction: string): string {
  const escaped = instruction.replace(
    /[&<>]/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c] as string,
  );

  const named = [...FLAGS.map((f) => f.label), ...PANELS]
    .sort((a, b) => b.length - a.length) // longest first, so no label eats another
    .join('|');

  return escaped
    .replace(new RegExp(`\\b(${KEYS.join('|')})\\b`, 'g'), '<kbd>$1</kbd>')
    .replace(new RegExp(`\\b(${named})\\b`, 'g'), '<b>$1</b>');
}
