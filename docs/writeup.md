# Providence: a moral physics layer for game engines

**Subtitle:** Your engine already knows where the body falls. It has no idea what that costs.

---

Godot and Unity compute a falling body to a precision no human can match. Ask
either what it costs when one character betrays another and there is nothing
there: a murder and a handshake are the same event, a state change. Providence
fills that gap — not a game, not an engine, a library you put underneath one.

**Souls.** 24 NPC arcs drawn from the text, because game characters never change
and biblical ones do little else. Jonah flees the errand you just gave him and
keeps leaving wherever you go. Peter breaks under pressure and can only be
restored, never bought — and sell him while he walks beside you and he goes, at
four kindnesses a betrayal to return. Balaam's donkey overrules the player's own
input.

**Encounters.** Walk within three metres and he opens, in his own words, out of
his arc and his state and your record. The gesture that matters is the one that
moves nothing: ask Ruth to come with you, which her arc reads nothing into on
purpose, and she answers the refusal. A soul that says nothing when it declines
is indistinguishable from an empty world.

**Relations.** A graph, because the question is not what one soul feels but what
moves between them. Blessing, birthright, debt and grievance are property with
transfer rules. A debt does not evaporate when someone rescues you: it moves onto
the redeemer at full cost, and only a kinsman may do it. Nothing consults a
reputation table, so betraying a stranger and a sworn ally differ by exactly
five.

**Standing.** What the player has done is public record rather than mood, and the
same righteousness read through 24 pairs of eyes arrives as welcome on one face,
dread on another.

**Drives and places.** Martha and Mary stand in one room, see the same
interruption and do opposite things; neither arc mentions the other, and only the
drives differ. A room presses on whoever is standing in it, which is how a
frightening place stops the donkey with nothing shown to it.

**Grace.** Specified in `docs/grace.md` before a line of it existed. One draw per
episode at 0.2, so four desperate moments in five receive nothing. No game code
can call it, no parameter shapes it, and its rate moves with nothing the player
did.

Measured rather than asserted: 509 tests, ten thousand characters in the graph,
a thousand headless runs per room. Same cast, same seed, palace against desert:
Martha complains every time in one and settles in the other.

Both APIs are structural. Nothing in the engine stores a verse; everything holds
a reference, and the resolver is the only door text comes through, live from the
YouVersion Platform API in the player's language. Gloo speaks the characters' own
words out of that structure and out of a portrait per arc — register, wound, what
he will not do — every line of it carrying the passage it is read from. It
arbitrates what the engine cannot classify: own rules first, the model only if
unsure, then a structural check.

Our hardest problems were all honesty. A character's memory was frozen at
creation, so it reacted to a world that had moved on. And twice we caught
ourselves setting a reference under words that were not Scripture — our own
paraphrases, then a generated line. Paraphrase beside a reference reads as the
verse, so the answer is checked for recitation rather than trusted, and only
Scripture is cited.

The brief asks for Scripture where people already are. Hundreds of
millions live in game worlds. We did not build them a Bible. We put Scripture
into the ground they walk on.
