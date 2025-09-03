extends Node

var player_turn : String

var turn_step = 1
var setup_ready = false
var setup_turn = 1

# Called when the node enters the scene tree for the first time.
func _ready() -> void:
	player_turn = "Squares"

func setup_next():
	if setup_turn < 16:
		setup_turn += 1
	else:
		setup_ready = false
		check_abilities()

func next_turn_step():
	if turn_step == 1:
		SignalBus.show_end_turn.emit(true)
	if turn_step < 2:
		turn_step += 1
	
func end_turn():
	if turn_step > 1:
		if setup_ready == false:
			check_abilities()
		else:
			setup_next()
		change_player()
		turn_step = 1
	#SignalBus.show_end_turn.emit(false)
	

func change_player():
	if player_turn == "Squares":
			player_turn = "Circles"
	elif player_turn == "Circles":
			player_turn = "Squares"
	DataHandler.temp_piece_dict = {}
	for piece in DataHandler.piece_dict:
		DataHandler.temp_piece_dict[piece] = DataHandler.piece_dict[piece].type

func check_abilities():
	if player_turn == "Squares":
		DataHandler.turn_start(true) #Circles Player
	elif player_turn == "Circles":
		DataHandler.turn_start(false) #Squares Player
