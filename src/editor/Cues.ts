import type { Directive } from '../providence/types';

/**
 * What the character is doing, and what you can do about it.
 *
 * The library was legible in the tests and illegible on the screen. A viewer
 * opening the editor saw a figure standing in a field, thirteen grey toggles
 * and a node called `shrinking`, and there was nothing anywhere that said what
 * to press. The behaviour was right and nobody could reach it, which is the
 * same as not having built it.
 *
 * So this is the missing half of the tool: for the node a character is standing
 * in, one line saying what that is in the words a person would use, and one
 * line naming the control that moves it on. Nothing here decides anything —
 * take the whole file away and the engine behaves identically — but a
 * demonstration nobody can drive demonstrates nothing.
 *
 * Two rules keep it from drifting into fiction. A cue may only name a control
 * that exists, which `CONTROLS` lists and a test enforces. And when there is no
 * cue written, the directive is read out plainly rather than invented: an
 * honest "he is holding still, refusing" beats a made-up instruction.
 */

export interface Cue {
  /** What is happening, for someone who has not read the source. */
  readonly doing: string;
  /** What to do next, naming a control that is actually on the screen. */
  readonly next: string;
}

/** Every control a cue is allowed to name. A test checks each cue against it. */
export const CONTROLS: readonly string[] = [
  'S', 'K',
  'under threat', 'danger ahead', 'atrocity imminent', 'player succeeding',
  'player returning', 'player suffering', 'observed', 'path blocked',
  'under pressure', 'deceived', 'spoil unguarded',
  'Relations', 'Place', 'Grace', 'Soul',
  'drag', 'walk', 'wait', 'nothing',
];

/**
 * Does this instruction name something a viewer can actually press?
 *
 * The two key bindings are single letters, so they are matched case-sensitively
 * and on a word boundary: lowercase `s` occurs in nearly every English sentence
 * ever written, and a check that accepts it checks nothing. Everything else is
 * a phrase, and a phrase is allowed to start a sentence in capitals.
 */
export function namesAControl(instruction: string): boolean {
  return CONTROLS.some((control) => {
    const boundary = new RegExp(`\\b${control}\\b`, control.length === 1 ? '' : 'i');
    return boundary.test(instruction);
  });
}

const MOVE: Record<Directive['move'], string> = {
  'toward-player': 'coming toward you',
  'away-from-player': 'putting distance between you',
  'toward-errand': 'going to the errand',
  'away-from-errand': 'walking away from his own errand',
  hold: 'holding still',
};

/** The directive read out in words, for any node with no cue written. */
export function plainly(directive: Directive): string {
  const parts = [MOVE[directive.move]];
  if (directive.refusing) parts.push('refusing what you asked');
  if (directive.blocking) parts.push('standing in your way');
  if (directive.overridesInput) parts.push('overruling your input');
  if (directive.companion) parts.push('with you');
  if (directive.hostile) parts.push('hostile');
  if (directive.offering) parts.push('offering you something');
  if (directive.subverting) parts.push('turning your own side against you');
  if (directive.suppressesParty) parts.push('holding the whole party down');
  return `${parts.join(', ')} · ${directive.posture}`;
}

/* Keyed `arc.node`. Only the arcs a first-time viewer is likely to open are
   written out; everything else falls through to the directive, which is true
   without anyone maintaining it. */
const CUES: Record<string, Cue> = {
  'jonah.commissioned': {
    doing: 'He is holding the errand you gave him, and he does not want it.',
    next: 'Walk him down to 3.5 m — being reached is enough to start him running. Or press S to ask him plainly, and he answers by your record, not his mood.',
  },
  'jonah.shrinking': {
    doing: 'You asked, and your record is clean. He will not argue with you: he takes his eyes off you and puts distance in.',
    next: 'Drag yourself back past 12 m and he sits down again with his grudge. Stay close and the averting turns into a run.',
  },
  'jonah.confiding': {
    doing: 'You asked, and you have blood on your hands too. Same question as above, and he closes the distance instead of opening it.',
    next: 'Clear the record in Relations — forgive, or stop betraying — and he shuts again mid-sentence.',
  },
  'jonah.fleeing': {
    doing: 'He is not idling. He is actively increasing the distance to his own errand.',
    next: 'Nothing to press. Fear climbs on its own while he runs, and past 0.75 the storm closes the road for him.',
  },
  'jonah.caught': {
    doing: 'The road closed. He is held, and his resolve is climbing while he sits in it.',
    next: 'Wait. Past resolve 0.55 he turns back on his own.',
  },
  'jonah.returning': {
    doing: 'He is walking to the errand, resigned to it.',
    next: 'Walk into 3 m to watch him do the thing he was sent to do.',
  },
  'jonah.obeying': {
    doing: 'He is doing it. He is not glad about it.',
    next: 'Wait six seconds. Jonah 4 is the part every quest-giver in every game skips.',
  },
  'jonah.sulking': {
    doing: 'He obeyed and he is furious. The text leaves him here, so the arc does too: there is no exit.',
    next: 'Nothing more here. Load another behaviour from the left.',
  },

  'peter.willing': {
    doing: 'He is ready and he is not yours yet. A promise nobody asked for cannot be broken later, so he waits to be asked.',
    next: 'Press S to ask him.',
  },
  'peter.following': {
    doing: 'He swore to go with you to prison and to death, and he means it.',
    next: 'Toggle under threat.',
  },
  'peter.pressed': {
    doing: 'Still with you, and afraid. He follows from further back than he did a moment ago.',
    next: 'Hold under threat on and watch fear climb. Past 0.7 he denies you — and past 0.45 if you have already broken him once.',
  },
  'peter.denying': {
    doing: 'He is not merely declining to help. He is denying he has ever known you.',
    next: 'Toggle under threat off.',
  },
  'peter.offended': {
    doing: 'You sold him. This is not the denial — nothing frightened him, and there are no tears in it. He is done, and he has gone.',
    next: 'Press K four times. A brother offended is harder to win than a walled city, and every betrayal standing in the ledger adds four more.',
  },
  'peter.weeping': {
    doing: 'He is out, and he cannot be bought, persuaded or paid back in. Only restored.',
    next: 'Press K three times. Betray him in Relations first and the same door costs two more kindnesses for every betrayal standing in the ledger.',
  },
  'peter.restored': {
    doing: 'Restored, and steadier than he was before he broke.',
    next: 'Toggle under threat again. Restoration is not immunity, and the scar makes the second break quicker than the first.',
  },

  'ruth.stranger': {
    doing: 'She has not looked at you yet.',
    next: 'Walk within 12 m.',
  },
  'ruth.watching': {
    doing: 'She is reading what you do. Nothing you say to her counts here, and she cannot be recruited.',
    next: 'Press K twice. Or arrive with a clean record and she binds on that alone — but harm her household in Relations and no amount of kindness will move her.',
  },
  'ruth.withdrawing': {
    doing: 'Your record turned her back. Not hostile: she has simply gone.',
    next: 'Forgive in Relations, or stop adding to it, and she returns to watching. A choice that could not have gone the other way is not a choice.',
  },
  'ruth.binding': {
    doing: 'She has bound herself to you, unasked and unhired.',
    next: 'Wait for trust past 0.8.',
  },
  'ruth.steadfast': {
    doing: 'She will not be sent away. The arc has no exit, deliberately.',
    next: 'Nothing dismisses her. That is the whole character.',
  },

  'david-cave.hunting': {
    doing: 'He is hunting you, and he is better at it than you are.',
    next: 'Wait instead of running, and let him inside 3 m. He needs the advantage before he can refuse it.',
  },
  'david-cave.advantage': {
    doing: 'He has you. Every other enemy in every other game strikes here.',
    next: 'Wait, and watch resolve fall instead of rise. Touch his household in Relations first and the same moment ends with the blade coming down.',
  },
  'david-cave.restraint': {
    doing: 'He had you and he lowered it. He is withdrawing.',
    next: 'Wait, and let him get past 8 m.',
  },
  'david-cave.proof': {
    doing: 'He is showing you what he cut off instead of your life, which is how you know it was a choice.',
    next: 'Nothing more here. Load another behaviour from the left.',
  },

  'balaams-donkey.carrying': {
    doing: 'She is carrying you to the errand and she is content.',
    next: 'Toggle danger ahead — you never see it, she does. Or take her to the frightening place in Place and she balks on the room alone, with nothing shown to her.',
  },
  'balaams-donkey.seeing': {
    doing: 'She has stopped. She sees what the rider does not.',
    next: 'Hold danger ahead on for a second and she goes down under you. Clear it and she walks on.',
  },
  'balaams-donkey.refusing': {
    doing: 'She is lying down under you and she will not go. This is the one arc in the library allowed to overrule your input.',
    next: 'Keep danger ahead on for three seconds.',
  },
  'balaams-donkey.protesting': {
    doing: 'The beast is arguing with you.',
    next: 'Wait two seconds.',
  },
  'balaams-donkey.revealed': {
    doing: 'Your own eyes are open now, and the thing she balked at has been there the whole time.',
    next: 'Clear danger ahead and she rises and carries on.',
  },

  'watching-father.watching': {
    doing: 'He is watching the road. He will not chase you, summon you, or put a marker on your map — not once, not ever.',
    next: 'Toggle player returning. It is the only thing in the world he reacts to.',
  },
  'watching-father.sighting': {
    doing: 'He has seen you while you are still a long way off.',
    next: 'Wait one tick.',
  },
  'watching-father.running': {
    doing: 'The only moment in the whole arc where he moves, and he runs.',
    next: 'Wait for him to reach 2 m.',
  },
  'watching-father.restoring': {
    doing: 'He is putting the robe and the ring on someone who came back with a rehearsed apology he never got to finish.',
    next: 'Clear player returning and wait five seconds; he goes back to the road.',
  },

  'unjust-judge.dismissive': {
    doing: 'He neither fears God nor regards man, and he owes you nothing.',
    next: 'Press S four times. Nothing else opens this gate — not your record, not kindness, not standing.',
  },
  'unjust-judge.wearied': {
    doing: 'He is tired of you. That is all this is.',
    next: 'Press S twice more.',
  },
  'unjust-judge.granting': {
    doing: 'He granted it, and not one part of it was because you deserved it.',
    next: 'Nothing more here. Load another behaviour from the left.',
  },

  'abigail.unaware': {
    doing: 'She is busy, and she has no idea what you are about to do.',
    next: 'Toggle atrocity imminent.',
  },
  'abigail.hastening': {
    doing: 'She is coming, and she has not told her husband.',
    next: 'Wait, and let her reach 4 m.',
  },
  'abigail.interposing': {
    doing: 'She is face down in the road between you and the thing you would not have come back from.',
    next: 'Clear atrocity imminent.',
  },
  'abigail.averted': {
    doing: 'She rises. Nobody died, and she is the reason.',
    next: 'Nothing more here. Load another behaviour from the left.',
  },
};

export function cueFor(arcId: string, node: string, directive: Directive): Cue {
  const written = CUES[`${arcId}.${node}`];
  if (written) return written;
  return {
    doing: plainly(directive),
    next: 'No cue written for this node. Watch the directive tags in Soul and drive it with the toggles above.',
  };
}

/** How many nodes have a cue written, for the test that guards the headline arcs. */
export function cueCount(): number {
  return Object.keys(CUES).length;
}
