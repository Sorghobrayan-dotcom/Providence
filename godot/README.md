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

Four arcs, not the full twenty one. Each transition carries a *condition*, and a
condition is code rather than data, so it cannot be exported from the
TypeScript library and re-read here: it has to be written in GDScript. The four
were chosen to cover four distinct shapes.

| Arc | What it solves |
| --- | --- |
| `peter` | Loyalty bars that only ever rise or fall. This one snaps, then mends higher than before. |
| `jonah` | Quest givers rooted to one spot. This one flees the errand you just gave him. |
| `balaams-donkey` | Mounts that walk into a wall because the player said so. This one refuses, and overrules the input. |
| `serpent` | Villains whose only verb is attack. This one never fights, and is gone before the consequence. |

The remaining seventeen arcs, the relation graph and the places module live in
the TypeScript library, where the full test suite runs.

## Status

Honest note: this addon was written against the Godot 4 API but has not yet been
opened in the editor. Load it once and confirm before relying on it.
