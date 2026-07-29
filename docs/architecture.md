# How Providence is built

Notes on the data structures and what they cost, for anyone deciding whether to
put this under a real project.

## The relation graph

Characters are nodes, bonds are edges. An edge has a kind and a strength, and
the kind is what matters: `stranger`, `household`, `kin`, `covenant`.

Bonds are symmetric. An alliance is not owed in one direction only, so the pair
`(a, b)` and `(b, a)` are the same edge and the index key sorts the two names
before joining them. Getting this wrong is an easy way to end up with two
half-edges that disagree.

### Three indexes

```
relations[]   insertion order, for replay and audit
byPair        Map<"a\0b", Relation>       one entry per edge
byAgent       Map<name, Relation[]>       adjacency
byHolder      Map<name, Set<Holding>>     what each character currently holds
```

The array is kept because a ledger you cannot walk in order is not a ledger.
Every *read* goes through an index.

### Cost

| operation | cost | why |
| --- | --- | --- |
| `bind`, `relation`, `bond` | O(1) | hash on the unordered pair |
| `house(who)` | O(deg) | adjacency list, not a scan of every edge |
| `holdingsOf`, `debtOf` | O(h) | h is what that one character holds |
| `commit` | O(deg + h) | dominated by whichever it touches |

Nothing walks the whole graph. `deg` is the number of people one character is
tied to, which stays small in practice however large the cast: a person has a
household and a few sworn ties, not ten thousand.

`src/__tests__/providenceScale.test.ts` builds ten thousand characters and
asserts the *shape* of the curve rather than a wall-clock budget. A millisecond
threshold is flaky on a loaded machine; the growth ratio is what actually
separates an indexed lookup from a scan. Per-query cost at 10x the population
must stay under 4x. With linear scans it would land near 10.

### The part that is easy to break

A good changing hands has to leave the old owner's index, not merely appear in
the new one. Everything goes through `moveHolding`, and a test sells a birthright
back and forth two hundred times and then checks exactly one copy exists. Without
that, a blessing can be stolen twice.

## Behaviour arcs

An arc is nodes and transitions. A node carries a directive (what the character
intends this tick) and optional drift (how its disposition moves while it stays
there). A transition carries a predicate and a passage reference.

`Actor.update` fires **at most one** transition per tick. A character that
crossed three states in a single frame reads as a glitch rather than as a change
of heart.

Drift is authored per second and accumulated against a carry, so behaviour does
not change with frame rate. Sixty small ticks and one large one produce the same
disposition.

Cost is O(t) per tick, t being the transitions leaving the current node, which
is between one and three everywhere in the library.

## Scripture

The engine holds references. `Scripture.line()` is the only path text takes.

```
memory cache  ->  YouVersion Platform  ->  offline pack  ->  null
```

`null` is a real answer and callers are expected to stay silent on it. Resolved
lines persist to `localStorage`, so a reference resolved yesterday costs nothing
today, and anything restored from storage reports as `pack` rather than `live`:
a cache must never claim to be a live call.

The pack is small on purpose. It exists so a network failure during a demo does
not kill it, not as a substitute for the platform.

## Interpretation

`Interpreter.interpret` runs in a fixed order that is never reversed:

1. the engine's own vocabulary, including a few synonyms and a word scan
2. the model, only if step 1 found nothing
3. a structural check on whatever came back

A proposal is refused if it names a deed outside the vocabulary, cites an
unparseable reference, cites a passage that does not match the deed it names, or
carries a confidence below half. Every verdict records `engine`, `model` or
`refused`.

The model cannot extend the vocabulary, only choose within it. A moral engine
whose rules a generative system can rewrite at runtime does not have rules.

## Where the credentials live

Not in the browser. Env names are deliberately not `VITE_` prefixed, because
Vite compiles anything with that prefix into the bundle. The client calls
`/scripture` on its own origin and `vite.config.ts` attaches the App Key server
side. A test fails if a `VITE_*KEY` reappears in client code.

For production the shape is the same: keep the path, move the header injection
into a serverless function.

## Known limits

- The Godot port carries four arcs, not 21. Transitions hold predicates, and a
  predicate is code, so it cannot be serialised out of the TypeScript.
- `house()` follows kin and household edges only one hop. Guilt reaching a
  grandchild would need a traversal with a depth bound, which is not written.
- Holdings are never garbage collected. A world running for months would want to
  compact cancelled entries, and nothing does that yet.
