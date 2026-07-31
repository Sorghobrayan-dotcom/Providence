# Providence

A moral physics layer for game engines.

Your engine already computes where a falling body lands, to a precision no human
can match. Ask it what it means when one character betrays another and there is
nothing there. To an engine, a murder and a handshake are the same event: a state
change. Providence fills that gap.

It is not a game and it is not an engine. It is a library you put underneath one.

```
npm install
npm run dev
```

Then open the address Vite prints. The editor is the front door; `nuit-du-baton.html`
is the older prototype described at the bottom of this file.

---

## What's in it

### Souls — `src/providence/arcs.ts`, `arcs2.ts`, `adversaries.ts`, `motivated.ts`

24 NPC behaviours taken from figures in the text. The reason to look there is
that game characters never change, and biblical ones do almost nothing else.

Jonah runs from the errand you just gave him, and he runs properly: wherever you
go he takes the line that keeps leaving, rather than the reflection that walks
him into a wall and holds him there. When circumstance drags him back he obeys
and sulks about it. Peter denies you under pressure and cannot be bought back,
only restored — and if you sell him while he is at your side he simply goes, and
four kindnesses a betrayal is what winning him back costs. Balaam's donkey sees
what the rider cannot and overrules the player's own input. The serpent never
fights: it offers something genuinely useful and is gone before the consequence
lands.

Each arc is a set of nodes and transitions. A transition carries the condition
that fires it and the passage it comes from, and nothing else.

### Relations — `src/providence/relations.ts`

A graph. The interesting question is not what one character feels, it is what
moves between them, so blessing, birthright, debt and grievance are modelled as
objects with owners and transfer rules.

A blessing is finite and irreversible once spoken. A debt does not evaporate when
someone rescues you, it moves onto the redeemer at full cost, and only a kinsman
may do it. Forgiveness cancels a claim and leaves the deed in the ledger, because
deleting a record is amnesia, not pardon.

Betrayal is the part worth reading. The weight is computed from the bond that was
broken rather than looked up in a reputation table, so betraying a stranger and
betraying a sworn ally differ by a factor of five. There is a test for it.

### Places — `src/providence/places.ts`

The tabernacle admits by qualification instead of by key: it asks what you are,
not what you carry, and turning someone back to the outer court is not throwing
them out of the camp. The cities of refuge are a covering problem, since the text
asks for roads prepared so a fugitive can arrive in time, so they are solved as
one.

### Drives — `src/providence/drives.ts`, `motivated.ts`

Arcs say what a character does. Drives say what pulls at it, so when several
transitions are eligible on the same tick the strongest pull wins instead of the
first one written.

Martha and Mary are the case worth reading. Same room, same interruption, and
their arcs are structurally identical: only the drives differ. One goes to the
mess, the other does not move. A small disorder pulls Martha out of her seat while
she is listening and leaves Mary exactly where she is.

Each profile also carries four layers: what breaks its normal state, what it does
first, where it goes if the strain never lets up, and what brings it back. The
last one is the layer games skip. Tidying the whole house does not settle Martha,
and shouting at Elijah does nothing at all.

### Grace — `src/providence/grace.ts`

Specified in [docs/grace.md](docs/grace.md) before a line of it was written,
because the code is not the hard part.

Four properties make it sovereign rather than merely generous: no game code can
call it, no parameter shapes it, no studio can sell it, and its rate moves with
nothing the player did. One draw per episode at 0.2, so four desperate moments in
five receive nothing. When it does fire it opens a door rather than undoing the
loss.

### Atmospheres — `src/providence/atmosphere.ts`

A room presses on the people standing in it. It puts a floor under what the scene
is already doing, leans on certain drives, and weighs on the disposition itself.

That last part is what lets a place reach all 24 arcs rather than only the three
built on drives. Stand Balaam's donkey in a frightening room and it balks and lies
down with no danger ever shown to it, and neither the arc nor the atmosphere knows
the other exists.

### Simulation — `src/providence/simulate.ts`

Headless runs, so behaviour is measured instead of admired. A thousand runs of the
same cast in two rooms, same seed: Martha ends up complaining every time in a
palace and settled in a desert, and Elijah reaches his quiet ending 208 times out
of 600 in the desert and never once at court.

### The editor — `src/editor/`

Pick a behaviour, flip a world condition in the toolbar, and watch it happen to a
character standing in a 3D scene. Switch on *under threat* and Peter walks away
from you. The console prints the transition and, under it, the verse it came
from.

Nothing in the viewport is scripted. It imports the same library the tests run.

Two of the controls are yours rather than the world's, and they are keys rather
than toggles: <kbd>S</kbd> asks him, <kbd>K</kbd> shows a kindness where he can
see it. Asking is the whole of Peter's opening and the whole of the judge;
kindness is the only road back from Peter's denial and the only thing that moves
Ruth at all.

Walk within three metres of anyone and an offer to speak appears over their
head. Press <kbd>E</kbd> and they open — their own words, generated from the arc,
the node and what you have done, never a written line — and five gestures aimed
at that particular person take the place of the cue at the foot of the screen.
The one that matters is the gesture that moves nothing: ask Ruth to come with
you, which her arc reads nothing into on purpose, and she answers the refusal
instead of standing there mute. A soul that says nothing when it declines is
indistinguishable from an empty world.

The conversation does not survive the character changing state. If Jonah decides
to run while the menu is open, the menu closes.

The line under the figure says what he is doing in plain words and what to press
next. It is written per node in `src/editor/Cues.ts`, a cue may only name a
control that exists, and a test enforces that — see
[docs/driving-it.md](docs/driving-it.md) for the same thing on paper.

The inspector has four tabs. **Soul** is the arc and its disposition. **Relations**
draws the graph, lets you commit deeds against it, and prints the ledger.
**Place** moves the character between atmospheres. **Grace** shows the running
tally and states the four properties, since a feature defined by what it refuses
to do is otherwise invisible.

---

## Scripture

Providence contains no verse text. Arcs, deeds and thresholds hold references
like `LUK.22.57`, and `src/providence/Scripture.ts` is the only door text comes
through. Remove the key and every character goes silent. A test asserts exactly
that, and another one reads the engine source files to check no verse has crept
into them.

The silence is deliberate. An invented line would be worse than nothing.

### Keys

```
cp .env.example .env
```

Fill in `YOUVERSION_APP_KEY` (register at
[platform.youversion.com](https://platform.youversion.com)) and optionally
`GLOO_API_KEY`.

Note the names are not prefixed `VITE_`. Anything with that prefix is compiled
into the browser bundle and would be readable by anyone visiting the deployed
site. The browser here calls `/scripture` on its own origin and `vite.config.ts`
attaches the credential server side, so nothing secret is ever shipped. A test
fails if someone reintroduces a `VITE_*KEY`.

For production, keep the paths and move the header injection into a serverless
function.

### Gloo

Gloo advises, Providence decides. When a developer declares an action the engine
does not recognise, `Interpreter.ts` tries its own rules first, asks the model
only if it still cannot tell, then checks the answer before accepting it. A
proposal outside the vocabulary, or citing a passage that does not match the
deed, is refused. Every verdict records who decided: `engine`, `model` or
`refused`.

A moral engine whose rules can be rewritten at runtime by a generative system
does not really have rules.

---

## Godot

`godot/addons/providence/` holds a GDScript port. Copy it into a Godot 4 project
and enable the plugin; it registers a `Providence` autoload.

Four arcs ship there rather than all 21. Each transition carries a condition, and
a condition is code rather than data, so it cannot be exported from the
TypeScript and re-read: it has to be written again. See `godot/README.md`.

---

## Tests

```
npm test
```

427 of them. The ones worth reading first are in
`src/__tests__/providenceIntegrity.test.ts`, which assert the claims this project
makes about itself, and `providenceEndToEnd.test.ts`, which runs one story
through every part of the engine at once and calls the real platform.

`providenceScale.test.ts` checks the graph on ten thousand agents. It asserts the
shape of the growth curve rather than a wall clock time, because a millisecond
budget is flaky on a loaded machine while the curve is what actually separates an
indexed lookup from a scan.

`providenceImpact.test.ts` runs the same three events twice: once through the
bookkeeping every game already has, a number per character moved up and down, and
once through Providence. Run it with `--reporter=verbose` to see the two columns
side by side. The point is not that one is longer, it is that a single number
cannot express the difference between betraying a passerby and betraying a sworn
ally, however many lines you give it.

## Documentation

| | |
| --- | --- |
| [docs/architecture.md](docs/architecture.md) | data structures, index layout, costs |
| [docs/grace.md](docs/grace.md) | the grace specification, written before the code |
| [docs/archetypes.md](docs/archetypes.md) | per-arc sheets, generated from the library |
| [docs/deploying.md](docs/deploying.md) | the Scripture proxy and what it refuses |
| [docs/driving-it.md](docs/driving-it.md) | how to drive the editor: six characters, five minutes |
| [docs/review.md](docs/review.md) | an honest audit, including what does not hold up |
| [docs/writeup.md](docs/writeup.md) | the submission writeup |
| [docs/cover.html](docs/cover.html) | the cover image, and the page it renders from |

[docs/review.md](docs/review.md) is worth reading before the code. It lists the
weaknesses as plainly as the strengths: `main.ts` and the viewport are 1,285
lines with no tests under them, the Godot addon has never been run, and the
viewport is 482 kB of Three.js on a first paint.

The sheets are generated from the library by `archetypeSheets.test.ts` rather than
kept by hand. A table of 24 characters maintained manually drifts within a week,
and a document that disagrees with the code is worse than none.

---

## The notebook

`notebook/providence.ipynb` is the Kaggle submission. A Kaggle notebook runs
Python and the engine is TypeScript, so rather than describe the code and ask a
reader to take it on trust, the laws are ported there faithfully and executed.
Press Run All and every claim prints its own proof, with the numbers matching
this test suite.

It makes one live call to the YouVersion Platform API. On Kaggle, add the App Key
as a secret named `YOUVERSION_APP_KEY`; locally it reads the environment variable
of the same name. Without a
key the notebook says so and shows the silence rather than pretending.

```
python notebook/build.py   # regenerate the .ipynb after editing a cell
python notebook/run.py     # execute every code cell in order, as Run All would
```

The .ipynb is generated from `build.py` rather than hand-edited, because JSON
edited by hand acquires broken escapes and duplicate cell ids within a day.
`run.py` exists because a notebook whose assertions have never actually been
executed is the kind of claim this project is built to avoid making.

---

## Repository layout

```
src/providence/     the library
src/editor/         the editor, and the 3D viewport it draws into
src/api/            YouVersion and Gloo clients
notebook/           the Kaggle notebook, its generator and its runner
src/scenes/         procedural humanoid and renderer, shared with the editor
godot/              GDScript port
```

`src/core`, `src/entities`, `src/combat`, `src/data`, `src/ui` and
`src/scenes/BossDuelScene.ts` are an earlier prototype, a boss fight where the
player answers a lie with the right verse. It predates the library and does not
use it. It is kept because the editor's 3D viewport reuses its renderer and its
procedural character, and because its own tests still pass, but it is not part of
Providence.

## Licence

MIT. See `LICENSE`.
