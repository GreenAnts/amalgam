extends Control

var slot_ID := Vector2(0, 0)

# Called when the node enters the scene tree for the first time.
func _ready() -> void:
	SignalBus.bypass_piece_to_slot.connect(bypass)

func bypass(passed_slot_id):
	if passed_slot_id == self.slot_ID:
		DataHandler.clicked_slot = self.slot_ID
		if DataHandler.launch_ready_step_2 == true:
			# Loop through sap_targets to check if the current slot is one of the targets
			for movement_info in DataHandler.selected_launch_targets:
				# Check if the current slot is in any of the target lists
				if self.slot_ID == movement_info:
					# Execute sap on this target
					SignalBus.reset_movement_options.emit()
					DataHandler.launch(self.slot_ID)
					# Reset the sap ability and clear targets
					SignalBus.show_correct_icons.emit(null)
					DataHandler.launch_ready_step_2 = false
					break  # Exit loop once sap is used
				else:
					DataHandler.launch_ready_step_2 = true
		else:
			DataHandler.change_pos()

func _on_color_rect_gui_input(event: InputEvent) -> void:
	if event is InputEventMouseButton:
		if event.button_index == MOUSE_BUTTON_LEFT and event.pressed and DataHandler.board_dict.has(slot_ID):
			DataHandler.clicked_slot = self.slot_ID
			if DataHandler.add_piece != null:
				SignalBus.ready_to_add_piece.emit(DataHandler.add_piece, self.slot_ID)
				DataHandler.add_piece = null
			#SWAP
			elif DataHandler.swap_ready != null:
				DataHandler.swap_pos()
			#When an ability is toggled on, don't register clicks.
			elif DataHandler.fireball_ready == true:
				pass
			elif DataHandler.tidalwave_ready == true:
				pass
			elif DataHandler.sap_ready == true:
				pass
			elif DataHandler.launch_ready == true:
				pass
			elif DataHandler.launch_ready_step_2 == true:
				# Loop through sap_targets to check if the current slot is one of the targets
				for movement_info in DataHandler.selected_launch_targets:
					# Check if the current slot is in any of the target lists
					if self.slot_ID == movement_info:
						# Execute sap on this target
						SignalBus.reset_movement_options.emit()
						DataHandler.launch(self.slot_ID)
						# Reset the sap ability and clear targets
						SignalBus.show_correct_icons.emit("Jade_Used")
						DataHandler.launch_ready_step_2 = false
						break  # Exit loop once sap is used
					else:
						DataHandler.launch_ready_step_2 = true
			else:
				DataHandler.change_pos()
			
