extends Node

@export var fireball_scene: PackedScene = preload("res://Scenes/fireball.tscn")
@export var fireball_speed: float = 200.0  # Pixels per second
@export var fireball_curve : Curve

func _ready() -> void:
	SignalBus.fireball_animation.connect(play_fireball_animation)

func play_fireball_animation(start_pos: Vector2, target_pos: Vector2):
	
	
	
	
	# Instance the fireball scene
	var fireball = fireball_scene.instantiate()
	
	# Add the fireball to the current scene
	get_tree().current_scene.add_child(fireball)
	fireball.global_position = DataHandler.board_dict[start_pos].global_position + DataHandler.slot_offset
	
	# Start animation
	fireball.play("travel")
	
	# Calculate travel parameters
	var start_global = DataHandler.board_dict[start_pos].global_position + DataHandler.slot_offset
	var target_global = DataHandler.board_dict[target_pos].global_position + DataHandler.slot_offset
	var direction = (target_global - start_global).normalized()
	
	# Calculate slot size and distances
	var slot_size = DataHandler.board_dict[Vector2(1, 0)].global_position.distance_to(DataHandler.board_dict[Vector2(0, 0)].global_position)
	var diagonal_size = slot_size * sqrt(2)
	var slot_distance: float
	if abs(direction.x) == 1 and abs(direction.y) == 1:
		slot_distance = diagonal_size
	else:
		slot_distance = slot_size
	
	var total_distance = start_global.distance_to(target_global)
	var total_slots = int(ceil(total_distance / slot_distance))
	var acceleration_factor: float = .8
	var slot_travel_time = slot_distance / fireball_speed  # Time to travel one slot
	
	# Rotate fireball to face the target
	fireball.rotation = direction.angle()
	
	# Create a tween for the entire animation
	var current_pos = start_global
	
	
	var travel_time = total_distance / fireball_speed  # Time to travel one slot
	var final_pos = current_pos + direction * (total_distance - slot_distance / 2)
	var new_start = current_pos + direction * slot_distance
	
	var tween := create_tween()
	tween.set_trans(Tween.TransitionType.TRANS_QUINT)
	tween.tween_method(
		func (progress):
			var curve_progress := fireball_curve.sample(progress)
			fireball.global_position = lerp(new_start, final_pos, curve_progress), 0.0, 1.0, travel_time)
			
	#var tween = fireball.create_tween()
	#tween.set_ease(Tween.EaseType.EASE_IN)
	#tween.tween_property(fireball, "global_position", final_pos, travel_time)
	
	#await get_tree().create_timer(0.5).timeout
	await tween.finished
	fireball.queue_free()
	DataHandler.fireball([target_pos])
	
func _on_fireball_transition_to_travel(fireball):
	print("Transitioning to travel animation")
	fireball.play("travel")

func _on_fireball_transition_to_impact(fireball):
	print("Transitioning to impact animation")
	fireball.play("impact")

func _on_fireball_cleanup(fireball, target_pos):
	print("Cleaning up fireball and handling impact")
	DataHandler.fireball([target_pos])
	await get_tree().create_timer(0.5).timeout  # Adjust duration for impact animation
	fireball.queue_free()
