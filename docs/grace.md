# Grace, before any code

Every engine is a pure function. The same inputs give the same outputs, and even
the randomness is a seeded generator the studio controls. There is no room in
that machine for anything sovereign, which is exactly the problem.

This is the specification. The implementation follows it; it did not come first.

## 1. The objection to answer

A developer writes the grace function. So how is it sovereign, rather than one
more rule the studio owns?

The answer is constitutional, not mystical. A constitution is written by people
and still binds the people who wrote it. Grace is sovereign here if and only if
all four of these hold:

| property | meaning |
| --- | --- |
| uncallable | no game code can trigger it |
| unconfigurable | no parameter, no curve, no difficulty setting |
| unsellable | it cannot be tuned toward paying players |
| unearnable | its rate does not move with virtue, skill or spending |

The last one is the load-bearing one, and it comes from Matthew 5:45: the sun
rises on the wicked and on the good. If grace tracked merit it would be a reward
system, and reward systems are farmable.

## 2. Desperation

Let a situation have a set of actions `A` available to the player, and let
`v(a)` be the probability that action `a` leads to a viable outcome.

```
        reach = max  v(a)
                a∈A

        d     = 1 - reach                  desperation, in [0, 1]
```

`d = 0` is a player with a clean way out. `d = 1` is a player for whom nothing
available leads anywhere. A host that cannot compute `reach` may supply `d`
directly; the engine does not care where the number came from.

## 3. Eligibility

```
        eligible  ⟺  d ≥ θ,     θ = 0.85
```

θ is high on purpose. Grace is not a difficulty curve, and a player who is merely
losing is not desperate.

## 4. The draw, and why it is per episode

An **episode** begins when `d` first crosses θ and ends when `d` falls back
below `θ - 0.15`. The hysteresis stops a value hovering at the threshold from
opening a new episode every tick.

Exactly one draw happens per episode:

```
        fires ~ Bernoulli(p),     p = 0.2
```

Per tick would be wrong. With any per-tick probability, standing in a hopeless
state long enough makes grace certain, and a certainty is farmable. Per episode,
staying desperate buys nothing at all.

`p = 0.2` means four desperate moments in five receive nothing. That is the
intended reading. A grace that always arrives is a mechanic; a grace that
usually does not is grace.

## 5. Independence

For any player property `m` (kills, purchases, virtue, hours played):

```
        P(fires | eligible, m) = P(fires | eligible) = p
```

This is asserted by a test over ten thousand episodes across two populations
that differ only in `m`. Their rates must agree within sampling error.

## 6. What it does when it fires

It does not undo the loss. It opens a door that was not there.

```
        A' = A ∪ {a*}      where v(a*) > 0
```

The player still lost the fight, still owes the debt, still buried whoever they
buried. What changes is that the set of available actions is no longer closed.
This is both more faithful to the text and better design: a grace that erases
consequences destroys every stake in the game.

## 7. The refractory period

After any episode, resolved either way, no draw is possible for `R = 90` seconds
of game time. This bounds the frequency independently of how the host drives the
simulation, and it removes the last farming route.

## 8. What is deliberately absent

There is no `grace()` in the public API, no options object, no threshold
argument, no probability argument. The constants above are frozen. A studio that
installs this cannot make grace more common for a paying player, and cannot turn
it off in a competitive mode.

As far as we know, no engine has ever shipped a feature the studio is forbidden
to tune. That absence is the feature.
