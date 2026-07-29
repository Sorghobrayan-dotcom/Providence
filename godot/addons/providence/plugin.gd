@tool
extends EditorPlugin

## Registers Providence as an autoload so any node can reach the library
## without wiring it up, the way a project reaches Input or Engine.

const AUTOLOAD_NAME := "Providence"


func _enter_tree() -> void:
	add_autoload_singleton(AUTOLOAD_NAME, "res://addons/providence/providence.gd")


func _exit_tree() -> void:
	remove_autoload_singleton(AUTOLOAD_NAME)
