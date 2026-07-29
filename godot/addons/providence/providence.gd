extends Node

## Providence, the autoload.
##
## Two jobs: hand out actors, and resolve a reference into Scripture.
##
## The addon contains no verse text. Arcs hold references such as LUK.22.57 and
## nothing more, and this node is the single door through which text enters, by
## asking the YouVersion Platform. Clear the key and every character built on
## this addon goes silent, which is the point rather than an accident.

signal scripture_resolved(reference: String, text: String, source: String)
signal scripture_unavailable(reference: String)

const ArcsScript := preload("res://addons/providence/arcs.gd")
const ActorScript := preload("res://addons/providence/actor.gd")

## Bible ids confirmed against GET /v1/bibles on the live platform.
## 93 Segond 1910 (fr) and 3034 Berean Standard (en).
const BIBLE_ID := {"fra": 93, "eng": 3034}
const BASE_URL := "https://api.youversion.com/v1"

## Read from the environment, never committed. Godot exposes OS.get_environment
## so the key can live outside the project the way it should.
var app_key: String = OS.get_environment("YOUVERSION_APP_KEY")
var language: String = "fra"

var _cache: Dictionary = {}
var _pending: Dictionary = {}


func has_scripture_source() -> bool:
	return app_key != ""


## Create an actor for one of the shipped arcs.
func actor(arc_id: String) -> ProvidenceActor:
	var arc: Dictionary = ArcsScript.get_arc(arc_id)
	if arc.is_empty():
		push_error("Providence: no arc named '%s'" % arc_id)
		return null
	return ActorScript.new(arc)


func arc_ids() -> Array:
	return ArcsScript.all().keys()


## Resolve a reference into text. Emits scripture_resolved on success and
## scripture_unavailable otherwise. Nothing is ever invented to fill a silence.
func speak(reference: String) -> void:
	var key := "%s:%s" % [reference, language]
	if _cache.has(key):
		scripture_resolved.emit(reference, _cache[key], "cache")
		return

	if not has_scripture_source():
		scripture_unavailable.emit(reference)
		return

	if _pending.has(key):
		return # a second request for the same verse in flight helps nobody
	_pending[key] = true

	var request := HTTPRequest.new()
	add_child(request)
	request.request_completed.connect(
		func(_result: int, code: int, _headers: PackedStringArray, body: PackedByteArray) -> void:
			_pending.erase(key)
			request.queue_free()
			if code != 200:
				scripture_unavailable.emit(reference)
				return
			var parsed: Variant = JSON.parse_string(body.get_string_from_utf8())
			if typeof(parsed) != TYPE_DICTIONARY or not parsed.has("content"):
				scripture_unavailable.emit(reference)
				return
			var text: String = String(parsed["content"]).strip_edges()
			if text.is_empty():
				scripture_unavailable.emit(reference)
				return
			_cache[key] = text
			scripture_resolved.emit(reference, text, "live")
	)

	var url := "%s/bibles/%d/passages/%s" % [BASE_URL, BIBLE_ID.get(language, 93), reference]
	var error := request.request(url, PackedStringArray(["X-YVP-App-Key: " + app_key, "Accept: application/json"]))
	if error != OK:
		_pending.erase(key)
		request.queue_free()
		scripture_unavailable.emit(reference)
