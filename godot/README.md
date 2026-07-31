# Providence for Godot

A moral physics layer. Your engine already knows where the body falls; this
knows what it costs.

## Install

Copy `addons/providence/` into your Godot 4 project, then enable **Providence**
under *Project → Project Settings → Plugins*. The plugin registers a
`Providence` autoload, so any node can reach it without wiring anything up.

## Use

```gdscript
extends CharacterBody3D

var soul: ProvidenceActor
var world := ProvidenceActor.blank_world()

func _ready() -> void:
    soul = Providence.actor("peter")
    soul.transitioned.connect(_on_change)

func _physics_process(delta: float) -> void:
    world["distance_to_player"] = global_position.distance_to(player.global_position)
    world["under_threat"] = guards_nearby()
    soul.update(delta, world)

    match soul.directive()["move"]:
        "toward-player":   walk_toward(player.global_position)
        "away-from-player": walk_away_from(player.global_position)
        "hold":            velocity = Vector3.ZERO

func _on_change(_from: String, to: String, because: String) -> void:
    # the state changed; ask the platform for the passage behind it
    Providence.speak(because)
```

The library says what a character intends. Your game keeps every decision about
how a body shows it.

## Scripture

The addon contains no verse text. Arcs hold references such as `LUK.22.57` and
nothing else, and `Providence.speak()` is the single door through which text
enters, by asking the YouVersion Platform API.

Set the key in your environment, never in the project:

```
YOUVERSION_APP_KEY=your_app_key
```

Register at [platform.youversion.com](https://platform.youversion.com) to obtain
one. With no key, `scripture_unavailable` fires and characters stay silent.
That is deliberate: a silence is honest, an invented line is not.

## What ships here

Four arcs, not the full twenty four, and the reason is worth stating precisely
because the obvious version of it is wrong. In the TypeScript a condition is a
closure — it can read the relation graph, the player's standing, how many times
the character has already stood where it is standing — so it cannot be
serialised out and re-read. What is here instead is a small tagged vocabulary:
`fear_above`, `kindness_at_least`, `danger_persists`, twelve of them. That is
enough to express these four arcs exactly and not enough for the other twenty,
which is the real reason there are four. Widening it is the work, and it is
honest work rather than a port.

| Arc | What it solves |
| --- | --- |
| `peter` | Loyalty bars that only ever rise or fall. This one snaps, then mends higher than before. |
| `jonah` | Quest givers rooted to one spot. This one flees the errand you just gave him. |
| `balaams-donkey` | Mounts that walk into a wall because the player said so. This one refuses, and overrules the input. |
| `serpent` | Villains whose only verb is attack. This one never fights, and is gone before the consequence. |

The remaining twenty arcs, the relation graph and the places module live in
the TypeScript library, where the full test suite runs.

## Checking it

This folder is a Godot project whose only content is the addon and the check
that proves it works. Open it in Godot 4 and the plugin is already enabled, or
run it without a window:

```
godot --headless --editor --quit-after 60 --path godot
godot --headless --path godot --script res://check.gd
```

41 assertions: every arc opens in a node it has, points at no missing node,
cites a passage on every transition and uses only conditions the actor
understands. Peter breaks under threat after eight seconds, weeps, refuses two
kindnesses and comes back on the third. Jonah leaves his own errand. The donkey
lies down and overrules the rider. The serpent is hostile in no state at all.
Sixty small ticks drift as far as two large ones. And no string in the addon is
long enough to be a verse.

Two commands rather than one, because `providence.gd` types its return as
`ProvidenceActor`, a global class name that Godot resolves out of a cache the
editor builds and `.gitignore` excludes. On a fresh clone the script alone will
not compile the addon. Opening the editor is what anyone installing this does
anyway; the first line is that without a window.

## Status

Run, and passing, on Godot 4.7.1. What has *not* been done is the thing a check
cannot do: build something with it. The arcs behave, and whether they are
pleasant to write a game against is a different claim and not one we make.
