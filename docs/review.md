# Review

Written at the end of the build, against the code as it actually stands rather
than as the writeup describes it. Anything here marked as a weakness is a real
one, and the ranked proposals afterwards are what we would do next given more
than a day.

## What the numbers are

| | |
| --- | --- |
| engine | 5,228 lines across 21 modules |
| tests | 5,893 lines, 483 assertions in 35 files |
| editor | 3,561 lines, 145 assertions in 10 files |
| notebook | 47 cells, 25 of them executable, all passing |
| bundle | 59 kB for the editor, 482 kB for Three.js |

The test-to-engine ratio is roughly 1 to 1, which is the right shape for a
project whose entire argument is that its claims are checked rather than asserted.

## What holds up

**The claims are falsifiable and they are checked.** Not "we wrote tests" but:
the betrayal ratio is asserted at exactly 5, grace is measured at 0.200 across
ten thousand episodes, two populations differing only in merit land within 0.03,
and a test reads the engine source files to confirm no verse text has crept in.
Any of these breaking makes the writeup untrue, and that is the point of them.

**Scripture is load-bearing rather than decorative.** Nothing in 5,228 lines
stores a verse. Remove the key and the characters go silent, which is asserted
directly. The proxy means the credential never reaches the browser, and a test
fails if a `VITE_*KEY` reappears in client code. And what the model sends back is
now checked for recitation rather than trusted not to recite.

**The three pillars are one system.** They were not at first. Arcs kept a trust
number with no connection to the graph, so you could betray a character and watch
its disposition sit unchanged. That was the single worst thing about the
architecture and it is fixed: memory reads live off the graph, and Ruth refuses a
player who hurt her household however kind he is to her.

**Six bugs were found by execution rather than by reading.** Frozen memory,
Peter's terminal state, the self-reached bug, the fixed distance in the simulator,
and two in the proxy. None of them were visible on the page.

**A gesture that moves nothing now gets an answer.** A character spoke if and
only if his arc had just changed, so asking Ruth for help — which her arc reads
nothing into, deliberately — produced silence, and silence is indistinguishable
from an empty world though what happened was a refusal. There is a conversation
now: an offer to speak pinned over whoever you are standing next to, five
gestures aimed at that person, and a line back either way. Three more things were
found by driving it rather than by reading it: the menu's class collided with the
toolbar's and stretched it, the approach threshold sat above the distance a newly
loaded character spawns at so every click down the library bought a generated
line, and the menu was wide enough to cover the person it was about.

**Being sold now costs something, and fleeing means leaving.** `memory.betrayals`
was read at exactly one threshold — how many kindnesses mend Peter's own denial —
so selling a man while he walked beside you changed nothing at all. He now goes,
and four kindnesses a betrayal is the price of getting him back, which is what
Proverbs 18:19 costs. And `away-from-player` was a mirror, which points into the
wall behind a fleeing man and holds him there while whoever is following strolls
up: measured, the mirror leaves Jonah motionless against an edge for 2,805 ticks
of a 3,000-tick chase, and `evading` for none of them. Driving that found one
more: `requestsMade` and `kindnessesWitnessed` survived a change of character, so
everyone after the first arrived already asked and already credited with a
kindness shown to somebody else.

**They no longer all speak in the same voice.** The prompt carried the structure
and nothing else — which node, how afraid, what the player's record says — which
is enough for a plausible line and nowhere near enough for a particular man's.
Eight portraits now go with it: register, wound, desire, what he will not do
whatever happens, and how he reads the same public record. Every claim carries
the passage it is read from and a test insists on it, because a portrait is a
reading rather than characterisation we invented. Asked the same question, the
fugitive answers `Tu voulais quoi, toi, en fuyant ?` and the judge answers
`Encore toi ? Le juge ne change pas d'avis parce qu'on frappe deux fois à sa
porte`.

**The instrument explains itself now.** The cue always said what the character
was doing and nothing said what the room around him was: why two controls are
keys and eleven are toggles, what the four tabs hold, what the console is a log
of. All of that was written down in `docs/`, where nobody with five minutes finds
it. Seven steps, offered once and replayable from the `?`. The thing that rots in
a tour is the anchor — rename a zone and it goes on highlighting nothing — so the
test reads the editor's own source and fails on a selector that is no longer in
it.

**The arithmetic is out of the frame loop, and one list is one list.** Movement —
how fast, on what line, how close it is willing to get, what happens when the
ground runs out — lived in `main.ts` where it could not be called twice, and all
four parts of it had been wrong at some point without anything going red. It is
in `Motion` now with fifteen assertions, including the scale that made every node
gated at three metres unreachable. Separately, the toolbar, the cue check and the
cue markup each kept their own hand-typed copy of the control names: rename a
toggle and only the toolbar followed, while the check that exists to catch that
went on passing against the stale copy. `Soul` proves it had already happened —
in the vocabulary, missing from the markup, so every cue sending a reader to that
tab has failed to highlight it for as long as those cues have existed.

**`npm test` no longer edits the repository.** The suite regenerated
`docs/archetypes.md` as a side effect, which kept the sheets from drifting and
also hid the drift it existed to catch: the file was fixed before anyone was told
it was wrong. The default is now to compare and fail with the command to run;
`npm run docs` writes.

## What does not hold up

**`main.ts` and `Stage3D.ts` still have no tests.** This was the worst thing on
the list and most of it is now closed: `Bearing`, `Speech`, the console, the
logo, the cues, the relation panel, the encounter, the verbs, the tour, the
controls and the movement carry 145 assertions between them. Every extraction
was made because the code being pulled out had already been wrong once.

What is left is the 1,352 lines of `main.ts` and the viewport, and it is now
genuinely wiring: which element to write into, which listener to hang, what to
call on a frame. The arithmetic is out. That is still the largest untested file
in the repository and still where every remaining bug has been found — the boot
path that set the first arc up by hand, the cast that left it out of the graph,
the three from the conversation, and the two counters that survived a load.

**Sixteen of the twenty four have no portrait.** They are listed by hand in
`PENDING` and the suite fails if an arc is neither written nor listed, so it is a
backlog rather than a hole. But the fallback has a failure mode worth naming:
without a portrait the model leans on the one piece of character it was given,
which is the passage behind the change, and paraphrases it. Goliath's first line
was very nearly 1 Samuel 17:10 back at us — printed under a reference, which
reads as Scripture and is not. That is the one thing this project must not be
caught doing.

A line is now checked rather than trusted: six consecutive words in common with
the passage is a quotation, and a line that recites is refused, which means
silence. **What that does not cover** is the case that produced Goliath. The
greeting had no passage attached to it — only the reference — and the model
recalled the verse from its own memory, so there was nothing to compare against.
The check protects every transition, which is where most lines come from. The
real fix for the rest is the sixteen portraits.

**Godot ships 4 arcs, not 24.** A transition holds a predicate, and a predicate
is code rather than data, so it cannot be exported from the TypeScript and
re-read. Each one has to be written again by hand. The README says so, but a
reader could reasonably expect parity.

**Nobody has run the Godot addon.** It is written and it is plausible, and that is
not the same as working. Neither of us has opened Godot.

**The 482 kB of Three.js is the whole viewport budget.** Fine on a laptop, poor
on a phone over a Burkinabè mobile connection, which is exactly the audience the
pitch invokes. Nothing is lazy-loaded and nothing is tree-shaken beyond what Vite
does by default.

**`house()` reaches one hop.** Guilt touching a grandchild would need a bounded
traversal, and there is not one. The text plainly goes further than one hop.

**Holdings are never collected.** A cancelled debt stays in the array forever. A
world running for months would grow without bound and nothing compacts it.

**The old boss-fight prototype is still in the tree.** 22 files that do not use
the library. The README explains it honestly, but a third of the repository
pointing somewhere else is a cost paid by every reader.

## Proposals, ranked by value for the effort

**1. Cover the panels.** The relation panel has its cast tested and the graph
layout, the deed buttons and the place notes do not. It is the last real
arithmetic left in the editor with nothing under it.

**2. Open Godot once and run the addon.** An hour, and it converts a plausible
claim into a true one. Until that happens the honest phrasing in the writeup is
"a GDScript port" rather than anything stronger.

**3. Lazy-load the viewport.** The editor is usable without Three.js: the
library, the graph, the places and grace all work in the panels. Load the 3D
scene on demand and the first paint drops from 541 kB to 59. This matters most for
the audience the project keeps invoking.

**4. Write the sixteen remaining portraits.** Not for completeness: an arc
without one leans on the passage it was handed and paraphrases it, which is the
one thing this project must not be caught doing.

**5. Bound the traversal in `house()`.** A depth limit with a decay per hop, so
bloodguilt reaching a grandchild costs less than reaching a son. Small change,
and it makes the propagation claim considerably stronger.

**6. Compact cancelled holdings.** A periodic sweep, or a generational split
between live and settled. Only matters for a long-lived world, which is why it is
this far down.

**7. Move the prototype to `examples/`.** Mechanical, touches twenty files'
imports, and the README already explains the situation. Deliberately last: the
risk of breaking a working build outweighs the tidiness, and dead code was the
real problem, which is already gone.

## What we would not do

**Port the remaining 20 arcs to GDScript by hand.** They would drift from the
TypeScript within a week and then the two would disagree. Either find a way to
express conditions as data both sides can read, or keep the port small and say so.

**Add another AI dependency.** The drives and grace are pure computation, and they
are stronger for it. Nothing in the behaviour needs a model, and a model in that
path would make the behaviour unreproducible.

**Raise the grace rate to make it more visible in a demo.** It is 0.2 because
four desperate moments in five receiving nothing is the whole idea. Tuning it for
a camera would be the exact thing the four properties exist to forbid.
