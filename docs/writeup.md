# Providence: a moral physics layer for game engines

**Subtitle:** Your engine already knows where the body falls. It has no idea what that costs.

---

Godot and Unity compute a falling body to a precision no human can match. Ask
either what it costs when one character betrays another and there is nothing
there: a murder and a handshake are the same event, a state change. Providence
fills that gap — not a game, not an engine, a library you put underneath one.

**Souls.** 24 NPC arcs drawn from the text, because game characters never change
and biblical ones do little else. Jonah flees the errand you just gave him. Peter
denies you under pressure and cannot be bought back, only restored. Balaam's
donkey overrules the player's own input.

**Relations.** A graph, because the question is not what one soul feels but what
moves between them. Blessing, birthright, debt and grievance are property with
transfer rules. A debt does not evaporate when someone rescues you: it moves onto
the redeemer at full cost, and only a kinsman may do it. Nothing consults a
reputation table, so betraying a stranger and betraying a sworn ally differ by
exactly five.

**Standing.** What the player has done is public record rather than mood, and the
same righteousness read through 24 pairs of eyes arrives as welcome on one face,
dread on another.

**Drives and places.** Martha and Mary stand in one room, see the same
interruption and do opposite things; neither arc mentions the other. A room
presses on whoever is in it, which is how a frightening place stops the donkey
with no danger ever shown to it.

**Grace.** Specified in `docs/grace.md` before a line of it existed. One draw per
episode at 0.2, so four desperate moments in five receive nothing. No game code
can call it, no parameter shapes it, and its rate moves with nothing the player
did.

Measured rather than asserted: 362 tests, ten thousand characters in the graph,
a thousand headless runs per room. Same cast, same seed, palace against desert:
Martha complains every time in one and settles in the other.

Both APIs are structural. Nothing in the engine stores a verse; everything holds
a reference, and the resolver is the only door text comes through, live from the
YouVersion Platform API in the player's language. Gloo speaks the characters' own
words out of that structure — forbidden to quote Scripture, silent when no line
comes back — and arbitrates what the engine cannot classify: own rules first, the
model only if unsure, then a structural check.

Our hardest problems were both honesty. An early build shipped our paraphrases
beside the references, which reads as Scripture and is not. And a character's
memory was frozen at creation, so it reacted to a world that had moved on.

The brief asks for Scripture where people already are. Hundreds of
millions live in game worlds. We did not build them a Bible. We put Scripture
into the ground they walk on.
