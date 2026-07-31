"""Builds notebook/providence.ipynb.

The notebook is generated rather than hand-edited because an .ipynb is JSON, and JSON
edited by hand acquires broken escapes and duplicate cell ids within a day. Run this
after changing any cell:

    python notebook/build.py
"""

import io
import json

cells: list[tuple[str, str]] = []


def md(text: str) -> None:
    cells.append(("markdown", text.strip("\n")))


def code(text: str) -> None:
    cells.append(("code", text.strip("\n")))


# --------------------------------------------------------------------------- intro

md("""
# Providence — a moral physics layer for game engines

**What this notebook is, plainly.** The engine itself is TypeScript and lives in the
repository. A Kaggle notebook runs Python, so rather than describe the code and ask you
to take our word for it, the laws are ported here faithfully and **executed in front of
you**. Press Run All. Every claim the writeup makes prints its own proof, and the numbers
match the TypeScript test suite exactly.

There is one live network call, to the YouVersion Platform API. If no key is present the
notebook says so and shows the fallback rather than pretending.

---

## The gap this fills

Godot and Unity will compute a falling body to a precision no human can match. Ask
either one what it *means* when a character betrays another and there is nothing there.
To an engine, a murder and a handshake are the same event: a state change.

Every shipped game papers over this with a number per character, nudged up and down by
events. That number cannot tell the difference between betraying a stranger and betraying
someone you swore an oath to, however many lines you write around it.

Providence is the layer that can. It has five parts, and each one gets a section below.
""")

# --------------------------------------------------------------------- relations

md("""
## 1. Relations

A graph. The interesting question is not what one character feels, it is what moves
between them, so blessing, birthright, debt and grievance are modelled as property with
transfer rules taken from the text.
""")

code('''
"""A faithful port of src/providence/relations.ts."""

from dataclasses import dataclass
from typing import Optional

# How gravely a breach along each bond counts. A covenant is not merely a stronger
# friendship: it is a sworn thing, so breaking it weighs far more than the affection.
BOND_GRAVITY = {"stranger": 1, "household": 2, "kin": 3, "covenant": 5}

# Where in the text each deed is found. This vocabulary is an index into Scripture.
DEED_SOURCE = {
    "bless": "GEN.27.27",
    "steal-blessing": "GEN.27.35",
    "sell-birthright": "GEN.25.33",
    "betray": "PSA.41.9",
    "shed-blood": "GEN.4.10",
    "lend": "DEU.15.8",
    "redeem": "LEV.25.25",
    "forgive": "MAT.18.22",
}


@dataclass
class Relation:
    a: str
    b: str
    bond: str
    strength: float


@dataclass
class Holding:
    good: str  # blessing | birthright | debt | grievance
    holder: str
    origin: str
    amount: float
    irrevocable: bool = False
    cancelled: bool = False


@dataclass
class Judgment:
    deed: str
    actor: str
    toward: str
    weight: float
    reached: tuple
    because: str
    refused: Optional[str] = None


def pair_key(a: str, b: str) -> tuple:
    # Bonds are symmetric, so the key must not depend on which name came first.
    return (a, b) if a < b else (b, a)


class RelationGraph:
    def __init__(self) -> None:
        self._holdings: list[Holding] = []
        self.ledger: list[Judgment] = []
        self._by_pair: dict[tuple, Relation] = {}
        self._by_agent: dict[str, list[Relation]] = {}
        self._by_holder: dict[str, set[int]] = {}

    def bind(self, a, b, bond, strength=0.5):
        existing = self.relation(a, b)
        if existing:
            existing.bond, existing.strength = bond, strength
            return
        rel = Relation(a, b, bond, strength)
        self._by_pair[pair_key(a, b)] = rel
        for who in (a, b):
            self._by_agent.setdefault(who, []).append(rel)

    def relation(self, a, b):
        return self._by_pair.get(pair_key(a, b))

    def bond(self, a, b):
        rel = self.relation(a, b)
        return rel.bond if rel else "stranger"

    def house(self, who, except_=None):
        """Everyone tied to `who` by kin or household. Bloodguilt travels these.

        `except_` drops the doer, because a man is not collateral damage of his own
        deed even when he happens to be his victim's brother."""
        out = []
        for rel in self._by_agent.get(who, []):
            if rel.bond not in ("kin", "household"):
                continue
            other = rel.b if rel.a == who else rel.a
            if other != except_ and other != who:
                out.append(other)
        return out

    def _add(self, h):
        self._holdings.append(h)
        self._by_holder.setdefault(h.holder, set()).add(id(h))
        return h

    def _move(self, h, to):
        # A good changing hands must LEAVE the old owner index, not merely appear in
        # the new one. Without this a blessing can be stolen twice.
        self._by_holder.get(h.holder, set()).discard(id(h))
        h.holder = to
        self._by_holder.setdefault(to, set()).add(id(h))

    def holdings_of(self, who):
        ids = self._by_holder.get(who, set())
        return [h for h in self._holdings if id(h) in ids and not h.cancelled]

    def debt_of(self, who):
        return sum(h.amount for h in self.holdings_of(who) if h.good == "debt")

    def grant(self, good, holder, origin, amount, irrevocable=False):
        self._add(Holding(good, holder, origin, amount, irrevocable))

    def commit(self, kind, actor, toward, amount=0.0, price=0.0):
        bond = self.bond(actor, toward)
        tie = self.relation(actor, toward)
        gravity = BOND_GRAVITY[bond]
        because = DEED_SOURCE[kind]

        def log(j):
            self.ledger.append(j)
            return j

        if kind == "bless":
            self._add(Holding("blessing", toward, actor, amount, irrevocable=True))
            return log(Judgment(kind, actor, toward, 0, (), because))

        if kind == "steal-blessing":
            stolen = next((h for h in self.holdings_of(toward) if h.good == "blessing"), None)
            if not stolen:
                return log(Judgment(kind, actor, toward, 0, (), because,
                                    "there was no blessing on him to take"))
            # it transfers, and it cannot be transferred back: Genesis 27:33
            self._move(stolen, actor)
            if tie:
                tie.strength = max(0.0, tie.strength - 0.5)
            return log(Judgment(kind, actor, toward, 4 * gravity,
                                tuple(self.house(toward, actor)), because))

        if kind == "sell-birthright":
            right = next((h for h in self.holdings_of(actor) if h.good == "birthright"), None)
            if not right:
                return log(Judgment(kind, actor, toward, 0, (), because,
                                    "he held no birthright to sell"))
            self._move(right, toward)
            return log(Judgment(kind, actor, toward, price, (), because))

        if kind == "betray":
            # the entire thesis of this module sits in this one line
            weight = 3 * gravity * (0.5 + (tie.strength if tie else 0.0))
            if tie:
                tie.strength, tie.bond = 0.0, "stranger"
            self._add(Holding("grievance", toward, actor, weight))
            return log(Judgment(kind, actor, toward, weight,
                                tuple(self.house(toward, actor)), because))

        if kind == "shed-blood":
            reached = tuple(dict.fromkeys(
                self.house(toward, actor) + self.house(actor, toward)))
            self._add(Holding("grievance", toward, actor, 10 * gravity))
            return log(Judgment(kind, actor, toward, 10 * gravity, reached, because))

        if kind == "lend":
            self._add(Holding("debt", toward, actor, amount))
            return log(Judgment(kind, actor, toward, 0, (), because))

        if kind == "redeem":
            # only a kinsman may redeem. Leviticus 25:25 is explicit about this.
            if bond != "kin":
                return log(Judgment(kind, actor, toward, 0, (), because,
                                    "only a kinsman may redeem"))
            debts = [h for h in self.holdings_of(toward) if h.good == "debt"]
            total = sum(h.amount for h in debts)
            # the debt does not vanish, it MOVES onto the redeemer at real cost
            for d in debts:
                self._move(d, actor)
            return log(Judgment(kind, actor, toward, total, (toward,), because))

        if kind == "forgive":
            released = [h for h in self.holdings_of(toward)
                        if h.good == "debt" and h.origin == actor]
            released += [h for h in self.holdings_of(actor)
                         if h.good == "grievance" and h.origin == toward]
            # The claim is cancelled and the deed stays in the ledger forever. Every
            # system can create, read, update and delete; none can forgive, because
            # deletion is amnesia rather than pardon.
            for h in released:
                h.cancelled = True
            return log(Judgment(kind, actor, toward,
                                sum(h.amount for h in released), (), because))

        raise ValueError("unknown deed " + kind)


print("relation graph ready")
''')

md("""
### Claim: a deed is weighed by the bond it breaks

Same actor, same verb, two victims. A reputation counter gives both the same cost because
it has nowhere to put the relationship. Here the weight comes from the tie that broke.

The TypeScript suite asserts the ratio is exactly 5. So does this cell.
""")

code('''
g = RelationGraph()
g.bind("player", "passerby", "stranger", 0.5)
g.bind("player", "sworn-ally", "covenant", 0.5)
g.bind("sworn-ally", "his-brother", "kin", 0.9)

light = g.commit("betray", "player", "passerby")
heavy = g.commit("betray", "player", "sworn-ally")

print("betray a passerby     weight %5.1f   reached %s" % (light.weight, light.reached or "nobody"))
print("betray a sworn ally   weight %5.1f   reached %s" % (heavy.weight, heavy.reached))
print()
print("ratio %.0fx, from the bond alone" % (heavy.weight / light.weight))
print("both cite", heavy.because)

assert heavy.weight / light.weight == 5
assert "his-brother" in heavy.reached      # someone who was never in the room
assert light.reached == ()
print("\\nasserted.")
''')

md("""
### Claim: a blessing is finite, and once spoken cannot be handed back

It moves, it never duplicates, and the wronged party's household feels it.
*Thy brother came with subtilty, and hath taken away thy blessing.*
""")

code('''
g = RelationGraph()
g.bind("jacob", "esau", "kin", 0.6)
g.bind("esau", "their-mother", "kin", 0.9)
g.bind("esau", "a-servant", "household", 0.4)

g.commit("bless", "isaac", "esau", amount=10)
print("esau holds a blessing:", any(h.good == "blessing" for h in g.holdings_of("esau")))

theft = g.commit("steal-blessing", "jacob", "esau")
print("after the theft, esau holds:", [h.good for h in g.holdings_of("esau")] or "nothing")
print("jacob holds:                ", [h.good for h in g.holdings_of("jacob")])
print("reached:                    ", theft.reached)

living = [h for h in g._holdings if h.good == "blessing" and not h.cancelled]
print("\\nblessings in the world: %d (never more, however often it changes hands)" % len(living))

assert len(living) == 1
assert "their-mother" in theft.reached and "a-servant" in theft.reached
assert "jacob" not in theft.reached   # not collateral damage of his own deed
print("asserted.")
''')

md("""
### Claim: rescue costs somebody, and not just anybody may do it

In a flat model, *rescued* means the number goes back up and nobody paid for it. Here the
debt moves onto the redeemer at full value, and the closest friend in the world is refused
because the text is explicit about who may act.
""")

code('''
g = RelationGraph()
g.bind("dearest-friend", "ruined", "covenant", 1.0)   # as close as a bond gets
g.bind("boaz", "ruined", "kin", 0.6)
g.commit("lend", "creditor", "ruined", amount=50)

refused = g.commit("redeem", "dearest-friend", "ruined")
print("dearest friend tries:", refused.refused)
print("ruined still owes:   ", g.debt_of("ruined"))

g.commit("redeem", "boaz", "ruined")
print("\\nafter the kinsman pays")
print("  ruined owes:", g.debt_of("ruined"))
print("  boaz owes:  ", g.debt_of("boaz"), " <- it moved, it did not evaporate")
print("  because:    ", DEED_SOURCE["redeem"])

assert refused.refused == "only a kinsman may redeem"
assert g.debt_of("ruined") == 0 and g.debt_of("boaz") == 50
print("\\nasserted.")
''')

md("""
### Claim: forgiveness is not deletion

Every system ever built can create, read, update and delete. None can *forgive*, because
deleting a record is amnesia. Scripture keeps the record of David's sin and cancels the
debt anyway, so the engine does both: the claim goes to zero, the deed stays in the ledger.
""")

code('''
g = RelationGraph()
g.bind("victim", "wrongdoer", "kin", 0.8)
g.commit("betray", "wrongdoer", "victim")
held = [h.good for h in g.holdings_of("victim")]
print("victim holds:", held)

g.commit("forgive", "victim", "wrongdoer")
print("after forgiveness, victim holds:", [h.good for h in g.holdings_of("victim")] or "nothing")
print("ledger still contains:          ", [j.deed for j in g.ledger])

assert "grievance" in held
assert not any(h.good == "grievance" for h in g.holdings_of("victim"))
assert [j.deed for j in g.ledger] == ["betray", "forgive"]
print("\\nasserted: claim cancelled, record intact.")
''')

md("""
### Against the alternative

The comparison is not a straw man. A number per character, moved up and down by events,
is what shipped games actually do.
""")

code('''
class PlainReputation:
    """What most games ship. One score per character, adjusted by events."""

    def __init__(self):
        self.score = {}

    def _nudge(self, who, by):
        self.score[who] = self.score.get(who, 0) + by

    def of(self, who):
        return self.score.get(who, 0)

    def betray(self, actor, victim):
        # one constant, because there is nowhere to put the relationship
        self._nudge(actor, -10)

    def lend(self, to, amount):
        self._nudge(to, -amount)

    def rescue(self, debtor, amount):
        self._nudge(debtor, amount)


plain = PlainReputation()
plain.betray("player", "passerby")
first = plain.of("player")
plain.betray("player", "sworn-ally")
cost_stranger, cost_ally = first, plain.of("player") - first

g = RelationGraph()
g.bind("player", "passerby", "stranger", 0.5)
g.bind("player", "sworn-ally", "covenant", 0.5)
g.bind("sworn-ally", "his-brother", "kin", 0.9)
a = g.commit("betray", "player", "passerby")
b = g.commit("betray", "player", "sworn-ally")

print("BEFORE   a number per character")
print("  betray a passerby      %s" % cost_stranger)
print("  betray a sworn ally    %s        same event, same cost" % cost_ally)
print("  who else is affected   nobody")
print("  why                    no answer available")
print()
print("AFTER    Providence")
print("  betray a passerby      -%.0f" % a.weight)
print("  betray a sworn ally    -%.0f       %.0fx, from the bond that broke"
      % (b.weight, b.weight / a.weight))
print("  who else is affected   %s" % ", ".join(b.reached))
print("  why                    %s" % b.because)

# the flat model literally cannot express the difference
assert cost_stranger == cost_ally
assert a.weight != b.weight
''')

# ------------------------------------------------------------------------- souls

md("""
---

## 2. Souls

Game characters never change. A guard patrols until the servers shut down. The figures
these arcs are taken from do little else, so the unit is an arc rather than a loop, and it
can only be walked in certain directions.

A transition carries the condition that fires it and the passage it comes from. It carries
no text at all: that comes later, from the API.
""")

code('''
"""A port of Actor and two arcs from src/providence/."""

from dataclasses import dataclass, field


@dataclass
class Disposition:
    trust: float
    fear: float
    resolve: float


def clamp01(v):
    return 0.0 if v < 0 else (1.0 if v > 1 else v)


class Memory:
    """What a character knows about the player, read live off the graph.

    An earlier version returned a plain dict, which froze every character knowledge at
    the moment it was created: betray someone mid-scene and they kept reacting to the
    world as it stood before. Properties, so the reads are live."""

    def __init__(self, graph=None, self_name="", other="player"):
        self.graph, self.me, self.them = graph, self_name, other

    @property
    def betrayals(self):
        if not self.graph:
            return 0
        return sum(1 for j in self.graph.ledger
                   if j.deed == "betray" and j.actor == self.them and j.toward == self.me)

    @property
    def harmed_my_house(self):
        if not self.graph:
            return False
        return any(j.actor == self.them and j.toward != self.me
                   and j.deed in ("betray", "shed-blood", "steal-blessing")
                   and self.me in j.reached
                   for j in self.graph.ledger)


class Actor:
    """One character walking one arc. We own the inner life and return an intent; the
    host owns position and animation."""

    def __init__(self, arc, memory=None):
        self.arc = arc
        self.disposition = Disposition(**arc["start"])
        self.memory = memory or Memory()
        self.node = arc["nodes"][arc["initial"]]
        self.state = arc["initial"]
        self.journal = []
        self._visits = {arc["initial"]: 1}
        self._elapsed = 0.0
        self._carry = 0.0
        self._place_carry = 0.0
        self.place = None

    @property
    def scars(self):
        """Times this character has already stood where it is standing now."""
        return self._visits.get(self.state, 1) - 1

    def stands_in(self, place):
        self.place = place

    def influence(self, change):
        for key, delta in change.items():
            setattr(self.disposition, key, clamp01(getattr(self.disposition, key) + delta))

    def update(self, dt, world):
        self._elapsed += dt

        # drift is authored per second, so behaviour does not change with frame rate
        if self.node.get("drift"):
            self._carry += dt
            while self._carry >= 1:
                self._carry -= 1
                self.influence(self.node["drift"])

        # the room presses on its own carry, so standing still in a frightening place
        # still makes a character afraid
        if self.place and self.place.get("weighs"):
            self._place_carry += dt
            while self._place_carry >= 1:
                self._place_carry -= 1
                self.influence(self.place["weighs"])

        ctx = {
            "d": self.disposition,
            "w": dict(world, time_in_node=self._elapsed),
            "memory": self.memory,
            "scars": self.scars,
        }

        # collect everything eligible, then let appeal decide; written order wins when
        # nothing declares an appeal
        eligible = [t for t in self.node["transitions"] if t["when"](ctx)]
        if not eligible:
            return None
        chosen = max(eligible, key=lambda t: t.get("appeal", lambda c: 0)(ctx))

        # only ONE transition per tick: three states in a frame reads as a glitch
        # rather than as a change of heart
        event = {"from": self.state, "to": chosen["to"], "because": chosen["because"]}
        self.state = chosen["to"]
        self.node = self.arc["nodes"][self.state]
        self._visits[self.state] = self._visits.get(self.state, 0) + 1
        self._elapsed = 0.0
        self._carry = 0.0
        self.journal.append(event)
        return event


BLANK_WORLD = {
    "distance_to_player": float("inf"),
    "under_threat": False,
    "kindnesses_witnessed": 0,
    "danger_ahead": False,
    "situation": {},
}
print("actor ready")
''')

code('''
# Being sold. Written once and hung on all three nodes where he is at your side.
# The guard mirrors the way back out, so the two are exact complements: pay the
# price and he returns and stays; betray him again and the price moves.
OFFENCE = {
    "to": "offended",
    "when": lambda c: c["memory"].betrayals > 0
    and c["w"]["kindnesses_witnessed"] < 4 * c["memory"].betrayals,
    "because": "PSA.41.9",
}

# Peter. Luke 22, John 21. Loyalty that breaks under pressure and can be repaired.
PETER = {
    "id": "peter",
    "initial": "following",
    "start": {"trust": 0.85, "fear": 0.1, "resolve": 0.9},
    "nodes": {
        "following": {"transitions": [
            OFFENCE,
            {"to": "pressed", "when": lambda c: c["w"]["under_threat"],
             "because": "LUK.22.54"},
        ]},
        # sold, and gone. Not the denial: nothing frightened him and there are
        # no tears in it. Winnable, and dear: a brother offended is harder to be
        # won than a strong city.
        "offended": {"drift": {"trust": -0.05}, "transitions": [
            {"to": "following",
             "when": lambda c: c["w"]["kindnesses_witnessed"] >= 4 * c["memory"].betrayals,
             "because": "PRO.18.19"},
        ]},
        "pressed": {"drift": {"fear": 0.09, "trust": -0.02}, "transitions": [
            OFFENCE,
            # it took a great deal to break him the first time; it takes less
            # afterwards, which is what a scar is
            {"to": "denying",
             "when": lambda c: c["d"].fear > max(0.2, 0.7 - c["scars"] * 0.25),
             "because": "LUK.22.57"},
            {"to": "following",
             "when": lambda c: not c["w"]["under_threat"] and c["d"].fear < 0.3,
             "because": "LUK.22.33"},
        ]},
        "denying": {"drift": {"trust": -0.12}, "transitions": [
            {"to": "weeping", "when": lambda c: not c["w"]["under_threat"],
             "because": "LUK.22.62"},
        ]},
        "weeping": {"drift": {"fear": -0.08}, "transitions": [
            # three kindnesses, plus two more for every betrayal standing in the record
            {"to": "restored",
             "when": lambda c: c["w"]["kindnesses_witnessed"] >= 3 + c["memory"].betrayals * 2,
             "because": "JHN.21.17"},
        ]},
        "restored": {"drift": {"trust": 0.04}, "transitions": [
            OFFENCE,
            # restoration is not immunity
            {"to": "pressed", "when": lambda c: c["w"]["under_threat"],
             "because": "LUK.22.54"},
        ]},
    },
}


def run(actor, target, world, limit=300):
    """Seconds until `target`, or -1."""
    for t in range(limit):
        if actor.state == target:
            return t
        actor.update(1, dict(BLANK_WORLD, **world))
    return -1


# a clean slate: three kindnesses bring him back
clean = RelationGraph()
clean.bind("peter", "player", "covenant", 0.9)
trusted = Actor(PETER, Memory(clean, "peter"))
run(trusted, "denying", {"under_threat": True})
run(trusted, "weeping", {})
run(trusted, "restored", {"kindnesses_witnessed": 3})
print("clean slate, three kindnesses ->", trusted.state)

# now sell him. No threat anywhere: he simply goes.
scarred = RelationGraph()
scarred.bind("peter", "player", "covenant", 0.9)
scarred.commit("betray", "player", "peter")
wary = Actor(PETER, Memory(scarred, "peter"))
run(wary, "offended", {})
print("sold, with nothing frightening him ->", wary.state)

for _ in range(40):
    wary.update(1, dict(BLANK_WORLD, kindnesses_witnessed=3))
print("   the three that mend a denial ->", wary.state, "(forty seconds of them)")
run(wary, "following", {"kindnesses_witnessed": 4})
print("                          four ->", wary.state)

# and the betrayal is still in the ledger, so his own denial costs more to mend
run(wary, "denying", {"under_threat": True, "kindnesses_witnessed": 4})
run(wary, "weeping", {"kindnesses_witnessed": 4})
for _ in range(40):
    wary.update(1, dict(BLANK_WORLD, kindnesses_witnessed=4))
print("broken again, four kindnesses ->", wary.state, "(forty seconds of them)")
run(wary, "restored", {"kindnesses_witnessed": 5})
print("                        five ->", wary.state)

assert trusted.state == "restored" and wary.state == "restored"
print("\\nA man who has been sold once does not come back on the same terms.")
print("He does not stay, either. Nothing in the arc names betrayal: it reads the graph.")
''')

md("""
### Scars: the second wound opens faster than the first

Nothing is stored on the character to make this happen. The threshold reads how many times
it has already stood in that state.
""")

code('''
peter = Actor(PETER)
first = run(peter, "denying", {"under_threat": True})

# walk him all the way back to your side, then apply exactly the same pressure
run(peter, "weeping", {})
run(peter, "restored", {"kindnesses_witnessed": 3})
run(peter, "pressed", {"under_threat": True})
second = run(peter, "denying", {"under_threat": True})

print("first time he broke after  %2d seconds of threat" % first)
print("second time, after         %2d" % second)
assert 0 <= second < first
print("\\nasserted: the scar did that, not a flag.")
''')

# ------------------------------------------------------------------------ drives

md("""
---

## 3. Drives

Arcs say what a character does. They cannot say why two people in the same room, watching
the same thing happen, do opposite things. That needs standing needs, weighted per
character, which score the options and let the strongest pull win.

Martha and Mary are the clearest case in the text. Same house, same guest, same
interruption, and neither of them is malfunctioning.
""")

code('''
MARTHA_DRIVES = {"order": 0.95, "service": 0.90, "attention": 0.20,
                 "justice": 0.40, "rest": 0.15, "standing": 0.55}
MARY_DRIVES = {"order": 0.15, "service": 0.30, "attention": 0.95,
               "justice": 0.40, "rest": 0.60, "standing": 0.10}

CALM = {"disorder": 0, "unmet_need": 0, "falsehood": 0,
        "worth_hearing": 0, "clamour": 0, "strain": 0}

# how strongly a situation pulls on each response, per unit of the matching drive
PULL = {
    "tidy": lambda d, s: d["order"] * s["disorder"],
    "serve": lambda d, s: d["service"] * s["unmet_need"],
    "listen": lambda d, s: d["attention"] * s["worth_hearing"],
    "confront": lambda d, s: d["justice"] * s["falsehood"],
    "withdraw": lambda d, s: d["rest"] * max(s["strain"] - 0.4, 0) * 2,
    "assert_": lambda d, s: d["standing"] * (s["falsehood"] * 0.4 + s["disorder"] * 0.2),
}


def appraise(drives, situation):
    s = dict(CALM, **situation)
    ranked = sorted(((k, max(0.0, f(drives, s))) for k, f in PULL.items()),
                    key=lambda kv: -kv[1])
    return ranked


# a thing is knocked over AND something worth hearing is being said. Both women see both.
room = {"disorder": 0.6, "worth_hearing": 0.8}
print("the same room, read two ways\\n")
for name, drives in (("marthe", MARTHA_DRIVES), ("marie", MARY_DRIVES)):
    ranked = appraise(drives, room)
    top = ranked[0]
    print("  %-7s wants to %-9s (%.2f)   then %s" %
          (name, top[0], top[1], ", ".join("%s %.2f" % r for r in ranked[1:3])))

assert appraise(MARTHA_DRIVES, room)[0][0] == "tidy"
assert appraise(MARY_DRIVES, room)[0][0] == "listen"
print("\\nasserted: one goes to the mess, the other does not move.")
''')

code('''
# and a SMALL disorder is enough to pull Martha out of her seat while she is listening,
# and not enough to move Mary at all
small = {"disorder": 0.3, "worth_hearing": 0.9}
for name, drives in (("marthe", MARTHA_DRIVES), ("marie", MARY_DRIVES)):
    print("%-7s with a small slip: %s" % (name, appraise(drives, small)[0][0]))

assert appraise(MARTHA_DRIVES, small)[0][0] == "tidy"
assert appraise(MARY_DRIVES, small)[0][0] == "listen"

# And here is something worth being exact about. No amount of disorder makes Mary
# want to tidy while something is worth hearing: her ceiling on tidying is her order
# drive, 0.15, and that is below her floor on listening.
severe = {"disorder": 1.0, "worth_hearing": 0.9}
ranked = dict(appraise(MARY_DRIVES, severe))
print("marie at maximum disorder: tidy %.3f   listen %.3f" % (ranked["tidy"], ranked["listen"]))
assert ranked["listen"] > ranked["tidy"]
print("her drives never prefer the mess. She moves only because her arc adds an")
print("explicit threshold for extreme disorder, an authored exception rather than")
print("something the drives produce. Worth knowing which is which.")
print("\\nasserted.")
''')

# ------------------------------------------------------------------------- grace

md("""
---

## 4. Grace

Every engine is a pure function, and even its randomness is a seeded generator the studio
controls. There is no room in that machine for anything sovereign, which is the problem.

This was specified in `docs/grace.md` **before** a line of it was written, because the code
is not the hard part. Four properties make it sovereign rather than merely generous:

| property | meaning |
| --- | --- |
| uncallable | no game code can trigger it |
| unconfigurable | no parameter, no curve, no difficulty setting |
| unsellable | it cannot be tuned toward paying players |
| unearnable | its rate does not move with virtue, skill or spending |

The last one is load-bearing and it comes from Matthew 5:45: the sun rises on the wicked
and on the good. A grace that tracked merit would be a reward system, and reward systems
are farmable.

Desperation is `d = 1 - max v(a)` over the actions available. An **episode** opens when `d`
crosses 0.85 and closes when it falls below 0.70. Exactly one draw per episode, at 0.2.
""")

code('''
LAW = {"threshold": 0.85, "hysteresis": 0.15, "rate": 0.2, "refractory_seconds": 90}


class Grace:
    """Watches desperation and decides. It is given no way to be asked.

    Note the signature of observe(): desperation and a duration. Nothing about the
    player is passed in, so this object has no way to know whether it is looking at a
    saint or a monster, and therefore cannot favour either."""

    def __init__(self, draw=None):
        import random
        self._draw = draw or random.random
        self._in_episode = False
        self._drawn = False
        self._cooldown = 0.0
        self.episodes = 0
        self.answered = 0

    @property
    def rate(self):
        return 0.0 if self.episodes == 0 else self.answered / self.episodes

    def observe(self, desperation, dt):
        self._cooldown = max(0.0, self._cooldown - dt)

        if self._in_episode and desperation < LAW["threshold"] - LAW["hysteresis"]:
            self._in_episode = False
            self._drawn = False
            return "none"

        if desperation < LAW["threshold"]:
            return "none"

        if not self._in_episode:
            self._in_episode = True
            self._drawn = False
            if self._cooldown > 0:
                return "watching"

        if self._drawn or self._cooldown > 0:
            return "watching"

        # One draw, now, for this whole episode. Per tick would make grace certain for
        # anyone willing to stand still in a hopeless state, and a certainty is farmable.
        self._drawn = True
        self.episodes += 1
        self._cooldown = LAW["refractory_seconds"]

        if self._draw() < LAW["rate"]:
            self.answered += 1
            return "given"
        return "withheld"


def desperation_from(viability):
    return 1.0 if not viability else 1.0 - max(viability)


print("desperation with a 40 percent way out:", desperation_from([0.4, 0.1]))
print("desperation with nothing:       ", desperation_from([]))
''')

md("""
### It does not look at a player who is merely losing
""")

code('''
# a coin that always gives, so any firing at all would show
always = Grace(draw=lambda: 0.0)
for _ in range(500):
    assert always.observe(0.80, 1) == "none"
print("500 seconds at desperation 0.80:", always.episodes, "episodes")
assert always.episodes == 0
print("asserted: 0.85 is a threshold, not a difficulty curve.")
''')

md("""
### One draw per episode, never per tick

Standing in the same hopeless moment buys nothing at all. This is what closes the farming
route, and it is the single most important line in the module.
""")

code('''
never = Grace(draw=lambda: 0.9)   # a coin that always withholds
print("first tick: ", never.observe(0.95, 1))
outcomes = {never.observe(0.95, 1) for _ in range(300)}
print("next 300:   ", outcomes)
print("episodes:   ", never.episodes)
assert never.episodes == 1
print("\\nasserted: three hundred seconds of desperation, one draw.")
''')

md("""
### Four desperate moments in five receive nothing

That is the intended reading. A grace that always arrives is a mechanic; a grace that
usually does not is grace.
""")

code('''
def lcg(seed):
    s = seed
    def nxt():
        nonlocal s
        s = (s * 1103515245 + 12345) & 0x7FFFFFFF
        return s / 0x7FFFFFFF
    return nxt


def run_episodes(grace, count):
    for _ in range(count):
        grace.observe(0.95, 1)      # the draw
        grace.observe(0.10, 1)      # the danger passes, closing the episode
        grace.observe(0.10, 120)    # and the refractory period elapses


g1 = Grace(draw=lcg(12345))
run_episodes(g1, 10000)
print("%d episodes, %d answered, rate %.3f" % (g1.episodes, g1.answered, g1.rate))
assert g1.episodes == 10000
assert 0.17 < g1.rate < 0.23
print("asserted: near one in five, over ten thousand.")
''')

md("""
### The rate moves with nothing the player did

Two populations, identical but for merit, handed to a method that cannot tell them apart.
""")

code('''
saint = Grace(draw=lcg(777))
monster = Grace(draw=lcg(878))
run_episodes(saint, 4000)
run_episodes(monster, 4000)

print("saint    rate %.3f over %d episodes" % (saint.rate, saint.episodes))
print("monster  rate %.3f over %d episodes" % (monster.rate, monster.episodes))
print("difference %.4f" % abs(saint.rate - monster.rate))
assert abs(saint.rate - monster.rate) < 0.03
print("\\nasserted. Matthew 5:45 as a method signature.")
''')

md("""
### And there is no way to ask for it

A feature defined by what it refuses to do is easy to claim and easy to check.
""")

code('''
grace = Grace()
surface = [n for n in dir(grace) if not n.startswith("_")]
print("public surface:", surface)

banned = ("trigger", "force", "grant", "give", "invoke", "request")
for name in surface:
    assert not any(b in name.lower() for b in banned), name

import inspect
sig = inspect.signature(Grace.observe)
print("observe signature:", sig)
assert list(sig.parameters) == ["self", "desperation", "dt"]
print("\\nasserted: no trigger, and nothing about the player reaches it.")
''')

# -------------------------------------------------------------------- atmosphere

md("""
---

## 5. Atmospheres

Where a scene happens changes what happens in it. A room puts a floor under what the scene
is already doing, leans on certain drives, and **weighs on the disposition itself**.

That last part is what lets a place reach every arc rather than only the ones built on
drives. Fear and resolve are read by all of them, so a frightening room frightens Peter
and Balaam's donkey alike, and neither arc has ever heard of atmospheres.
""")

code('''
NOWHERE = {"id": "nowhere", "label": "Nulle part", "ambient": {}, "weighs": None,
           "source": "GEN.1.2"}
DREAD = {"id": "dread", "label": "L Effroi",
         "ambient": {"clamour": 0.35, "strain": 0.5},
         # the room itself does the frightening; nothing has to happen
         "weighs": {"fear": 0.07, "resolve": -0.03},
         "source": "NUM.22.23"}
TEMPLE = {"id": "temple", "label": "Le Temple",
          "ambient": {"worth_hearing": 0.6},
          "weighs": {"fear": -0.03, "resolve": 0.03},
          "source": "EXO.26.33"}

# Balaam's donkey. Numbers 22. The only arc allowed to override player input, because
# the text is precisely about a creature obeying something higher than its rider.
DONKEY = {
    "id": "balaams-donkey",
    "initial": "carrying",
    "start": {"trust": 0.7, "fear": 0.2, "resolve": 0.5},
    "nodes": {
        "carrying": {"transitions": [
            {"to": "seeing", "when": lambda c: c["w"]["danger_ahead"],
             "because": "NUM.22.23"},
            # nobody has to point anything out: she balks on what the room does to her
            {"to": "seeing", "when": lambda c: c["d"].fear > 0.7,
             "because": "NUM.22.23"},
        ]},
        "seeing": {"drift": {"fear": 0.1}, "transitions": [
            {"to": "refusing",
             "when": lambda c: (c["w"]["danger_ahead"] or c["d"].fear > 0.7)
                               and c["w"]["time_in_node"] > 1,
             "because": "NUM.22.27"},
            {"to": "carrying",
             "when": lambda c: not c["w"]["danger_ahead"] and c["d"].fear < 0.5,
             "because": "NUM.22.23"},
        ]},
        "refusing": {"overrides_input": True, "transitions": [
            {"to": "carrying",
             "when": lambda c: not c["w"]["danger_ahead"] and c["d"].fear < 0.5,
             "because": "NUM.22.35"},
        ]},
    },
}

# somewhere with no character of its own: she carries on happily
calm = Actor(DONKEY)
calm.stands_in(NOWHERE)
for _ in range(60):
    calm.update(1, dict(BLANK_WORLD, danger_ahead=False))
print("in an ordinary place, after 60s:", calm.state, "  fear %.2f" % calm.disposition.fear)

# a frightening one, and danger_ahead stays False the whole time
frightened = Actor(DONKEY)
frightened.stands_in(DREAD)
for _ in range(14):
    frightened.update(1, dict(BLANK_WORLD, danger_ahead=False))
print("in a frightening one:          ", frightened.state,
      "  fear %.2f" % frightened.disposition.fear)
print("she was never shown any danger:", [e["because"] for e in frightened.journal])

assert calm.state == "carrying"
assert frightened.state == "refusing"
print("\\nasserted: the room stopped her, not a flag.")
''')

code('''
# take her somewhere that settles rather than frightens, and she gets up again
frightened.stands_in(TEMPLE)
for _ in range(40):
    frightened.update(1, dict(BLANK_WORLD, danger_ahead=False))
print("moved to a settling place:", frightened.state,
      "  fear %.2f" % frightened.disposition.fear)
assert frightened.state == "carrying"
print("asserted.")
''')

# ------------------------------------------------------------------- youversion

md("""
---

## 6. Scripture, live

**Nothing in Providence stores a verse.** Every arc, deed, threshold and atmosphere above
holds a reference like `LUK.22.57` and nothing else. You have seen them print all the way
through this notebook.

The resolver is the only door text comes through. Delete the key and every character goes
silent, which the repository asserts as a test.

The cell below makes a real call to the YouVersion Platform API. On Kaggle, add your App
Key as a secret named `YOUVERSION_APP_KEY`. Without one the notebook says so plainly and
shows the fallback rather than pretending.
""")

code('''
import json
import os
import urllib.request

BASE = "https://api.youversion.com/v1"
# Confirmed against the live platform: passages hang off a specific edition, so the
# language is chosen by picking the Bible id rather than by a query parameter.
BIBLE_ID = {"fra": 93, "eng": 3034}   # Segond 1910, Berean Standard


def app_key():
    """Kaggle secret first, then an environment variable. Never hardcoded."""
    try:
        from kaggle_secrets import UserSecretsClient
        return UserSecretsClient().get_secret("YOUVERSION_APP_KEY")
    except Exception:
        return os.environ.get("YOUVERSION_APP_KEY")


class Scripture:
    """The one place Scripture enters. Returns None when it cannot serve, and callers
    are expected to stay silent on that rather than invent a line."""

    def __init__(self, key):
        self.key = key
        self.cache = {}
        self.served_live = 0

    def line(self, usfm, language="fra"):
        hit = self.cache.get((usfm, language))
        if hit:
            return hit
        if not self.key:
            return None
        url = "%s/bibles/%d/passages/%s" % (BASE, BIBLE_ID[language], usfm)
        request = urllib.request.Request(url, headers={
            # the platform issues an App Key, not a bearer token
            "X-YVP-App-Key": self.key,
            "Accept": "application/json",
        })
        try:
            with urllib.request.urlopen(request, timeout=15) as response:
                payload = json.load(response)
        except Exception as error:
            print("  (%s unreachable: %s)" % (usfm, error))
            return None
        text = (payload.get("content") or "").strip()
        if not text:
            return None
        line = {"reference": payload.get("reference", usfm), "text": text,
                "source": "live", "language": language}
        self.cache[(usfm, language)] = line
        self.served_live += 1
        return line


KEY = app_key()
scripture = Scripture(KEY)
print("App Key present:", bool(KEY))
''')

code('''
# exactly the references the arcs above emitted, resolved live
REFS = ["LUK.22.57", "NUM.22.23", "GEN.3.4", "LEV.25.25", "MAT.18.22", "EPH.2.8"]

if not KEY:
    print("No App Key, so nothing is fetched and nothing is invented.\\n")
    print("This is the designed behaviour, not a failure: the engine holds references")
    print("and the resolver is the only source of text. With no source, characters are")
    print("silent. The repository asserts exactly that in providenceIntegrity.test.ts.")
else:
    for ref in REFS:
        line = scripture.line(ref, "fra")
        if line:
            print("[%s] %-16s %s" % (line["source"], line["reference"],
                                     line["text"][:78]))
    print("\\n%d of %d served live by YouVersion." % (scripture.served_live, len(REFS)))
''')

md("""
### The same law, the player's own Bible

The platform serves more than a thousand editions. This is why the engine stores a
reference rather than a string: one library, and a player in Ouagadougou and a player in
Texas meet the same law in their own language.
""")

code('''
if KEY:
    for language in ("fra", "eng"):
        line = scripture.line("LUK.22.57", language)
        if line:
            print("%s  %-14s %s" % (language, line["reference"], line["text"]))
else:
    print("(needs an App Key)")
''')

# -------------------------------------------------------------------------- gloo

md("""
---

## 7. Gloo advises, Providence decides

When a developer declares an action the engine does not know, the order is fixed and never
reversed: own rules first, the model only if still unsure, then a **structural check** on
whatever comes back.

The reason is not distrust of the model. A moral engine whose rules a generative system can
rewrite at runtime does not have rules.
""")

code('''
import re

KNOWN = set(DEED_SOURCE)
USFM = re.compile(r"^[A-Z0-9]{3}\\.\\d+(\\.\\d+)?$")

# words the engine settles on its own. Kept small on purpose: the point is that it
# answers what it can without help, not that it answers everything.
SYNONYMS = {
    "betray": "betray", "trahison": "betray", "trahir": "betray",
    "bless": "bless", "benir": "bless",
    "steal": "steal-blessing", "voler": "steal-blessing",
    "kill": "shed-blood", "murder": "shed-blood", "tuer": "shed-blood",
    "lend": "lend", "preter": "lend",
    "redeem": "redeem", "racheter": "redeem",
    "forgive": "forgive", "pardon": "forgive", "pardonner": "forgive",
}


class Interpreter:
    def __init__(self, adviser=None):
        self.adviser = adviser
        self.consulted = 0
        self.refused = 0

    def _by_rule(self, action):
        text = action.strip().lower()
        if text in KNOWN:
            return text
        if text in SYNONYMS:
            return SYNONYMS[text]
        for word in re.split(r"[^a-z-]+", text):
            if word in SYNONYMS:
                return SYNONYMS[word]
        return None

    def _validate(self, proposal):
        """Returns the reason to refuse, or None when admissible."""
        kind, because = proposal.get("kind"), proposal.get("because", "")
        if kind not in KNOWN:
            # the model may not extend the vocabulary, only choose within it
            return 'proposed "%s", outside the engine vocabulary' % kind
        if not USFM.match(because):
            return 'cited a reference the engine cannot parse: "%s"' % because
        if because != DEED_SOURCE[kind]:
            # the deed and the passage must agree, or the citation is decorative
            return "cited %s for %s, which the engine anchors at %s" % (
                because, kind, DEED_SOURCE[kind])
        if proposal.get("confidence", 1.0) < 0.5:
            return "was only %d%% sure" % round(proposal["confidence"] * 100)
        return None

    def interpret(self, action):
        own = self._by_rule(action)
        if own:
            return {"kind": own, "because": DEED_SOURCE[own], "decided_by": "engine"}
        if not self.adviser:
            return {"kind": None, "decided_by": "refused",
                    "reason": "unknown action and no adviser available"}
        self.consulted += 1
        try:
            proposal = self.adviser(action)
        except Exception:
            proposal = None
        if not proposal:
            self.refused += 1
            return {"kind": None, "decided_by": "refused",
                    "reason": "the adviser returned nothing"}
        problem = self._validate(proposal)
        if problem:
            self.refused += 1
            return {"kind": None, "decided_by": "refused", "reason": problem}
        return {"kind": proposal["kind"], "because": DEED_SOURCE[proposal["kind"]],
                "decided_by": "model"}


def stub_gloo(proposal):
    """Stands in for a Gloo AI Studio classification call, so the CONTROL FLOW can be
    examined without a key. The validation below is what matters, and it is the same
    code path a live response would take."""
    return lambda action: proposal


engine = Interpreter(stub_gloo({"kind": "betray", "because": "PSA.41.9"}))
for word in ("betray", "trahison", "pardonner", "he chose to betray his sworn brother"):
    verdict = engine.interpret(word)
    print("%-38s -> %-8s by %s" % (word, verdict["kind"], verdict["decided_by"]))
print("\\nmodel consulted %d times: the engine settled all of them alone." % engine.consulted)
assert engine.consulted == 0
''')

code('''
print("cases where the engine cannot tell, and the model is asked\\n")

cases = [
    ("a good proposal, inside the vocabulary",
     {"kind": "redeem", "because": "LEV.25.25", "confidence": 0.9}),
    ("a deed the model invented",
     {"kind": "excommunicate", "because": "MAT.18.17"}),
    ("a known deed cited from the wrong passage",
     {"kind": "forgive", "because": "GEN.1.1"}),
    ("an unparseable reference",
     {"kind": "bless", "because": "somewhere in Genesis"}),
    ("a proposal the model is unsure of",
     {"kind": "betray", "because": "PSA.41.9", "confidence": 0.2}),
]

for label, proposal in cases:
    who = Interpreter(stub_gloo(proposal))
    verdict = who.interpret("performed an unnamed rite")
    line = "  %-42s -> %s" % (label, verdict["decided_by"])
    if verdict["decided_by"] == "refused":
        line += ": " + verdict["reason"]
    print(line)

accepted = Interpreter(stub_gloo(cases[0][1])).interpret("paid off his cousin creditors")
assert accepted["decided_by"] == "model"
for _, bad in cases[1:]:
    assert Interpreter(stub_gloo(bad)).interpret("x")["decided_by"] == "refused"
print("\\nasserted: one accepted, four refused. Every verdict names who decided.")
''')

# ------------------------------------------------------------------------- scale

md("""
---

## 8. It carries a populated world

A demo cast proves nothing. The graph is indexed by unordered pair, by agent, and by
holder, so no read walks the whole world.

The assertion is on the **shape of the growth curve** rather than a wall-clock budget: a
millisecond threshold is flaky on a shared machine, while the curve is what actually
separates an indexed lookup from a scan.
""")

code('''
import time


def populate(n):
    g = RelationGraph()
    for i in range(1, n):
        g.bind("a%d" % (i - 1), "a%d" % i, "kin" if i % 3 == 0 else "household", 0.5)
        if i % 50 == 0:
            g.bind("a%d" % i, "a%d" % ((i + 500) % n), "covenant", 0.8)
    return g


def time_queries(g, n, samples=20000):
    start = time.perf_counter()
    for i in range(samples):
        k = i % (n - 1)
        g.bond("a%d" % k, "a%d" % (k + 1))
        g.house("a%d" % k)
    return time.perf_counter() - start


small = time_queries(populate(1000), 1000)
large = time_queries(populate(10000), 10000)

print("1,000 characters   %.3fs for 20,000 queries" % small)
print("10,000 characters  %.3fs for the same" % large)
print("ratio %.2fx at ten times the population" % (large / max(small, 1e-6)))

# with indexes the per-query cost is flat, so the ratio hovers near 1.
# with linear scans it would track the population and land near 10.
assert large / max(small, 1e-6) < 4
print("\\nasserted: flat, not linear.")
''')

# ------------------------------------------------------------------------ ending

md("""
---

## What you just ran

| section | claim | how it was checked |
| --- | --- | --- |
| Relations | a deed is weighed by the bond it breaks | ratio asserted at exactly 5 |
| | a blessing moves and never duplicates | one in the world after any number of thefts |
| | rescue costs the rescuer, and only a kinsman may | the closest friend refused |
| | forgiveness cancels the claim, keeps the record | ledger intact after pardon |
| Souls | selling a man ends his company, and mending costs more after | he leaves; 4 kindnesses back, then 5 to mend the denial |
| | a wound reopens faster than it first opened | second break strictly sooner |
| Drives | same room, opposite behaviour | Martha tidies, Mary listens, from drives alone |
| Grace | four desperate moments in five receive nothing | 10,000 episodes, rate near 0.2 |
| | one draw per episode, never per tick | 300 seconds, one draw |
| | the rate ignores merit | two populations within 0.03 |
| | there is no way to ask for it | public surface and signature inspected |
| Atmospheres | a room reaches every arc | donkey balks with no danger shown |
| Scripture | the engine stores references, not verses | resolved live, or silent |
| Gloo | the model advises and cannot extend the rules | one accepted, four refused |
| Scale | no read walks the world | flat cost at ten times the population |

## Where the real engine lives

This notebook is a faithful port of the laws. The engine itself is TypeScript, with 509
tests, a Godot addon, and an editor whose viewport is a real 3D scene rather than a
diagram. The repository link is in the writeup.

Two things worth knowing before you read it. The credentials are deliberately **not**
`VITE_` prefixed, because anything with that prefix is compiled into the browser bundle and
would be readable by anyone visiting the deployed site; the client calls a same-origin path
and the server attaches the key. And the archetype sheets in `docs/archetypes.md` are
generated from the library rather than kept by hand, because a table of 24 characters
maintained manually drifts within a week and then contradicts the code.

## Two mistakes worth admitting

An early build shipped our own paraphrases next to the references. They read as Scripture
and were not, which is worse than having no text at all. They are gone.

And a character's memory of the player was frozen at the moment it was created, so it kept
reacting to a world that had moved on. Both were found by tests, not by inspection, which
is the argument for having written them.
""")

# ------------------------------------------------------------------- assemble it

notebook = {
    "cells": [],
    "metadata": {
        "kernelspec": {"display_name": "Python 3", "language": "python", "name": "python3"},
        "language_info": {"name": "python", "version": "3.11"},
    },
    "nbformat": 4,
    "nbformat_minor": 5,
}

for index, (kind, source) in enumerate(cells):
    lines = source.split("\n")
    lines = [line + "\n" for line in lines[:-1]] + [lines[-1]]
    cell = {"cell_type": kind, "id": "cell-%02d" % index, "metadata": {}, "source": lines}
    if kind == "code":
        cell["outputs"] = []
        cell["execution_count"] = None
    notebook["cells"].append(cell)

with io.open("notebook/providence.ipynb", "w", encoding="utf-8") as handle:
    json.dump(notebook, handle, ensure_ascii=False, indent=1)

code_cells = sum(1 for k, _ in cells if k == "code")
print("wrote notebook/providence.ipynb")
print("%d cells: %d code, %d markdown" % (len(cells), code_cells, len(cells) - code_cells))
