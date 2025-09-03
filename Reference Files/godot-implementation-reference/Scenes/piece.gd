extends Node2D

@onready var icon_path = $Icon
@export var curve: Curve

var slot_ID := Vector2(0,0)
var type: int #piece color - see DataHandler.gd and gui.gd

# Called when the node enters the scene tree for the first time.
func _ready() -> void:
	SignalBus.changed_piece.connect(change_ID)

func load_icon(piece_name) -> void:
	icon_path.texture = load(DataHandler.assets[piece_name])

func change_ID(piece, coordinates, anim):
	#slot_ID = coordinates
	if self == piece:
		slot_ID = coordinates
		var tween = get_tree().create_tween()
		var anim_speed
		if anim == "move":
			anim_speed = .5
			tween.set_ease(Tween.EaseType.EASE_OUT)
			tween.set_trans(Tween.TransitionType.TRANS_EXPO)
		elif anim == "swap":
			anim_speed = .8
			tween.set_ease(Tween.EaseType.EASE_IN_OUT)
			tween.set_trans(Tween.TransitionType.TRANS_EXPO)
		elif anim == "launch":
			anim_speed = 1.5
			tween.set_ease(Tween.EaseType.EASE_IN_OUT)
			tween.set_trans(Tween.TransitionType.TRANS_QUAD)
			self.z_index += 1
			var tween_2 = get_tree().create_tween()
			tween_2.tween_property(piece, "scale", Vector2(2,2), anim_speed / 2).set_ease(Tween.EASE_IN).set_trans(Tween.TRANS_CUBIC)
			tween_2.tween_property(piece, "scale", Vector2(1,1), anim_speed / 2).set_ease(Tween.EASE_OUT).set_trans(Tween.TRANS_CUBIC)
		tween.tween_property(piece, "global_position", DataHandler.board_dict[coordinates].global_position + DataHandler.slot_offset, anim_speed)
		if anim == "launch":
			await tween.finished
			self.z_index -= 1
