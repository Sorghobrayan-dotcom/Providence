# Driving it

Five minutes, six characters, no reading of the source required. The editor now
tells you this as you go — the line under the figure says what he is doing and
what to press — so this page is the same thing on paper, for anyone who wants it
before they open the tab.

## The controls

| | |
| --- | --- |
| **drag** in the viewport | moves *you*. Distance is an input to almost every arc. |
| <kbd>E</kbd> | speak to whoever you are standing next to. Offered within three metres. |
| <kbd>S</kbd> | ask him. The one thing you say. |
| <kbd>K</kbd> | show a kindness, where he can see it. |
| the eleven toggles | what the *world* is doing. You are not doing these; they are weather. |
| **Relations** | what you have done, to whom, permanently. |
| **Place** | the room you are both standing in. |
| **Grace** | the one thing you cannot cause. |

Three of those are verbs and eleven are conditions, and the difference matters:
speaking, asking and being kind are yours, and everything in the toolbar row is
the situation you happen to be in.

## Speaking to somebody

Walk within three metres and *Parler* <kbd>E</kbd> appears over their head. Press
it and they open — their own words, generated from this arc, this node, how they
are holding themselves and what you have done, and never a line written by us.
Five gestures take the place of the cue at the foot of the screen, aimed at that
particular person: ask, show a kindness, betray, bless, leave.

Nothing is ever greyed out. Ask Ruth to come with you and the option is there,
because the refusal is hers to make and disabling the button would move it to the
interface. Her arc reads nothing into being asked, so nothing changes state — and
she answers anyway, which is the thing that was missing. Before this, a gesture
that moved nothing produced silence, and silence reads as an empty world rather
than as a no.

The world does not pause while the menu is open. If the character changes state
mid-conversation the menu closes and the console says so: the soul does not wait
for you to finish choosing.

When Gloo cannot answer, they say nothing and a plain description of what they
are doing appears instead, set apart from both speech and Scripture. An invented
line is the one thing this refuses to do.

## Peter, in ninety seconds

The whole thesis in one character. **Le Serment Brise**, top of the library.

1. He stands there and does nothing. He is not your companion, and he will not
   become one on his own — a promise nobody asked for cannot be broken later,
   so the arc makes you ask. Press <kbd>S</kbd>.
2. He swears to go with you to prison and to death, and follows.
3. Toggle **under threat**. He stays, and his fear starts climbing. Watch the
   meter in Soul, not the figure.
4. Past 0.7 he denies he has ever met you and walks away. Not "stops helping":
   denies.
5. Toggle **under threat** off. He weeps and withdraws, and now nothing you
   press does anything. There is no gold, no persuasion check, no reputation
   bar to top up.
6. Press <kbd>K</kbd> three times. He comes back, steadier than he was.
7. Now toggle **under threat** again. He breaks faster this time. The threshold
   moved because he has a scar, and the scar is counted, not scripted.

Then do it again, and before step 6 open **Relations** and press *betray peter*.
The same three kindnesses no longer reach him: every betrayal in the ledger adds
two more. Nothing in his arc mentions betrayal — it reads the graph.

## Jonah, and why the same question has two answers

**Le Réticent**. He is holding the errand you gave him and he does not want it.

Walk into 3.5 m and he simply leaves — being reached is enough. Let him run and
fear climbs on its own; past 0.75 the storm closes the road, he is held, his
resolve rises, and he goes and does it. Then wait six seconds: he obeys, and he
sulks about it. Jonah 4 is the part every quest-giver in every game skips.

Now the interesting one. Reload him, and press <kbd>S</kbd> instead.

- With a clean record, he *shrinks*: he will not argue with you, he takes his
  eyes off you and puts distance in. Righteousness in front of him is a summons,
  not a rescue.
- Open **Relations**, betray somebody, then ask him again. He *confides*: same
  question, and he closes the distance instead of opening it. Blood is a heavier
  bond between fugitives than a broken promise.

Two exits, both always written, both always offered. Which one fires is decided
by comparing their pull on the tick, not by a story flag.

## Ruth, who cannot be recruited

**Celle Qui Choisit**. Walk within 12 m and she starts watching. Press <kbd>S</kbd>
as much as you like: nothing. She is not a quest to accept.

Press <kbd>K</kbd> twice and she binds herself to you, unasked. Then try to get
rid of her — the arc has no exit. Dismissal is refused.

Before any of that, open **Relations** and press *betray boaz*, who is of her
household. Now no amount of kindness aimed at her will move her. She is not
bought, and the graph is what remembers.

## The donkey, who reads the room

**L'Anesse Qui Refuse**, under Intervention. Toggle **danger ahead** — a danger
*you* cannot see — and she stops, then lies down under you and will not move.
This is the only arc in the library allowed to overrule the player's input, and
it is deliberate: the text is exactly about a creature obeying something above
its rider.

Then the better demonstration. Clear the toggle, open **Place**, and stand her
in the frightening room. She balks again, with nothing shown to her at all —
the room raised her fear and she read it. Neither the arc nor the atmosphere
knows the other exists.

## The judge, who is not moved by your merit

**Le Juge Lasse**. Press <kbd>S</kbd> four times and he wearies. Twice more and
he grants it. Nothing else opens this gate: not your record, not kindness, not
standing, not gold. He neither fears God nor regards man, and he opens to the
one thing the parable says he opens to.

## The father, who never comes to get you

**Celui Qui Guette La Route**. He does nothing. There is no marker on him, no
reminder, no summons — and that is the character. Toggle **player returning**
and he is running before you have finished arriving.

## Grace, which will mostly do nothing

Open **Grace** and it says *idle*. Load an adversary — **Celui Qui Petrifie** —
and drag yourself inside 4 m; a hostile figure at close quarters is a closed
situation, and a closed situation is the only thing grace watches.

Then expect nothing. One draw per episode at 0.2, so four desperate moments in
five receive nothing, and the counter is the honest record. There is no method
that triggers it, no parameter that shapes it, and its rate moves with nothing
you have done: `observe()` takes desperation and a duration and nothing else, so
it cannot tell a saint from a monster.

Raising it to make a demo livelier is the exact thing those three properties
exist to forbid.

## What the console under the viewport is

Four channels, and they are not the same kind of statement.

| | |
| --- | --- |
| **arc** | a soul changed state. The reference under it is the passage that transition is drawn from. |
| **graph** | a deed was committed, weighed, and possibly refused. |
| **grace** | a draw happened, or was withheld. |
| **editor** | you did something: loaded an arc, moved a place, asked, showed kindness. |

Every line carries a USFM reference, and the verse under it arrived from the
YouVersion Platform API a moment ago, in the language you asked for. Nothing in
the engine stores that text. Pull the key and the lines keep coming and the
verses stop, which is the behaviour a test asserts.
