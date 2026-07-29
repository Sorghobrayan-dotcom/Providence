extends RefCounted
class_name ProvidenceActor

## One NPC walking one arc.
##
## It owns the inner life only. Position, animation and rendering stay with the
## host game: this returns a directive saying what the character intends, and
## the game decides how a body shows it. That separation is what lets the same
## arcs drive a 3D scene here and a headless test in the TypeScript suite.

signal transitioned(from_state: String, to_state: String, because: String)

var arc: Dictionary
var disposition: Dictionary
var state: String = ""
var journal: Array[Dictionary] = []

var _elapsed_in_node: float = 0.0
var _drift_carry: float = 0.0


func _init(arc_data: Dictionary) -> void:
	assert(not arc_data.is_empty(), "ProvidenceActor needs an arc")
	arc = arc_data
	disposition = arc["start"].duplicate()
	state = arc["initial"]


func directive() -> Dictionary:
	return arc["nodes"][state]


func is_companion() -> bool:
	return directive().get("companion", false)


func overrides_input() -> bool:
	return directive().get("overrides_input", false)


## Nudge the inner life. Kindness raises trust, danger raises fear.
func influence(change: Dictionary) -> void:
	for key in change:
		disposition[key] = clampf(disposition.get(key, 0.0) + change[key], 0.0, 1.0)


## Advance the arc. Returns the transition that fired, or an empty dictionary.
## Only ONE fires per tick: a character that skipped three states in a frame
## would read as a glitch rather than as a change of heart.
func update(delta: float, world: Dictionary) -> Dictionary:
	_elapsed_in_node += delta

	var node: Dictionary = directive()
	if node.has("drift"):
		# drift is authored per second, so it holds at any frame rate
		_drift_carry += delta
		while _drift_carry >= 1.0:
			_drift_carry -= 1.0
			influence(node["drift"])

	for transition in node.get("transitions", []):
		if not _holds(transition, world):
			continue
		var event := {
			"from": state,
			"to": transition["to"],
			"because": transition["because"],
		}
		state = transition["to"]
		_elapsed_in_node = 0.0
		_drift_carry = 0.0
		journal.append(event)
		transitioned.emit(event["from"], event["to"], event["because"])
		return event

	return {}


func _holds(transition: Dictionary, world: Dictionary) -> bool:
	var value: float = transition.get("value", 0.0)
	match String(transition["when"]):
		"under_threat":
			return world.get("under_threat", false)
		"not_under_threat":
			return not world.get("under_threat", false)
		"safe_and_calm":
			return not world.get("under_threat", false) and disposition["fear"] < 0.3
		"fear_above":
			return disposition["fear"] > value
		"resolve_above":
			return disposition["resolve"] > value
		"kindness_at_least":
			return float(world.get("kindnesses_witnessed", 0)) >= value
		"has_errand_and_low_resolve":
			return world.get("errand", "") != "" and disposition["resolve"] < value
		"player_within":
			return float(world.get("distance_to_player", INF)) < value
		"time_in_node_over":
			return _elapsed_in_node > value
		"danger_ahead":
			return world.get("danger_ahead", false)
		"danger_persists":
			return world.get("danger_ahead", false) and _elapsed_in_node > value
		"no_danger":
			return not world.get("danger_ahead", false)
	push_warning("Providence: unknown condition '%s'" % transition["when"])
	return false


## A world with nothing happening in it. Host games merge in only the signals
## they actually track, so adding a field never breaks an existing integration.
static func blank_world() -> Dictionary:
	return {
		"distance_to_player": INF,
		"under_threat": false,
		"kindnesses_witnessed": 0,
		"errand": "",
		"danger_ahead": false,
	}
