# Review

Written at the end of the build, against the code as it actually stands rather
than as the writeup describes it. Anything here marked as a weakness is a real
one, and the ranked proposals afterwards are what we would do next given more
than a day.

## What the numbers are

| | |
| --- | --- |
| engine | 5,540 lines across 21 modules |
| tests | 6,144 lines, 509 assertions in 36 files |
| editor | 3,578 lines, 170 assertions in 11 files |
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

**Scripture is load-bearing rather than decorative.** Nothing in 5,540 lines
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
All twenty four now carry a portrait: register, wound, desire, what he will not
do whatever happens, and how he reads the same public record. Every claim carries
the passage it is read from and a test insists on it, because a portrait has to
be a reading rather than characterisation we invented.

Asked to open, through the live API: Martha says `Va chercher l'eau` and Mary
says `Je reste ici`. Jezebel offers `je peux rédiger ce qu'il faut pour que
d'autres agissent à votre place`. The centurion: `Un ordre de vous suffirait, je
n'ai pas besoin que vous veniez`. Goliath does not address you at all — `Alors,
Israël, vous m'envoyez enfin quelqu'un` — which is the arc's whole claim, made
in his own words rather than in ours.

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

**The Godot addon has been run.** It was written, reviewed and shipped, and for
a long time nobody had opened Godot once — which is why the phrasing everywhere
was "a GDScript port" and never anything stronger. `godot/` is now a project and
`godot/check.gd` is 41 assertions against it, passing on 4.7.1: every arc whole
and cited, Peter breaking at eight seconds and refusing two kindnesses before
the third brings him back, the donkey overruling the rider, the serpent hostile
in no state at all, and the same drift at any frame rate.

Two things came out of running it. `providence.gd` types its return as
`ProvidenceActor`, a global class name Godot resolves from a cache the editor
builds and `.gitignore` excludes, so on a fresh clone the addon will not compile
from a script alone — the editor has to be opened once, which is documented now
rather than discovered. And the plugin's autoload appeared to fail: it does not.
A three-line control plugin making the identical call behaves identically, and
one explicit `ProjectSettings.save()` writes both entries at once. Headless
`--quit-after` simply exits before the editor saves its settings.

**`npm test` no longer edits the repository.** The suite regenerated
`docs/archetypes.md` as a side effect, which kept the sheets from drifting and
also hid the drift it existed to catch: the file was fixed before anyone was told
it was wrong. The default is now to compare and fail with the command to run;
`npm run docs` writes.

## What does not hold up

**`main.ts` and `Stage3D.ts` still have no tests.** This was the worst thing on
the list and most of it is now closed: `Bearing`, `Speech`, the console, the
logo, the cues, the panels, the encounter, the verbs, the tour, the controls and
the movement carry 170 assertions between them. Every extraction was made
because the code being pulled out had already been wrong once.

What is left is the 1,352 lines of `main.ts` and the viewport, and it is now
genuinely wiring: which element to write into, which listener to hang, what to
call on a frame. The arithmetic is out. That is still the largest untested file
in the repository and still where every remaining bug has been found — the boot
path that set the first arc up by hand, the cast that left it out of the graph,
the three from the conversation, and the two counters that survived a load.

**A generated line can still resemble the verse behind it, and that is now
harmless rather than fixed.** The check catches recitation of a passage we
supplied — six consecutive words in common is a quotation — which covers every
transition. It cannot catch a model recalling a verse from a bare reference, and
that happened twice: Goliath's opening was very nearly 1 Samuel 17:10, and
Elijah's a recognisable reformulation of 1 Kings 18:21.

Portraits fixed Goliath, because a character with somewhere else to draw from
draws from there. Elijah is the harder case and probably not fixable by
prompting: the thing he is famous for saying is the thing the scene calls for.
What made it dangerous was not the resemblance but the citation — the plate
printed `1KI.18.21` under his own words, which is precisely the failure this
project names in its own writeup. Only Scripture is cited now. His words stand
without a reference and the console keeps it, labelled as telemetry.

**Godot ships 4 arcs, not 24.** In the TypeScript a condition is a closure that
may read the relation graph, the player's standing, or how many times the
character has already stood where it is standing, and none of that serialises.
The port replaces it with a twelve-word tagged vocabulary, which expresses these
four exactly and the other twenty not at all. The README used to say a condition
is code and therefore cannot be data — which the port itself contradicts, since
it *is* data there. Widening the vocabulary is the work.

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

**1. Widen the Godot condition vocabulary.** Twelve tagged conditions carry four
arcs. Most of the other twenty need only two or three more — a comparison
against the graph, and a visit count. It is the difference between a sample and
a port.

**2. Lazy-load the viewport.** The editor is usable without Three.js: the
library, the graph, the places and grace all work in the panels. Load the 3D
scene on demand and the first paint drops from 541 kB to 59. This matters most for
the audience the project keeps invoking.

**3. Bound the traversal in `house()`.** A depth limit with a decay per hop, so
bloodguilt reaching a grandchild costs less than reaching a son. Small change,
and it makes the propagation claim considerably stronger.

**4. Compact cancelled holdings.** A periodic sweep, or a generational split
between live and settled. Only matters for a long-lived world, which is why it is
this far down.

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
