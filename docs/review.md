# Review

Written at the end of the build, against the code as it actually stands rather
than as the writeup describes it. Anything here marked as a weakness is a real
one, and the ranked proposals afterwards are what we would do next given more
than a day.

## What the numbers are

| | |
| --- | --- |
| engine | 3,460 lines across 15 modules |
| tests | 2,562 lines, 167 assertions in 18 files |
| editor | 982 lines |
| notebook | 47 cells, 25 of them executable, all passing |
| bundle | 59 kB for the editor, 482 kB for Three.js |

The test-to-engine ratio is roughly 3 to 4, which is the right shape for a
project whose entire argument is that its claims are checked rather than asserted.

## What holds up

**The claims are falsifiable and they are checked.** Not "we wrote tests" but:
the betrayal ratio is asserted at exactly 5, grace is measured at 0.200 across
ten thousand episodes, two populations differing only in merit land within 0.03,
and a test reads the engine source files to confirm no verse text has crept in.
Any of these breaking makes the writeup untrue, and that is the point of them.

**Scripture is load-bearing rather than decorative.** Nothing in 3,460 lines
stores a verse. Remove the key and the characters go silent, which is asserted
directly. The proxy means the credential never reaches the browser, and a test
fails if a `VITE_*KEY` reappears in client code.

**The three pillars are one system.** They were not at first. Arcs kept a trust
number with no connection to the graph, so you could betray a character and watch
its disposition sit unchanged. That was the single worst thing about the
architecture and it is fixed: memory reads live off the graph, and Ruth refuses a
player who hurt her household however kind he is to her.

**Six bugs were found by execution rather than by reading.** Frozen memory,
Peter's terminal state, the self-reached bug, the fixed distance in the simulator,
and two in the proxy. None of them were visible on the page.

## What does not hold up

**The editor has no tests at all.** 982 lines, zero coverage. It is the thing a
judge will look at first and the only part of the project with no safety net. The
excuse is that it is a view and views are awkward to test; the honest answer is
that the panels contain real logic, the graph layout in particular, and none of it
is checked.

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

**One test writes a file.** `archetypeSheets.test.ts` regenerates
`docs/archetypes.md` as a side effect of running the suite. It works and it keeps
the sheets from drifting, but a test that mutates the working tree is not really a
test, and `npm test` should not leave the repository dirty.

## Proposals, ranked by value for the effort

**1. Test the editor panels.** Extract the graph layout and the deed handling from
the DOM and cover them. Perhaps 150 lines of test for the one part of the project
that currently has none. Highest value per hour of anything on this list.

**2. Open Godot once and run the addon.** An hour, and it converts a plausible
claim into a true one. Until that happens the honest phrasing in the writeup is
"a GDScript port" rather than anything stronger.

**3. Lazy-load the viewport.** The editor is usable without Three.js: the
library, the graph, the places and grace all work in the panels. Load the 3D
scene on demand and the first paint drops from 541 kB to 59. This matters most for
the audience the project keeps invoking.

**4. Make the sheet generation a script, not a test.** Move it to
`npm run docs`, and have the test assert the committed file matches what would be
generated. Same protection against drift, without a test that writes to disk.

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
