# Providence — the manual

Everything: what it is, how to install it, how to drive it, what every part does
and why it is there at all. Written so somebody who has never seen this can go
from a clone to a character refusing them in about ten minutes.

Measured against the code as it stands: **24 arcs, 101 states, 111 transitions,
522 tests, 0 verses stored.**

---

## 1. What this is, and the gap it fills

Godot and Unity compute a falling body to a precision no human can match. Ask
either what it *costs* when one character betrays another and there is nothing
there. To an engine, a murder and a handshake are the same event: a state change.

Every shipped game papers over this with a number per character, nudged up and
down by events. That number cannot tell the difference between betraying a
stranger and betraying someone you swore an oath to, however many lines you write
around it.

Providence is the layer that can. **It is not a game and not an engine. It is a
library you put underneath one.** Your game keeps every decision about bodies,
animation and rendering; this owns the inner life and hands back an intent.

---

## 2. Install

```
git clone https://github.com/Sorghobrayan-dotcom/Providence
cd Providence
npm install
npm run dev
```

Open the address Vite prints. That is the editor, and it is the front door.

Node 20.19+ or 22.12+ (Vite 8's floor). The deployed build pins Node 22.

### Keys

```
cp .env.example .env
```

| variable | where it comes from | what breaks without it |
| --- | --- | --- |
| `YOUVERSION_APP_KEY` | [platform.youversion.com](https://platform.youversion.com) | no verse ever resolves; every character goes silent |
| `GLOO_CLIENT_ID` | Gloo AI Studio → API Credentials | characters speak Scripture instead of their own words |
| `GLOO_CLIENT_SECRET` | the same page | as above |

**The names are deliberately not prefixed `VITE_`.** Anything with that prefix is
compiled into the browser bundle and readable by anyone who opens the dev tools
on the deployed site. The browser here calls `/scripture` and `/gloo` on its own
origin, and the server attaches the credential on the way out. A test fails if a
`VITE_*KEY` reappears in client code, because this is the kind of thing that gets
undone by accident six weeks later.

Gloo is not a static key: the id and secret are exchanged for a bearer token that
expires, which is why it is a small middleware rather than a header.

### Running the tests

```
npm test          # 522 assertions across 37 files
npm run build     # tsc, then Vite
npm run docs      # regenerates docs/archetypes.md from the library
```

`npm test` never writes to the repository. It compares the generated sheets
against the committed ones and fails with the command to run.

### Deploying

See `docs/deploying.md`. One thing matters more than the rest: **deploy the
repository, not the `dist` folder.** Dragging the build output into Netlify gives
a site that loads, renders, and has no functions — every character goes silent
and the verses never resolve. It looks like a broken demo and it is a missing
deploy.

---

## 3. Driving the editor

The editor is not a mock-up. It imports and runs the same library the tests
exercise, so what you see on screen is the product rather than a picture of it.

| control | what it does |
| --- | --- |
| **drag** in the viewport | moves *you*. Distance is an input to almost every arc |
| **E** | speak to whoever you are standing within three metres of |
| **S** | ask him |
| **K** | show a kindness, where he can see it |
| the eleven toggles | what the *world* is doing. You are not doing these; they are weather |
| **Soul** | the arc, its state, and its disposition |
| **Relations** | the graph, the deeds you can commit, and the ledger |
| **Place** | the room you are both standing in |
| **Grace** | the running tally, and the one thing you cannot cause |

**Two of these are verbs and eleven are conditions**, and the difference is the
first thing to understand: asking and being kind are yours, and everything in the
toolbar row is the situation you happen to be in. That is why the two are keys
and the eleven are pills.

A first visit is offered a seven-step tour. The `?` in the toolbar replays it.

### The line under the figure

It says what he is doing in plain words and what to press next. It is written per
node, **a cue may only name a control that exists**, and a test enforces that
against the real control list — rename a toggle and the suite fails rather than
the tool quietly lying to whoever is holding it.

### The console

Four channels, and they are not the same kind of statement.

| channel | means |
| --- | --- |
| `arc` | a soul changed state. The reference under it is the passage that transition is drawn from |
| `graph` | a deed was committed, weighed, and possibly refused |
| `grace` | a draw happened, or was withheld |
| `editor` | you did something |

Every line carries a USFM reference, and the verse under it arrived from the
YouVersion Platform a moment ago, in the language asked for. Nothing in the
engine stores that text.

---

## 4. The parts, and why each one exists

### 4.1 Souls — `arcs.ts`, `arcs2.ts`, `adversaries.ts`, `motivated.ts`

**Why:** game characters never change. A guard patrols until the servers shut
down. The figures these are taken from do almost nothing else, so the unit is an
arc rather than a loop.

An arc is nodes and transitions. A node carries a *directive* — what the
character intends this tick — and optional *drift*, how its disposition moves
while it stays there. A transition carries a predicate and the passage it comes
from, and nothing else.

**`Actor.update` fires at most one transition per tick.** A character that
crossed three states in a single frame reads as a glitch rather than as a change
of heart. Drift is authored per second and accumulated against a carry, so sixty
small ticks and one large one produce the same disposition — behaviour does not
change with frame rate.

### 4.2 Relations — `relations.ts`

**Why:** the interesting question is not what one character feels, it is what
moves between them. The text does not treat these as feelings, it treats them as
property: a blessing is finite and can be stolen, a birthright sells for a meal,
a debt is inheritable and a relative may pay it.

Eight deeds, each anchored to a passage:

| deed | passage | what it does |
| --- | --- | --- |
| `bless` | GEN.27.27 | creates a holding, irrevocable once spoken |
| `steal-blessing` | GEN.27.35 | moves it, and it can never move back |
| `sell-birthright` | GEN.25.33 | freely alienable, famously cheap |
| `betray` | PSA.41.9 | weight from the bond that broke, not a table |
| `shed-blood` | GEN.4.10 | reaches both households |
| `lend` | DEU.15.8 | creates a debt |
| `redeem` | LEV.25.25 | **only a kinsman may.** The debt moves onto the redeemer at full cost |
| `forgive` | MAT.18.22 | cancels the claim, keeps the record |

**Betrayal is the part worth reading.** The cost is `3 × gravity × (0.5 +
strength)`, where gravity runs stranger 1, household 2, kin 3, covenant 5. So
betraying a stranger and a sworn ally differ by exactly five at equal strength.
Nothing consults a reputation number.

**Forgiveness is not deletion.** Every system ever built can create, read, update
and delete. None can forgive, because deleting a record is amnesia rather than
pardon. Scripture keeps the record of David's sin and cancels the debt anyway, so
this does both: the claim goes to zero, the deed stays in the ledger forever.

**Cost:** three indexes, so nothing walks the whole graph. `bind` and `bond` are
O(1); `house` is O(degree); `commit` is O(degree + holdings). A test builds ten
thousand characters and asserts the *shape* of the growth curve rather than a
millisecond budget, because a wall clock is flaky on a loaded machine while the
curve is what separates an indexed lookup from a scan.

### 4.3 Memory — `memory.ts`

**Why:** without it, the two halves of the library ran side by side and never
spoke. An arc's trust was a number with no connection to the graph, so you could
betray a character and watch his disposition sit there unchanged.

One character's view of another, read **live** off the graph through getters, not
copied. An early version returned plain fields, which froze every character's
knowledge at the moment it was created: betray someone mid-scene and they kept
reacting to the world as it stood before.

### 4.4 Covenant and Standing — `covenant.ts`, `standing.ts`

Two different things, deliberately not the same type.

**Covenant** is where the *player* stands before the Law: public record, the same
for everyone who looks at it. Blood is not averaged into it — a hundred blessings
do not settle it — which is the difference between a covenant and a score bar.

**Standing** is what a *character* carries: ritual defilement (contracted by
contact, cleared by rite and time), blood guilt (moral, permanent, no rite
touches it), and **concealment**, which is the most behaviourally loaded field in
the library. A defilement everyone can see costs almost nothing to carry; the
same defilement carried in secret costs something every second it stays secret.

**`EYES`** is where the two meet: the same public record read by 24 archetypes.
Read down the table and note how often it is the adversaries whose resolve
*rises* on a righteous player — righteousness is not a universal calming
influence, it is a provocation to anything that lives off it.

### 4.5 Portraits — `portraits.ts`

**Why:** the prompt carried the structure and nothing else, so all twenty four
spoke in one careful register — the fugitive, the judge who fears neither God nor
man, and the woman who says nothing until she says everything.

One per arc: voice, wound, desire, what he will not do whatever the player tries,
and how he reads the same public record. **Every claim carries the passage it is
read from**, and a test insists on it, because a portrait has to be a reading
rather than characterisation we invented.

### 4.6 Drives — `drives.ts`, `motivated.ts`

**Why:** arcs cannot say why two people in the same room, watching the same thing
happen, do opposite things.

Six standing needs, weighted per character, scoring six possible responses. When
several transitions are eligible on the same tick, the strongest pull wins
instead of the first one written.

Martha and Mary are the demonstration: same room, same interruption,
structurally identical arcs, and **only the drives differ**. Each profile also
carries four layers — what breaks it, what it does first, where it goes if the
strain never lets up, and what brings it back. The last is the one games skip.

### 4.7 Places and Atmospheres — `places.ts`, `atmosphere.ts`

**Places** gates space by *qualification* rather than by key: the tabernacle asks
what you are, not what you carry, and turning someone back to the outer court is
not throwing them out of the camp. The cities of refuge are a covering problem —
the text asks for roads prepared so a fugitive can arrive in time — so they are
solved as one, with greedy farthest-point placement for a strong worst case.

**Atmospheres** are the seven rooms: `nowhere`, `dread`, `desert`, `palace`,
`household`, `temple`, `road`. A room puts a floor under what the scene is
already doing, leans on certain drives, and **weighs on the disposition itself**.
That last part is what lets a place reach all 24 arcs rather than only the three
built on drives: stand Balaam's donkey in a frightening room and she balks with
no danger ever shown to her, and neither the arc nor the atmosphere knows the
other exists.

### 4.8 Ways and Bearing — `ways.ts`, `Bearing.ts`, `Motion.ts`

**Why:** every creature walked the same dead-straight line and only the direction
differed. A serpent and a giant closed the same distance identically, which is
wrong about both.

`ways.ts` decides *how* a creature goes, never where. Four are named — the
serpent flanks, the tempter circles, Goliath bears down and respects no personal
space, the donkey turns aside and a beating does not undo it. Everyone else is
straight, and the table is sparse on purpose: the serpent's approach only reads
as sinister because everyone else's is not.

`evading` is separate and is the fix for a real bug: `away-from-player` used to
be a mirror, which points into the wall behind a cornered man and holds him there
while whoever is following strolls up. Measured over a 3,000-tick chase, the
mirror leaves Jonah motionless against an edge for 2,805 of them and `evading`
for none.

`Bearing` reads the disposition and returns how the same walk should *look* —
hunched, hurried, turned away — and decides how close a character is willing to
get. It never touches the destination.

### 4.9 Testimony — `testimony.ts`

The outward half of atmospheres: what the world does *around* a man because of
what he is. The sign says what kind of testimony a presence is, per archetype;
the urgency says how much, read off his condition. Seven arcs are in the table
and the rest are not, because the effect only means something because Ruth walks
in and the sky stays where it was.

### 4.10 Grace — `grace.ts`

**Why:** every engine is a pure function, and even its randomness is a seeded
generator the studio controls. There is no room in that machine for anything
sovereign, which is exactly the problem.

Specified in `docs/grace.md` before a line of it was written. Four properties:

| property | meaning |
| --- | --- |
| uncallable | no game code can trigger it |
| unconfigurable | no parameter, no curve, no difficulty setting |
| unsellable | it cannot be tuned toward paying players |
| unearnable | its rate does not move with virtue, skill or spending |

The last is load-bearing and comes from Matthew 5:45. One draw per episode at
0.2, so four desperate moments in five receive nothing. Per tick would be wrong:
with any per-tick probability, standing in a hopeless state long enough makes
grace certain, and a certainty is farmable.

**It does not undo the loss.** It opens a door that was not there.

### 4.11 Scripture — `Scripture.ts`

The one place text enters. Everything else in the library produces only a
*reference*.

```
memory cache  ->  YouVersion Platform  ->  offline pack  ->  null
```

`null` is a real answer and callers are expected to stay silent on it. Resolved
lines persist to `localStorage`, and anything restored from storage reports as
`pack` rather than `live` — a cache must never claim to be a live call.

**A judge can verify the whole claim in ten seconds: remove the key, clear the
pack, and every character in the demo goes mute.** A test asserts exactly that,
and another reads the engine source files to confirm no verse has crept in.

### 4.12 Gloo — `Utterance.ts`, `GlooVoice.ts`, `Interpreter.ts`

Two jobs.

**It gives the characters their own words.** Nothing in `Utterance.ts` contains a
line of dialogue; it contains the structure — which archetype, which node, what
just changed, how he is holding himself, what he carries, who is asking — plus
the portrait. The model turns that into one line, and the same node produces a
different line for a righteous player than for a fugitive because the inputs
genuinely differ.

Two refusals are load-bearing. The model is forbidden to quote or paraphrase
Scripture, and **the answer is checked rather than trusted**: six consecutive
words in common with the passage is a quotation, and a line that recites is
refused. When no line comes back, the character says nothing. Silence is the
correct output; an invented line never is.

**Only Scripture is cited.** A character's own words appear with no reference
under them, because a paraphrase set beside a reference reads as the verse.

**It arbitrates what the engine cannot classify.** `Interpreter.ts` runs in a
fixed order that is never reversed: own vocabulary first, the model only if it
still cannot tell, then a structural check on whatever came back. A proposal
outside the vocabulary, citing an unparseable reference, citing a passage that
does not match the deed, or under half confidence is refused. Every verdict
records who decided: `engine`, `model` or `refused`.

**A moral engine whose rules a generative system can rewrite at runtime does not
have rules.**

---

## 5. The 24 arcs

### Relationship — how the character stands toward the player

| id | label | source | what it solves |
| --- | --- | --- | --- |
| `jonah` | Le Réticent | JON.1 | Quest-givers that stand in one spot forever. This one runs from the errand you gave him. |
| `peter` | Le Serment Brisé | LUK.22.33 | Loyalty bars that only ever go up or down. This one snaps, then mends higher than before. |
| `ruth` | Celle Qui Choisit | RUT.1.16 | Companions you hire or unlock. This one watches you first, then binds herself, and will not be sent away. |
| `david-cave` | La Retenue | 1SA.24.6 | Enemies that always strike when they can. This one has you, and lowers the blade. |

### Intervention — something done to the player's own course of action

| id | label | source | what it solves |
| --- | --- | --- | --- |
| `balaams-donkey` | L'Ânesse Qui Refuse | NUM.22.23 | Mounts that walk into a wall because the player said so. **The only arc allowed to override player input.** |
| `abigail` | L'Interposée | 1SA.25.18 | Nobody in a game world ever tries to stop the player doing something monstrous. |
| `watching-father` | Celui Qui Guette La Route | LUK.15.20 | Quest-givers that nag you back. This one waits, and the waiting is the point. |
| `unjust-judge` | Le Juge Lassé | LUK.18.2 | Gates opened by reputation or gold. This one opens only to persistence. |
| `jobs-friends` | Les Consolateurs | JOB.2.11 | Allies whose help is always positive. These become harmful, and only by speaking. |

### Adversary — danger a health bar cannot model

| id | label | source | what it solves |
| --- | --- | --- | --- |
| `serpent` | Celui Qui Suggère | GEN.3.1 | Villains whose only verb is attack. This one never fights, and is the most dangerous here. |
| `pharaoh` | La Reddition Fausse | EXO.8.15 | Bosses that surrender once. This one yields, then takes it back, again and again. |
| `saul` | Le Patron Jaloux | 1SA.18.9 | Quest-givers that reward you forever. This one turns hostile *because* you did well. |
| `goliath` | Celui Qui Pétrifie | 1SA.17.10 | Bosses that fight your party. This one suppresses it, and the fight never starts. |
| `delilah` | Celle Qui Sonde | JDG.16.6 | Enemies that never learn. This one asks, is lied to, tests the lie, asks again. |
| `jezebel` | Celle Qui Use De La Loi | 1KI.21.8 | Villains you can fight. This one turns your own institutions against you. |
| `absalom` | Celui Qui Dérobe Les Cœurs | 2SA.15.6 | Rivals that duel you. This one takes your allies by listening to them when you did not. |
| `tempter` | Celui Qui Cite Juste | MAT.4.6 | Enemies defeated by damage. This one quotes your sources accurately, and only an answer stops him. |

### Further — ordinary problems, solved unusually

| id | label | source | what it solves |
| --- | --- | --- | --- |
| `zacchaeus` | Celui Qui Monte Pour Voir | LUK.19.4 | NPCs that shove through a crowd or clip through it. This one climbs. |
| `centurion` | Celui Qui Comprend L'Autorité | MAT.8.8 | Followers that must be escorted. This one executes an order given from far away. |
| `nicodemus` | Celui Qui Vient De Nuit | JHN.3.2 | NPCs with the same dialogue whoever is standing around. This one goes silent in company. |
| `achan` | Celui Qui Prend Dans Le Butin | JOS.7.21 | Party members that never betray the group. This one steals, and the whole party pays. |

### Motivated — driven by pull rather than by written order

| id | label | source | what it solves |
| --- | --- | --- | --- |
| `martha` | Marthe | LUK.10.40 | NPCs that react because the designer wired that event to that reaction. |
| `mary` | Marie | LUK.10.39 | Two NPCs in one room reacting identically. |
| `elijah` | Élie | 1KI.18.21 | Heroes that are fine after the boss dies. This one breaks after *winning*. |

---

## 6. Using it in a game

The library owns the inner life and returns an intent. Your game owns position,
animation and rendering. Keeping that line clean is what lets the same arcs run
in Godot, in a canvas, or headless in a test.

```ts
import { Actor, blankWorld } from './providence/Actor';
import { findArc } from './providence/arcs';
import { RelationGraph } from './providence/relations';
import { memoryFor } from './providence/memory';
import { covenantOf } from './providence/covenant';

const graph = new RelationGraph();
graph.bind('player', 'peter', 'covenant', 0.9);

const peter = new Actor(findArc('peter')!, memoryFor(graph, 'peter'));

// each frame
const event = peter.update(deltaSeconds, {
  ...blankWorld(),
  distanceToPlayer: distanceInMetres,
  underThreat: guardsNearby(),
  kindnessesWitnessed: kindnesses,
  covenant: covenantOf(graph),
});

if (event) {
  // he changed state. event.because is the passage behind it.
  showLine(await scripture.line(event.because));
}

switch (peter.directive.move) {
  case 'toward-player': walkToward(player); break;
  case 'away-from-player': walkAway(player); break;
  case 'hold': stop(); break;
}
```

**Distances are metres.** This was a real bug: they were read in normalised units
against a library that thinks in metres, so every node gated at three metres was
unreachable and characters simply would not answer.

`blankWorld()` returns a quiet world with nothing happening in it. Spread it and
override only the signals you actually track, so adding a field never breaks an
existing integration.

---

## 7. Godot

`godot/` is a Godot 4 project holding a GDScript port and the check that proves
it runs.

```
godot --headless --editor --quit-after 60 --path godot
godot --headless --path godot --script res://check.gd
```

41 assertions, passing on 4.7.1. Two commands rather than one because
`providence.gd` types its return as a global class name, which Godot resolves out
of a cache the editor builds and `.gitignore` excludes.

**Four arcs ship there, not 24.** In the TypeScript a condition is a closure that
may read the relation graph or the player's standing, and none of that
serialises. The port replaces it with a twelve-word tagged vocabulary, which
expresses those four exactly and the other twenty not at all. Widening it is the
work.

---

## 8. Known limits

Stated rather than hidden. `docs/review.md` is the longer version.

- **`house()` reaches one hop.** Guilt touching a grandchild would need a bounded
  traversal, and there is not one. The text plainly goes further.
- **Holdings are never collected.** A cancelled debt stays in the array forever.
  A world running for months would grow without bound.
- **482 kB of Three.js on first paint.** Fine on a laptop, poor on a phone over a
  mobile connection — which is exactly the audience the pitch invokes.
- **`main.ts` and the viewport have no tests.** 1,352 lines of wiring. The
  arithmetic is out, but the wiring is where every remaining bug has been found.
- **A generated line can still resemble the verse behind it.** The recitation
  check catches a passage we supplied, which covers every transition; it cannot
  catch a model recalling a verse from a bare reference. Only Scripture is cited,
  so the resemblance is harmless rather than fixed.
- **The old boss-fight prototype is still in the tree.** 22 files that do not use
  the library, kept because the editor reuses its renderer.

---

## 9. Where everything is

```
src/providence/     the library — 21 modules, no DOM, no network except Scripture
src/editor/         the editor, and the 3D viewport it draws into
src/api/            YouVersion and Gloo clients
functions-shared/   the two proxies, one file each, three adapters each
netlify/ api/ functions/   the adapters
godot/              the GDScript port and its check
notebook/           the Kaggle notebook, its generator and its runner
docs/               this, and everything below
```

| document | what it holds |
| --- | --- |
| `architecture.md` | data structures, index layout, costs |
| `grace.md` | the grace specification, written before the code |
| `archetypes.md` | per-arc sheets, generated from the library |
| `deploying.md` | the two proxies and what they refuse |
| `driving-it.md` | six characters, five minutes |
| `review.md` | an honest audit, including what does not hold up |
| `writeup.md` | the submission writeup |
| `script.md` | the video narration |
