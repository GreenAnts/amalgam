extends Sprite2D

var pos = Vector2()
var targets = []


func _on_area_2d_input_event(_viewport: Node, event: InputEvent, _shape_idx: int) -> void:
	if event is InputEventMouseButton:
		if event.button_index == MOUSE_BUTTON_LEFT and event.pressed:
			if DataHandler.fireball_ready == true:
				SignalBus.fireball_animation.emit(self.pos, self.targets[0])
				# Reset the fireball ability and clear targets
				SignalBus.show_correct_icons.emit("Ruby_Used")
				DataHandler.fireball_ready = false
				SignalBus.reset_movement_options.emit()
				SignalBus.reset_ability_indicators.emit()
			elif DataHandler.tidalwave_ready == true:
				DataHandler.tidalwave(self.targets)
				# Reset the fireball ability and clear targets
				SignalBus.show_correct_icons.emit("Pearl_Used")
				DataHandler.tidalwave_ready = false
				SignalBus.reset_movement_options.emit()
				SignalBus.reset_ability_indicators.emit()
			elif DataHandler.sap_ready == true:
				DataHandler.sap(self.targets)
				# Reset the fireball ability and clear targets
				SignalBus.show_correct_icons.emit("Amber_Used")
				DataHandler.sap_ready = false
				SignalBus.reset_movement_options.emit()
				SignalBus.reset_ability_indicators.emit()
