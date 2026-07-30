# Providence: a moral physics layer for game engines

**Subtitle:** Your engine already knows where the body falls. It has no idea what that costs.

---

Godot and Unity compute a falling body to a precision no human can match. Ask
either what it means when a character betrays another and there is nothing. A
murder and a handshake are the same event to an engine: a state change. Providence
is the layer that fills it, not a game and not an engine.

**Souls.** 24 NPC arcs drawn from the text. Game characters never change;
biblical ones do little else. Jonah flees the errand you just gave him and obeys
resentfully when dragged back. Peter denies you under pressure and cannot be
bought back, only restored. Balaam's donkey overrules the player's own input.

**Relations.** A graph, because the question is not what one soul feels but what
moves between them. Blessing, birthright, debt and grievance are property with
transfer rules. A blessing is irreversible once spoken. A debt does not evaporate
when someone rescues you: it moves onto the redeemer at full cost, and only a
kinsman may do it. Betrayal is the thesis. No reputation number is consulted, so
a stranger and a sworn ally differ fivefold.

**Drives.** Arcs say what a character does, drives say what pulls at it, so
eligible transitions compete rather than firing in written order. Martha and Mary
stand in one room, see the same interruption, and do opposite things. Neither arc
mentions the other.

**Grace.** Specified in docs/grace.md before a line of it existed. One draw per
episode at 0.2, so four desperate moments in five receive nothing. It cannot be
called, configured or sold, and its rate moves with nothing the player did:
`observe()` takes desperation and a duration and nothing else, so it cannot tell a
saint from a monster.

**Places.** The tabernacle admits by qualification, not by key. A room presses on
whoever stands in it, which is how a frightening place stops the donkey with no
danger ever shown to it.

Measured rather than asserted: 157 tests, ten thousand characters in the graph, a
thousand headless runs per room. Same cast, same seed, palace against desert:
Martha ends up complaining every time in one and settled in the other.

Both APIs are structural. Nothing here stores a verse; everything holds a
reference, and the resolver is the only door text comes through, live from the
YouVersion Platform API in the player's language. Delete the App Key and every
character goes silent, which a test asserts. Gloo advises, Providence decides:
own rules first, the model only if still unsure, then a structural check.

Our hardest problems were both honesty. An early build shipped our paraphrases
beside the references, which reads as Scripture and is not. And a character's
memory was frozen at creation, so it reacted to a world that had moved on.

The brief says the goal is not another Bible app but Scripture present where
people already are. Hundreds of millions live in game worlds. We did not build
them a Bible. We put Scripture into the ground they walk on.
