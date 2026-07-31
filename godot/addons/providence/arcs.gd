extends RefCounted
class_name ProvidenceArcs

## Behaviour arcs, ported from the TypeScript library that the test suite
## exercises. Four are shipped here rather than all twenty four, and the precise
## reason matters: in the TypeScript a condition is a closure that may read the
## relation graph, the player's standing before the Law, or how many times this
## character has already stood where it is standing. None of that serialises.
## What replaces it here is the small tagged vocabulary `actor.gd` understands —
## twelve conditions, enough to express these four arcs exactly and not enough
## for the other twenty. Four covers four distinct shapes:
##
##   peter    a bond that breaks and can be repaired
##   jonah    a giver who flees the errand he was given
##   donkey   a mount that overrules the player for the player's sake
##   serpent  an adversary that never fights
##
## Every transition names the passage behind it and nothing else. No verse text
## lives in this file, or anywhere in the addon.

const PETER := {
	"id": "peter",
	"label": "Le Serment Brise",
	"source": "LUK.22.33",
	"initial": "following",
	"start": {"trust": 0.85, "fear": 0.1, "resolve": 0.9},
	"nodes": {
		"following": {
			"move": "toward-player", "posture": "sworn", "companion": true,
			"transitions": [
				{"to": "pressed", "when": "under_threat", "because": "LUK.22.54"},
			],
		},
		"pressed": {
			"move": "hold", "posture": "wary", "companion": true,
			"drift": {"fear": 0.09, "trust": -0.02},
			"transitions": [
				{"to": "denying", "when": "fear_above", "value": 0.7, "because": "LUK.22.57"},
				{"to": "following", "when": "safe_and_calm", "because": "LUK.22.33"},
			],
		},
		"denying": {
			"move": "away-from-player", "posture": "denying", "refusing": true,
			"drift": {"trust": -0.12},
			"transitions": [
				{"to": "weeping", "when": "not_under_threat", "because": "LUK.22.62"},
			],
		},
		"weeping": {
			"move": "hold", "posture": "withdrawn",
			"drift": {"fear": -0.08},
			"transitions": [
				{"to": "restored", "when": "kindness_at_least", "value": 3, "because": "JHN.21.17"},
			],
		},
		"restored": {
			"move": "toward-player", "posture": "steadfast", "companion": true,
			"drift": {"trust": 0.04},
			"transitions": [],
		},
	},
}

const JONAH := {
	"id": "jonah",
	"label": "Le Reticent",
	"source": "JON.1",
	"initial": "commissioned",
	"start": {"trust": 0.5, "fear": 0.3, "resolve": 0.25},
	"nodes": {
		"commissioned": {
			"move": "hold", "posture": "burdened",
			"transitions": [
				{"to": "fleeing", "when": "has_errand_and_low_resolve", "value": 0.4, "because": "JON.1.3"},
			],
		},
		"fleeing": {
			"move": "away-from-errand", "posture": "fleeing", "refusing": true,
			"drift": {"fear": 0.05},
			"transitions": [
				{"to": "caught", "when": "fear_above", "value": 0.75, "because": "JON.1.4"},
			],
		},
		"caught": {
			"move": "hold", "posture": "held",
			"drift": {"resolve": 0.12, "fear": -0.06},
			"transitions": [
				{"to": "returning", "when": "resolve_above", "value": 0.55, "because": "JON.2.10"},
			],
		},
		"returning": {
			"move": "toward-errand", "posture": "resigned",
			"transitions": [
				{"to": "obeying", "when": "player_within", "value": 3.0, "because": "JON.3.3"},
			],
		},
		"obeying": {
			"move": "toward-errand", "posture": "proclaiming",
			"transitions": [
				{"to": "sulking", "when": "time_in_node_over", "value": 6.0, "because": "JON.4.1"},
			],
		},
		"sulking": {
			"move": "away-from-player", "posture": "bitter",
			"drift": {"trust": -0.03},
			"transitions": [],
		},
	},
}

const DONKEY := {
	"id": "balaams-donkey",
	"label": "L Anesse Qui Refuse",
	"source": "NUM.22.23",
	"initial": "carrying",
	"start": {"trust": 0.7, "fear": 0.2, "resolve": 0.5},
	"nodes": {
		"carrying": {
			"move": "toward-errand", "posture": "carrying",
			"transitions": [
				{"to": "seeing", "when": "danger_ahead", "because": "NUM.22.23"},
			],
		},
		"seeing": {
			"move": "hold", "posture": "balking",
			"drift": {"fear": 0.1},
			"transitions": [
				{"to": "refusing", "when": "danger_persists", "value": 1.0, "because": "NUM.22.27"},
				{"to": "carrying", "when": "no_danger", "because": "NUM.22.23"},
			],
		},
		"refusing": {
			# the only state in the library allowed to overrule the player
			"move": "hold", "posture": "lying-down", "refusing": true, "overrides_input": true,
			"transitions": [
				{"to": "protesting", "when": "danger_persists", "value": 3.0, "because": "NUM.22.28"},
				{"to": "carrying", "when": "no_danger", "because": "NUM.22.35"},
			],
		},
		"protesting": {
			"move": "hold", "posture": "speaking", "refusing": true, "overrides_input": true,
			"transitions": [
				{"to": "revealed", "when": "time_in_node_over", "value": 2.0, "because": "NUM.22.31"},
			],
		},
		"revealed": {
			"move": "hold", "posture": "waiting",
			"transitions": [
				{"to": "carrying", "when": "no_danger", "because": "NUM.22.35"},
			],
		},
	},
}

const SERPENT := {
	"id": "serpent",
	"label": "Celui Qui Suggere",
	"source": "GEN.3.1",
	"initial": "coiled",
	"start": {"trust": 0.4, "fear": 0.0, "resolve": 0.9},
	"nodes": {
		"coiled": {
			"move": "hold", "posture": "watching",
			"transitions": [
				{"to": "questioning", "when": "player_within", "value": 6.0, "because": "GEN.3.1"},
			],
		},
		"questioning": {
			"move": "hold", "posture": "questioning", "offering": true,
			"transitions": [
				{"to": "reframing", "when": "time_in_node_over", "value": 3.0, "because": "GEN.3.4"},
			],
		},
		"reframing": {
			"move": "hold", "posture": "offering", "offering": true,
			"drift": {"trust": 0.04},
			"transitions": [
				{"to": "withdrawn", "when": "time_in_node_over", "value": 6.0, "because": "GEN.3.6"},
			],
		},
		"withdrawn": {
			# gone before the consequence lands, which is the whole character
			"move": "away-from-player", "posture": "gone",
			"transitions": [],
		},
	},
}


static func all() -> Dictionary:
	return {"peter": PETER, "jonah": JONAH, "balaams-donkey": DONKEY, "serpent": SERPENT}


static func get_arc(id: String) -> Dictionary:
	return all().get(id, {})
