extends Sprite2D

var pos = Vector2()
var targets = []
# Called when the node enters the scene tree for the first time.
func _ready() -> void:
	pass # Replace with function body.

func _on_area_2d_input_event(_viewport: Node, event: InputEvent, _shape_idx: int) -> void:
	if event is InputEventMouseButton:
		if event.button_index == MOUSE_BUTTON_LEFT and event.pressed:
			if DataHandler.launch_ready == true:
				for key in targets:
					for target in targets[key]:
						SignalBus.reset_movement_options.emit()
						SignalBus.movement_options.emit(targets[key])
						SignalBus.reset_ability_indicators.emit()
						DataHandler.clicked_piece = self.pos
						DataHandler.launch(self.pos)
						SignalBus.show_correct_icons.emit(null)
						DataHandler.launch_ready = false
						break
