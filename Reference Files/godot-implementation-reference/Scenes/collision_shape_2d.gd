extends CollisionShape2D

func _ready():
	# Connect the mouse_entered and mouse_exited signals to their respective handlers
	connect("mouse_entered", Callable(self, "_on_mouse_entered"))
	connect("mouse_exited", Callable(self, "_on_mouse_exited"))

# Called when the mouse enters the piece
func _on_mouse_entered():
	SignalBus.movement_options.emit(GameLogic.nexus_movement(self.get_parent().slot_ID))
	SignalBus.movement_options.emit(GameLogic.standard_movement(self.get_parent().slot_ID))
	if DataHandler.piece_dict[self.get_parent().slot_ID].type in [5, 12]:
		SignalBus.movement_options.emit(GameLogic.portal_movement(self.get_parent().slot_ID))

# Called when the mouse exits the piece
func _on_mouse_exited():
	SignalBus.reset_movement_options.emit()
