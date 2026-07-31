extends SceneTree

## Does the addon actually work?
##
## It was written, reviewed and shipped, and for a long time nobody had opened
## Godot once. "Plausible" and "working" are not the same claim, and the README
## was careful to say only the first. This says the second, or fails:
##
##     godot --headless --editor --quit-after 60 --path godot
##     godot --headless --path godot --script res://check.gd
##
## Two commands and not one, because `providence.gd` types its return as
## `ProvidenceActor` — a global class name, which Godot resolves out of a cache
## the editor builds and `.gitignore` rightly excludes. On a fresh clone the
## second command alone fails to compile the addon. Opening the editor is what a
## user does anyway; the first line is that, without a window.
##
## The autoload check is a `--` rather than a failure when the entry is missing.
## `add_autoload_singleton` writes into ProjectSettings and the editor saves
## those on shutdown, and a headless `--quit-after` session exits first, so the
## setting is registered in memory and never written down. The plugin is not at
## fault: a three-line control plugin making the same call behaves identically,
## and one explicit `ProjectSettings.save()` makes both entries appear at once.
## So the singleton is instantiated here instead and tested for what it does.

const Arcs := preload("res://addons/providence/arcs.gd")
const Actor := preload("res://addons/providence/actor.gd")

const USFM := "^[A-Z0-9]{3}(\\.[0-9]+){0,2}$"

var failures := 0
var checks := 0


func ok(what: String, condition: bool) -> void:
	checks += 1
	if condition:
		print("  ok    %s" % what)
	else:
		failures += 1
		print("  FAIL  %s" % what)


func drive(actor, seconds: int, world: Dictionary) -> void:
	var w := Actor.blank_world()
	w.merge(world, true)
	for i in seconds:
		actor.update(1.0, w)


func reach(actor, target: String, world: Dictionary, limit := 200) -> int:
	var w := Actor.blank_world()
	w.merge(world, true)
	for t in limit:
		if actor.state == target:
			return t
		actor.update(1.0, w)
	return -1


func _initialize() -> void:
	print("\n=== the addon loads ===")
	var ids: Array = Arcs.all().keys()
	ok("four arcs ship: %s" % [ids], ids.size() == 4)
	ok("an unknown id returns nothing rather than crashing", Arcs.get_arc("nobody").is_empty())

	## The autoload the plugin registers, tested for what it does rather than for
	## whether the editor has been opened. Absent, it is instantiated here: this
	## is the same script the plugin points at, and the point is that its two
	## jobs work, not that a project file has a line in it.
	var singleton := root.get_node_or_null("Providence")
	var borrowed := false
	if singleton == null:
		print("  --    autoload not registered yet; open godot/ in the editor once")
		singleton = preload("res://addons/providence/providence.gd").new()
		borrowed = true
	else:
		ok("the plugin registered the Providence autoload", true)

	ok("it hands out an actor for a shipped arc", singleton.actor("peter") != null)
	ok("it names every arc it ships", singleton.arc_ids().size() == 4)
	ok("with no key it reports no source rather than inventing one", not singleton.has_scripture_source())
	ok("it declares both ways a caller learns what happened",
		singleton.has_signal("scripture_resolved") and singleton.has_signal("scripture_unavailable"))
	# a Node made by hand is ours to free; the autoload belongs to the tree
	if borrowed:
		singleton.free()

	print("\n=== every arc is whole ===")
	var vocabulary := [
		"under_threat", "not_under_threat", "safe_and_calm", "fear_above",
		"resolve_above", "kindness_at_least", "has_errand_and_low_resolve",
		"player_within", "time_in_node_over", "danger_ahead", "danger_persists",
		"no_danger",
	]
	var reference := RegEx.new()
	reference.compile(USFM)

	for id in ids:
		var arc: Dictionary = Arcs.get_arc(id)
		var nodes: Dictionary = arc["nodes"]
		ok("%s opens in a node it has" % id, nodes.has(arc["initial"]))

		var whole := true
		var cited := true
		var known := true
		for name in nodes:
			for t in nodes[name].get("transitions", []):
				if not nodes.has(t["to"]):
					whole = false
				if reference.search(t["because"]) == null:
					cited = false
				if not vocabulary.has(String(t["when"])):
					known = false
		ok("%s points at no missing node" % id, whole)
		ok("%s cites a passage on every transition" % id, cited)
		ok("%s uses only conditions the actor understands" % id, known)

	print("\n=== Peter breaks and is restored ===")
	var peter = Actor.new(Arcs.get_arc("peter"))
	ok("he starts at your side", peter.state == "following" and peter.is_companion())

	var broke := reach(peter, "denying", {"under_threat": true})
	ok("threat presses him and he denies you, after %ds" % broke, broke > 0)
	ok("denying, he is not a companion and he refuses", not peter.is_companion() and peter.directive().get("refusing", false))

	reach(peter, "weeping", {})
	ok("the threat lifts and he weeps", peter.state == "weeping")

	drive(peter, 40, {"kindnesses_witnessed": 2})
	ok("two kindnesses do not buy him back", peter.state == "weeping")

	reach(peter, "restored", {"kindnesses_witnessed": 3})
	ok("three do, and he is a companion again", peter.state == "restored" and peter.is_companion())
	ok("every step he took is in the journal, with its passage", peter.journal.size() >= 4)
	ok("the journal cites LUK.22.57 for the denial", peter.journal[1]["because"] == "LUK.22.57")

	print("\n=== Jonah runs from the errand he was given ===")
	var jonah = Actor.new(Arcs.get_arc("jonah"))
	drive(jonah, 1, {"errand": "nineveh"})
	ok("given an errand and short of resolve, he flees", jonah.state == "fleeing")
	ok("he does not idle: he leaves his own errand", jonah.directive()["move"] == "away-from-errand")
	var caught := reach(jonah, "caught", {"errand": "nineveh"})
	ok("fear climbs on its own and the road closes, after %ds" % caught, caught > 0)

	print("\n=== the donkey overrules the rider ===")
	var donkey = Actor.new(Arcs.get_arc("balaams-donkey"))
	reach(donkey, "refusing", {"danger_ahead": true})
	ok("shown a danger the rider cannot see, she lies down", donkey.state == "refusing")
	ok("and this is the one state allowed to overrule input", donkey.overrides_input())
	reach(donkey, "carrying", {})
	ok("the danger lifts and she carries on", donkey.state == "carrying")

	print("\n=== the serpent never fights ===")
	var serpent = Actor.new(Arcs.get_arc("serpent"))
	reach(serpent, "reframing", {"distance_to_player": 2.0})
	ok("it closes, questions, then offers", serpent.state == "reframing")
	ok("what it offers looks like a gain", serpent.directive().get("offering", false))

	var hostile := false
	for name in Arcs.get_arc("serpent")["nodes"]:
		if Arcs.get_arc("serpent")["nodes"][name].get("hostile", false):
			hostile = true
	ok("it is hostile in no state at all", not hostile)

	print("\n=== the same behaviour at any frame rate ===")
	var slow = Actor.new(Arcs.get_arc("peter"))
	var fast = Actor.new(Arcs.get_arc("peter"))
	var w := Actor.blank_world()
	w["under_threat"] = true
	slow.update(1.0, w)
	slow.update(1.0, w)
	for i in 120:
		fast.update(1.0 / 60.0, w)
	ok("sixty small ticks drift as far as two large ones",
		abs(slow.disposition["fear"] - fast.disposition["fear"]) < 0.001)

	print("\n=== nothing here holds Scripture ===")
	var texts := 0
	for file in ["arcs.gd", "actor.gd", "providence.gd", "plugin.gd"]:
		var body := FileAccess.get_file_as_string("res://addons/providence/%s" % file)
		# a verse would have to be a long quoted run of words; references are short
		for quoted in RegEx.create_from_string("\"[^\"\n]{60,}\"").search_all(body):
			var s: String = quoted.get_string()
			if not s.contains("://") and not s.contains("%s") and not s.contains("moral physics"):
				texts += 1
	ok("no long quoted string that could be a verse", texts == 0)

	print("\n%d checks, %d failed" % [checks, failures])
	quit(1 if failures > 0 else 0)
