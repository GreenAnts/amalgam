extends Node

signal changed_piece(piece, coordinates, animation)
signal toggle_add_piece(piece)
signal toggle_remove_piece()
signal ready_to_add_piece(piece, coordinates)
signal movement_options(coordinates)
signal reset_movement_options()
signal reset_ability_indicators()
signal portal_swap_complete()
signal show_correct_icons(piece)
signal bypass_piece_to_slot(slot_id)
signal show_end_turn(bool_val)
signal fireball_animation(pos, dir)
