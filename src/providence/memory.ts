import type { Bond, RelationGraph } from './relations';

/**
 * What a character knows about the person in front of it.
 *
 * Until this existed the two halves of Providence ran side by side and never
 * spoke. An arc's trust was a number with no connection to the graph, so you
 * could betray a character and watch his disposition sit there unchanged. That
 * is the difference between a behaviour tree with extra steps and an engine
 * where a relationship means something.
 *
 * A character is not told "underThreat = true" and left to react. It asks
 * whether this person has broken a bond with it, hurt its household, or ever
 * forgiven it anything, and answers accordingly.
 */
export interface Memory {
  readonly bond: Bond;
  readonly strength: number;
  /** Times they have betrayed me. It accumulates; it is not a flag. */
  readonly betrayals: number;
  /** They did not touch me. They touched someone of mine. */
  readonly harmedMyHouse: boolean;
  /** What I still hold against them, after any forgiveness. */
  readonly grievance: number;
  readonly owedToThem: number;
  /** They released a claim on me. Few characters forget this. */
  readonly forgivenMe: boolean;
  /** They took something that had been spoken over me. */
  readonly tookWhatWasMine: boolean;
}

/** A character with no history: a stranger, and nothing has happened yet. */
export const NO_MEMORY: Memory = {
  bond: 'stranger',
  strength: 0,
  betrayals: 0,
  harmedMyHouse: false,
  grievance: 0,
  owedToThem: 0,
  forgivenMe: false,
  tookWhatWasMine: false,
};

/**
 * One character's view of another, read off the graph. Deliberately narrow: an
 * actor should see what concerns it, not the whole world.
 *
 */
export function memoryFor(graph: RelationGraph, self: string, other = 'player'): Memory {
  /* Getters, not values. An object literal evaluates its expressions once, so
     returning plain fields here froze every character's knowledge at the moment
     it was created: betray someone mid-scene and they would keep reacting to
     the world as it stood before. Reading through accessors is what makes the
     memory live, which is the entire point of the module. */
  return {
    get bond() {
      return graph.bond(self, other);
    },
    get strength() {
      return graph.relation(self, other)?.strength ?? 0;
    },
    get betrayals() {
      return graph.ledger.filter((j) => j.deed === 'betray' && j.actor === other && j.toward === self).length;
    },
    get harmedMyHouse() {
      return graph.ledger.some(
        (j) =>
          j.actor === other &&
          j.toward !== self &&
          (j.deed === 'betray' || j.deed === 'shed-blood' || j.deed === 'steal-blessing') &&
          j.reached.includes(self),
      );
    },
    get grievance() {
      return graph
        .holdingsOf(self)
        .filter((h) => h.good === 'grievance' && h.origin === other)
        .reduce((sum, h) => sum + h.amount, 0);
    },
    get owedToThem() {
      return graph
        .holdingsOf(self)
        .filter((h) => h.good === 'debt' && h.origin === other)
        .reduce((sum, h) => sum + h.amount, 0);
    },
    get forgivenMe() {
      return graph.ledger.some((j) => j.deed === 'forgive' && j.actor === other && j.toward === self);
    },
    /* A holding records who spoke the blessing, not who it was taken from, so
       the theft is read off the ledger rather than off the object. */
    get tookWhatWasMine() {
      return graph.ledger.some(
        (j) => j.deed === 'steal-blessing' && j.actor === other && j.toward === self && !j.refused,
      );
    },
  };
}
