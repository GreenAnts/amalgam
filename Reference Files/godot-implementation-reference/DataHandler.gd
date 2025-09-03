extends Node

var board_dict := {
	#Centers
	Vector2(0,0): true,
	Vector2(0,1): true, Vector2(-1,0): true, Vector2(0,-1): true, Vector2(1,0): true,
	Vector2(0,2): true, Vector2(-2,0): true, Vector2(0,-2): true, Vector2(2,0): true, 
	Vector2(0,3): true, Vector2(-3,0): true, Vector2(0,-3): true, Vector2(3,0): true, 
	Vector2(0,4): true, Vector2(-4,0): true, Vector2(0,-4): true, Vector2(4,0): true, 
	Vector2(0,5): true, Vector2(-5,0): true, Vector2(0,-5): true, Vector2(5,0): true, 
	Vector2(0,6): true, Vector2(-6,0): true, Vector2(0,-6): true, Vector2(6,0): true, 
	Vector2(0,7): true, Vector2(-7,0): true, Vector2(0,-7): true, Vector2(7,0): true, 
	Vector2(0,8): true, Vector2(-8,0): true, Vector2(0,-8): true, Vector2(8,0): true,
	Vector2(0,9): true, Vector2(-9,0): true, Vector2(0,-9): true, Vector2(9,0): true,
	Vector2(0,10): true, Vector2(-10,0): true, Vector2(0,-10): true, Vector2(10,0): true,
	Vector2(0,11): true, Vector2(-11,0): true, Vector2(0,-11): true, Vector2(11,0): true,
	Vector2(0,12): true, Vector2(-12,0): true, Vector2(0,-12): true, Vector2(12,0): true,
	#Top Right
	Vector2(1,1): true, Vector2(1,2): true, Vector2(1,3): true, Vector2(1,4): true,
	Vector2(1,5): true, Vector2(1,6): true, Vector2(1,7): true, Vector2(1,8): true,
	Vector2(1,9): true, Vector2(1,10): true, Vector2(1,11): true,
	Vector2(2,1): true, Vector2(2,2): true, Vector2(2,3): true, Vector2(2,4): true,
	Vector2(2,5): true, Vector2(2,6): true, Vector2(2,7): true, Vector2(2,8): true,
	Vector2(2,9): true, Vector2(2,10): true, Vector2(2,11): true,
	Vector2(3,1): true, Vector2(3,2): true, Vector2(3,3): true, Vector2(3,4): true,
	Vector2(3,5): true, Vector2(3,6): true, Vector2(3,7): true, Vector2(3,8): true,
	Vector2(3,9): true, Vector2(3,10): true, Vector2(3,11): true,
	Vector2(4,1): true, Vector2(4,2): true, Vector2(4,3): true, Vector2(4,4): true,
	Vector2(4,5): true, Vector2(4,6): true, Vector2(4,7): true, Vector2(4,8): true,
	Vector2(4,9): true, Vector2(4,10): true, Vector2(4,11): true,
	Vector2(5,1): true, Vector2(5,2): true, Vector2(5,3): true, Vector2(5,4): true,
	Vector2(5,5): true, Vector2(5,6): true, Vector2(5,7): true, Vector2(5,8): true,
	Vector2(5,9): true, Vector2(5,10): true, Vector2(5,11): true,
	Vector2(6,1): true, Vector2(6,2): true, Vector2(6,3): true, Vector2(6,4): true,
	Vector2(6,5): true, Vector2(6,6): true, Vector2(6,7): true, Vector2(6,8): true,
	Vector2(6,9): true, Vector2(6,10): true,
	Vector2(7,1): true, Vector2(7,2): true, Vector2(7,3): true, Vector2(7,4): true,
	Vector2(7,5): true, Vector2(7,6): true, Vector2(7,7): true, Vector2(7,8): true,
	Vector2(7,9): true,
	Vector2(8,1): true, Vector2(8,2): true, Vector2(8,3): true, Vector2(8,4): true,
	Vector2(8,5): true, Vector2(8,6): true, Vector2(8,7): true, Vector2(8,8): true,
	Vector2(8,9): true,
	Vector2(9,1): true, Vector2(9,2): true, Vector2(9,3): true, Vector2(9,4): true,
	Vector2(9,5): true, Vector2(9,6): true, Vector2(9,7): true, Vector2(9,8): true,
	Vector2(10,1): true, Vector2(10,2): true, Vector2(10,3): true, Vector2(10,4): true,
	Vector2(10,5): true, Vector2(10,6): true,
	Vector2(11,1): true, Vector2(11,2): true, Vector2(11,3): true, Vector2(11,4): true,
	Vector2(11,5): true,
	#Top Left
	Vector2(-1,1): true, Vector2(-1,2): true, Vector2(-1,3): true, Vector2(-1,4): true,
	Vector2(-1,5): true, Vector2(-1,6): true, Vector2(-1,7): true, Vector2(-1,8): true,
	Vector2(-1,9): true, Vector2(-1,10): true, Vector2(-1,11): true,
	Vector2(-2,1): true, Vector2(-2,2): true, Vector2(-2,3): true, Vector2(-2,4): true,
	Vector2(-2,5): true, Vector2(-2,6): true, Vector2(-2,7): true, Vector2(-2,8): true,
	Vector2(-2,9): true, Vector2(-2,10): true, Vector2(-2,11): true,
	Vector2(-3,1): true, Vector2(-3,2): true, Vector2(-3,3): true, Vector2(-3,4): true,
	Vector2(-3,5): true, Vector2(-3,6): true, Vector2(-3,7): true, Vector2(-3,8): true,
	Vector2(-3,9): true, Vector2(-3,10): true, Vector2(-3,11): true,
	Vector2(-4,1): true, Vector2(-4,2): true, Vector2(-4,3): true, Vector2(-4,4): true,
	Vector2(-4,5): true, Vector2(-4,6): true, Vector2(-4,7): true, Vector2(-4,8): true,
	Vector2(-4,9): true, Vector2(-4,10): true, Vector2(-4,11): true,
	Vector2(-5,1): true, Vector2(-5,2): true, Vector2(-5,3): true, Vector2(-5,4): true,
	Vector2(-5,5): true, Vector2(-5,6): true, Vector2(-5,7): true, Vector2(-5,8): true,
	Vector2(-5,9): true, Vector2(-5,10): true, Vector2(-5,11): true,
	Vector2(-6,1): true, Vector2(-6,2): true, Vector2(-6,3): true, Vector2(-6,4): true,
	Vector2(-6,5): true, Vector2(-6,6): true, Vector2(-6,7): true, Vector2(-6,8): true,
	Vector2(-6,9): true, Vector2(-6,10): true,
	Vector2(-7,1): true, Vector2(-7,2): true, Vector2(-7,3): true, Vector2(-7,4): true,
	Vector2(-7,5): true, Vector2(-7,6): true, Vector2(-7,7): true, Vector2(-7,8): true,
	Vector2(-7,9): true,
	Vector2(-8,1): true, Vector2(-8,2): true, Vector2(-8,3): true, Vector2(-8,4): true,
	Vector2(-8,5): true, Vector2(-8,6): true, Vector2(-8,7): true, Vector2(-8,8): true,
	Vector2(-8,9): true,
	Vector2(-9,1): true, Vector2(-9,2): true, Vector2(-9,3): true, Vector2(-9,4): true,
	Vector2(-9,5): true, Vector2(-9,6): true, Vector2(-9,7): true, Vector2(-9,8): true,
	Vector2(-10,1): true, Vector2(-10,2): true, Vector2(-10,3): true, Vector2(-10,4): true,
	Vector2(-10,5): true, Vector2(-10,6): true,
	Vector2(-11,1): true, Vector2(-11,2): true, Vector2(-11,3): true, Vector2(-11,4): true,
	Vector2(-11,5): true,
	#Bottom Left
	Vector2(-1,-1): true, Vector2(-1,-2): true, Vector2(-1,-3): true, Vector2(-1,-4): true,
	Vector2(-1,-5): true, Vector2(-1,-6): true, Vector2(-1,-7): true, Vector2(-1,-8): true,
	Vector2(-1,-9): true, Vector2(-1,-10): true, Vector2(-1,-11): true,
	Vector2(-2,-1): true, Vector2(-2,-2): true, Vector2(-2,-3): true, Vector2(-2,-4): true,
	Vector2(-2,-5): true, Vector2(-2,-6): true, Vector2(-2,-7): true, Vector2(-2,-8): true,
	Vector2(-2,-9): true, Vector2(-2,-10): true, Vector2(-2,-11): true,
	Vector2(-3,-1): true, Vector2(-3,-2): true, Vector2(-3,-3): true, Vector2(-3,-4): true,
	Vector2(-3,-5): true, Vector2(-3,-6): true, Vector2(-3,-7): true, Vector2(-3,-8): true,
	Vector2(-3,-9): true, Vector2(-3,-10): true, Vector2(-3,-11): true,
	Vector2(-4,-1): true, Vector2(-4,-2): true, Vector2(-4,-3): true, Vector2(-4,-4): true,
	Vector2(-4,-5): true, Vector2(-4,-6): true, Vector2(-4,-7): true, Vector2(-4,-8): true,
	Vector2(-4,-9): true, Vector2(-4,-10): true, Vector2(-4,-11): true,
	Vector2(-5,-1): true, Vector2(-5,-2): true, Vector2(-5,-3): true, Vector2(-5,-4): true,
	Vector2(-5,-5): true, Vector2(-5,-6): true, Vector2(-5,-7): true, Vector2(-5,-8): true,
	Vector2(-5,-9): true, Vector2(-5,-10): true, Vector2(-5,-11): true,
	Vector2(-6,-1): true, Vector2(-6,-2): true, Vector2(-6,-3): true, Vector2(-6,-4): true,
	Vector2(-6,-5): true, Vector2(-6,-6): true, Vector2(-6,-7): true, Vector2(-6,-8): true,
	Vector2(-6,-9): true, Vector2(-6,-10): true,
	Vector2(-7,-1): true, Vector2(-7,-2): true, Vector2(-7,-3): true, Vector2(-7,-4): true,
	Vector2(-7,-5): true, Vector2(-7,-6): true, Vector2(-7,-7): true, Vector2(-7,-8): true,
	Vector2(-7,-9): true,
	Vector2(-8,-1): true, Vector2(-8,-2): true, Vector2(-8,-3): true, Vector2(-8,-4): true,
	Vector2(-8,-5): true, Vector2(-8,-6): true, Vector2(-8,-7): true, Vector2(-8,-8): true,
	Vector2(-8,-9): true,
	Vector2(-9,-1): true, Vector2(-9,-2): true, Vector2(-9,-3): true, Vector2(-9,-4): true,
	Vector2(-9,-5): true, Vector2(-9,-6): true, Vector2(-9,-7): true, Vector2(-9,-8): true,
	Vector2(-10,-1): true, Vector2(-10,-2): true, Vector2(-10,-3): true, Vector2(-10,-4): true,
	Vector2(-10,-5): true, Vector2(-10,-6): true,
	Vector2(-11,-1): true, Vector2(-11,-2): true, Vector2(-11,-3): true, Vector2(-11,-4): true,
	Vector2(-11,-5): true,
	#Bottom Right
	Vector2(1,-1): true, Vector2(1,-2): true, Vector2(1,-3): true, Vector2(1,-4): true,
	Vector2(1,-5): true, Vector2(1,-6): true, Vector2(1,-7): true, Vector2(1,-8): true,
	Vector2(1,-9): true, Vector2(1,-10): true, Vector2(1,-11): true,
	Vector2(2,-1): true, Vector2(2,-2): true, Vector2(2,-3): true, Vector2(2,-4): true,
	Vector2(2,-5): true, Vector2(2,-6): true, Vector2(2,-7): true, Vector2(2,-8): true,
	Vector2(2,-9): true, Vector2(2,-10): true, Vector2(2,-11): true,
	Vector2(3,-1): true, Vector2(3,-2): true, Vector2(3,-3): true, Vector2(3,-4): true,
	Vector2(3,-5): true, Vector2(3,-6): true, Vector2(3,-7): true, Vector2(3,-8): true,
	Vector2(3,-9): true, Vector2(3,-10): true, Vector2(3,-11): true,
	Vector2(4,-1): true, Vector2(4,-2): true, Vector2(4,-3): true, Vector2(4,-4): true,
	Vector2(4,-5): true, Vector2(4,-6): true, Vector2(4,-7): true, Vector2(4,-8): true,
	Vector2(4,-9): true, Vector2(4,-10): true, Vector2(4,-11): true,
	Vector2(5,-1): true, Vector2(5,-2): true, Vector2(5,-3): true, Vector2(5,-4): true,
	Vector2(5,-5): true, Vector2(5,-6): true, Vector2(5,-7): true, Vector2(5,-8): true,
	Vector2(5,-9): true, Vector2(5,-10): true, Vector2(5,-11): true,
	Vector2(6,-1): true, Vector2(6,-2): true, Vector2(6,-3): true, Vector2(6,-4): true,
	Vector2(6,-5): true, Vector2(6,-6): true, Vector2(6,-7): true, Vector2(6,-8): true,
	Vector2(6,-9): true, Vector2(6,-10): true,
	Vector2(7,-1): true, Vector2(7,-2): true, Vector2(7,-3): true, Vector2(7,-4): true,
	Vector2(7,-5): true, Vector2(7,-6): true, Vector2(7,-7): true, Vector2(7,-8): true,
	Vector2(7,-9): true,
	Vector2(8,-1): true, Vector2(8,-2): true, Vector2(8,-3): true, Vector2(8,-4): true,
	Vector2(8,-5): true, Vector2(8,-6): true, Vector2(8,-7): true, Vector2(8,-8): true,
	Vector2(8,-9): true,
	Vector2(9,-1): true, Vector2(9,-2): true, Vector2(9,-3): true, Vector2(9,-4): true,
	Vector2(9,-5): true, Vector2(9,-6): true, Vector2(9,-7): true, Vector2(9,-8): true,
	Vector2(10,-1): true, Vector2(10,-2): true, Vector2(10,-3): true, Vector2(10,-4): true,
	Vector2(10,-5): true, Vector2(10,-6): true,
	Vector2(11,-1): true, Vector2(11,-2): true, Vector2(11,-3): true, Vector2(11,-4): true,
	Vector2(11,-5): true
}

var golden_lines_dict := {
	Vector2(-12, 0): [Vector2(-11, 5), Vector2(-11, -5), Vector2(-8, 3), Vector2(-8, -3)],
	Vector2(-11, 5): [Vector2(-12, 0), Vector2(-9, 8)],
	Vector2(-9, 8): [Vector2(-11, 5), Vector2(-8, 3), Vector2(-6, 6), Vector2(-8, 9)],
	Vector2(-8, 9): [Vector2(-9, 8), Vector2(-5, 11), Vector2(-6, 6)],
	Vector2(-5, 11): [Vector2(-8, 9), Vector2(0, 12)],
	Vector2(0, 12): [Vector2(-5, 11), Vector2(5, 11)],
	Vector2(5, 11): [Vector2(0, 12), Vector2(8, 9)],
	Vector2(8, 9): [Vector2(5, 11), Vector2(9, 8), Vector2(6, 6)],
	Vector2(9, 8): [Vector2(11, 5), Vector2(8, 3), Vector2(6, 6), Vector2(8, 9)],
	Vector2(11, 5): [Vector2(12, 0), Vector2(9, 8)],
	Vector2(12, 0): [Vector2(11, 5), Vector2(11, -5), Vector2(8, 3), Vector2(8, -3)],
	Vector2(11, -5): [Vector2(12, 0), Vector2(9, -8)],
	Vector2(9, -8): [Vector2(11, -5), Vector2(8, -3), Vector2(6, -6), Vector2(8, -9)],
	Vector2(8, -9): [Vector2(9, -8), Vector2(5, -11), Vector2(6, -6)],
	Vector2(5, -11): [Vector2(8, -9), Vector2(0, -12)],
	Vector2(0, -12): [Vector2(5, -11), Vector2(-5, -11)],
	Vector2(-5, -11): [Vector2(0, -12), Vector2(-8, -9)],
	Vector2(-8, -9): [Vector2(-5, -11), Vector2(-9, -8), Vector2(-6, -6)],
	Vector2(-9, -8): [Vector2(-11, -5), Vector2(-8, -3), Vector2(-6, -6), Vector2(-8, -9)],
	Vector2(-11, -5): [Vector2(-12, 0), Vector2(-9, -8)],
	
	# Square Corners
	Vector2(6, 6): [Vector2(8, 9), Vector2(9, 8)],
	Vector2(6, -6): [Vector2(8, -9), Vector2(9, -8)],
	Vector2(-6, -6): [Vector2(-8, -9), Vector2(-9, -8)],
	Vector2(-6, 6): [Vector2(-8, 9), Vector2(-9, 8)],
	
	# Square Center Edge
	Vector2(6, 0): [Vector2(8, 3), Vector2(8, -3)],
	Vector2(-6, 0): [Vector2(-8, 3), Vector2(-8, -3)],
	
	# Outer Diamonds
	Vector2(-8, 3): [Vector2(-6, 0), Vector2(-12, 0), Vector2(-9, 8)],
	Vector2(-8, -3): [Vector2(-6, 0), Vector2(-12, 0), Vector2(-9, -8)],
	Vector2(8, 3): [Vector2(6, 0), Vector2(12, 0), Vector2(9, 8)],
	Vector2(8, -3): [Vector2(6, 0), Vector2(12, 0), Vector2(9, -8)],
	#Inner Lines ... *Sigh* - I'm not looking forward to typing these all out
	#Large Square
	Vector2(0,6): true, Vector2(1,6): true, Vector2(2,6): true, Vector2(3,6): true, Vector2(4,6): true, Vector2(5,6): true,
	Vector2(0,-6): true, Vector2(1,-6): true, Vector2(2,-6): true, Vector2(3,-6): true, Vector2(4,-6): true, Vector2(5,-6): true,
	Vector2(-1,6): true, Vector2(-2,6): true, Vector2(-3,6): true, Vector2(-4,6): true, Vector2(-5,6): true,
	Vector2(-1,-6): true, Vector2(-2,-6): true, Vector2(-3,-6): true, Vector2(-4,-6): true, Vector2(-5,-6): true,
	Vector2(6,1): true, Vector2(6,2): true, Vector2(6,3): true, Vector2(6,4): true, Vector2(6,5): true,
	Vector2(6,-1): true, Vector2(6,-2): true, Vector2(6,-3): true, Vector2(6,-4): true, Vector2(6,-5): true,
	Vector2(-6,1): true, Vector2(-6,2): true, Vector2(-6,3): true, Vector2(-6,4): true, Vector2(-6,5): true,
	Vector2(-6,-1): true, Vector2(-6,-2): true, Vector2(-6,-3): true, Vector2(-6,-4): true, Vector2(-6,-5): true,
	#Inner Rotated Square
	Vector2(1,5): true, Vector2(2,4): true, Vector2(3,3): true, Vector2(4,2): true, Vector2(5,1): true,
	Vector2(-1,5): true, Vector2(-2,4): true, Vector2(-3,3): true, Vector2(-4,2): true, Vector2(-5,1): true,
	Vector2(1,-5): true, Vector2(2,-4): true, Vector2(3,-3): true, Vector2(4,-2): true, Vector2(5,-1): true,
	Vector2(-1,-5): true, Vector2(-2,-4): true, Vector2(-3,-3): true, Vector2(-4,-2): true, Vector2(-5,-1): true,
	#Inner "X"
	Vector2(1,1): true, Vector2(2,2): true, Vector2(4,4): true, Vector2(5,5): true,
	Vector2(1,-1): true, Vector2(2,-2): true, Vector2(4,-4): true, Vector2(5,-5): true,
	Vector2(-1,1): true, Vector2(-2,2): true, Vector2(-4,4): true, Vector2(-5,5): true,
	Vector2(-1,-1): true, Vector2(-2,-2): true, Vector2(-4,-4): true, Vector2(-5,-5): true,
	#Horizontal Line
	Vector2(0,0): true, Vector2(1,0): true, Vector2(2,0): true, Vector2(3,0): true, Vector2(4,0): true, Vector2(5,0): true,
	Vector2(-1,0): true, Vector2(-2,0): true, Vector2(-3,0): true, Vector2(-4,0): true, Vector2(-5,0): true,
	Vector2(7,0): true, Vector2(8,0): true, Vector2(9,0): true, Vector2(10,0): true, Vector2(11,0): true,
	Vector2(-7,0): true, Vector2(-8,0): true, Vector2(-9,0): true, Vector2(-10,0): true, Vector2(-11,0): true,
	#Vertical Line
	Vector2(0,1): true, Vector2(0,2): true, Vector2(0,3): true, Vector2(0,4): true, Vector2(0,5): true,
	Vector2(0,-1): true, Vector2(0,-2): true, Vector2(0,-3): true, Vector2(0,-4): true, Vector2(0,-5): true,
	Vector2(0,7): true, Vector2(0,8): true, Vector2(0,9): true, Vector2(0,10): true, Vector2(0,11): true,
	Vector2(0,-7): true, Vector2(0,-8): true, Vector2(0,-9): true, Vector2(0,-10): true, Vector2(0,-11): true,
	#Upper Triangle
	Vector2(1,7): true, Vector2(2,8): true, Vector2(3,9): true, Vector2(4,10): true,
	Vector2(-1,7): true, Vector2(-2,8): true, Vector2(-3,9): true, Vector2(-4,10): true,
	#Lower Triangle
	Vector2(1,-7): true, Vector2(2,-8): true, Vector2(3,-9): true, Vector2(4,-10): true,
	Vector2(-1,-7): true, Vector2(-2,-8): true, Vector2(-3,-9): true, Vector2(-4,-10): true,
}

var circle_starting_pos_dict := {
#Top Right
	Vector2(1,8): true, Vector2(1,9): true, Vector2(1,10): true, Vector2(1,11): true,
	Vector2(2,7): true, Vector2(2,9): true, Vector2(2,10): true, Vector2(2,11): true,
	Vector2(3,7): true, Vector2(3,8): true, Vector2(3,10): true, Vector2(3,11): true,
	Vector2(4,7): true, Vector2(4,8): true, Vector2(4,9): true, Vector2(4,11): true,
	Vector2(5,7): true, Vector2(5,8): true, Vector2(5,9): true, Vector2(5,10): true,
	Vector2(6,7): true, Vector2(6,8): true, Vector2(6,9): true, Vector2(6,10): true,
	Vector2(7,8): true, Vector2(7,9): true,
#Top Left
	Vector2(-1,8): true, Vector2(-1,9): true, Vector2(-1,10): true, Vector2(-1,11): true,
	Vector2(-2,7): true, Vector2(-2,9): true, Vector2(-2,10): true, Vector2(-2,11): true,
	Vector2(-3,7): true, Vector2(-3,8): true, Vector2(-3,10): true, Vector2(-3,11): true,
	Vector2(-4,7): true, Vector2(-4,8): true, Vector2(-4,9): true, Vector2(-4,11): true,
	Vector2(-5,7): true, Vector2(-5,8): true, Vector2(-5,9): true, Vector2(-5,10): true,
	Vector2(-6,7): true, Vector2(-6,8): true, Vector2(-6,9): true, Vector2(-6,10): true,
	Vector2(-7,8): true, Vector2(-7,9): true
}

var square_starting_pos_dict := {
#Bottom Left
	Vector2(-1,-8): true, Vector2(-1,-9): true, Vector2(-1,-10): true, Vector2(-1,-11): true,
	Vector2(-2,-7): true, Vector2(-2,-9): true, Vector2(-2,-10): true, Vector2(-2,-11): true,
	Vector2(-3,-7): true, Vector2(-3,-8): true, Vector2(-3,-10): true, Vector2(-3,-11): true,
	Vector2(-4,-7): true, Vector2(-4,-8): true, Vector2(-4,-9): true, Vector2(-4,-11): true,
	Vector2(-5,-7): true, Vector2(-5,-8): true, Vector2(-5,-9): true, Vector2(-5,-10): true,
	Vector2(-6,-7): true, Vector2(-6,-8): true, Vector2(-6,-9): true, Vector2(-6,-10): true,
	Vector2(-7,-8): true, Vector2(-7,-9): true,
#Bottom Right
	Vector2(1,-8): true, Vector2(1,-9): true, Vector2(1,-10): true, Vector2(1,-11): true,
	Vector2(2,-7): true, Vector2(2,-9): true, Vector2(2,-10): true, Vector2(2,-11): true,
	Vector2(3,-7): true, Vector2(3,-8): true, Vector2(3,-10): true, Vector2(3,-11): true,
	Vector2(4,-7): true, Vector2(4,-8): true, Vector2(4,-9): true, Vector2(4,-11): true,
	Vector2(5,-7): true, Vector2(5,-8): true, Vector2(5,-9): true, Vector2(5,-10): true,
	Vector2(6,-7): true, Vector2(6,-8): true, Vector2(6,-9): true, Vector2(6,-10): true,
	Vector2(7,-8): true, Vector2(7,-9): true
}

#For DEBUG
var use_indicators = false
#End DEBUG

var assets := []
#enum PieceNames {WHITE_AMBER, WHITE_JADE, WHITE_RUBY, WHITE_PEARL, WHITE_VOID}
var piece_dict := {}

var clicked_piece = Vector2()
var clicked_slot = Vector2()
var slot_offset := Vector2(20, 20)

var indicators_active = false

#For ResetTurn
var temp_piece_dict = {}

#icons
var swap_ready = null
var fireball_ready = false
var tidalwave_ready = false
var sap_ready = false
var launch_ready = false
var launch_ready_step_2 = false

#Abilities
var ruby_targets = []
var pearl_targets = []
var amber_targets = []
var jade_targets = []
var selected_launch_targets = null

#used for where to place arrow indicators when selecting the ability
var ruby_indicator_coord = []
var pearl_indicator_coord = []
var amber_indicator_coord = []

var add_piece = null

# Called when the node enters the scene tree for the first time.
func _ready() -> void:
	#Circle
	assets.append("res://Images/Pieces/Ruby_Circle.png") #0
	assets.append("res://Images/Pieces/Pearl_Circle.png") #1
	assets.append("res://Images/Pieces/Amber_Circle.png") #2
	assets.append("res://Images/Pieces/Jade_Circle.png") #3
	assets.append("res://Images/Pieces/Amalgam_Circle.png") #4
	assets.append("res://Images/Pieces/Portal_Circle.png") #5
	assets.append("res://Images/Pieces/Void_Circle.png") #6
	#Square
	assets.append("res://Images/Pieces/Ruby_Square.png") #7
	assets.append("res://Images/Pieces/Pearl_Square.png") #8
	assets.append("res://Images/Pieces/Amber_Square.png") #9
	assets.append("res://Images/Pieces/Jade_Square.png") #10
	assets.append("res://Images/Pieces/Amalgam_Square.png") #11
	assets.append("res://Images/Pieces/Portal_Square.png") #12
	assets.append("res://Images/Pieces/Void_Square.png") #13
	#Indicators
	assets.append("res://Images/Misc/Green_Indicator.png") #14
	assets.append("res://Images/Misc/Blue_Indicator.png") #15
	assets.append("res://Images/Misc/Purple_Indicator.png") #16
# Called every frame. 'delta' is the elapsed time since the previous frame.

func turn_start(player):
	check_fireball(player, false)
	check_tidalwave(player, false)
	check_sap(player, false)
	check_launch(player, false)

func slot_is_empty():
	if !piece_dict.has(clicked_slot):
		return true

func swap_pos():
	if PlayerHandler.turn_step != 1:
		return
	if piece_dict.has(clicked_slot) && piece_dict.has(clicked_piece) && piece_dict[swap_ready].type in [5,12]:
		if GameLogic.move_is_valid(swap_ready, clicked_slot):
			#Change Pieces positions'
			#piece_dict[swap_ready].global_position = board_dict[clicked_slot].global_position + slot_offset
			#piece_dict[clicked_slot].global_position = board_dict[swap_ready].global_position + slot_offset
			#Update piece.slot_ID
			SignalBus.changed_piece.emit(piece_dict[swap_ready], clicked_slot, "swap")
			SignalBus.changed_piece.emit(piece_dict[clicked_slot], swap_ready, "swap")
			#update piece_dict
			var temp_piece_node = piece_dict[clicked_slot]
			piece_dict[clicked_slot] = piece_dict[swap_ready]
			piece_dict[swap_ready] = temp_piece_node
			#Attack
			GameLogic.attack(clicked_slot)
			GameLogic.attack(swap_ready)
			SignalBus.show_correct_icons.emit(null)
			indicators_active = false
			# Abilities
			var player = GameLogic.check_player_of_piece(clicked_slot)
			check_ability(player, swap_ready)
			var temp_jade_targets = DataHandler.jade_targets.duplicate(true) # Deep copy
			#Check ability again to allow for both the portal and the swapped piece to check for launch
			check_ability(player, clicked_slot)
			DataHandler.jade_targets.append_array(temp_jade_targets)
			#Remove old entries into piece_dict
			SignalBus.reset_movement_options.emit()
			#clicked_piece = null
			DataHandler.swap_ready = null
			PlayerHandler.next_turn_step()

func change_pos():
	if PlayerHandler.turn_step != 1:
		return
	if piece_dict.has(clicked_piece):
		if !piece_dict.has(clicked_slot) and GameLogic.move_is_valid(clicked_piece, clicked_slot):
			# Update piece position
			#piece_dict[clicked_piece].global_position = board_dict[clicked_slot].global_position + slot_offset
			SignalBus.changed_piece.emit(piece_dict[clicked_piece], clicked_slot, "move")
			piece_dict[clicked_slot] = piece_dict[clicked_piece]
			piece_dict.erase(clicked_piece)
			SignalBus.reset_movement_options.emit()
			indicators_active = false
			clicked_piece = null
			SignalBus.show_correct_icons.emit(null)
			
			# Attack Step
			GameLogic.attack(clicked_slot)
			
			# Ability Step
			var player = GameLogic.check_player_of_piece(clicked_slot)
			check_ability(player, clicked_slot)
			PlayerHandler.next_turn_step()

func check_ability(player: bool, moved_piece: Vector2):
	var piece = DataHandler.piece_dict[moved_piece]
	if not piece:
		return

	# Check based on the piece type
	if piece.type in [0, 7]:  # Ruby types (Circle and Square)
		check_fireball(player, moved_piece)
	elif piece.type in [1, 8]:  # Pearl types (Circle and Square)
		check_tidalwave(player, moved_piece)
	elif piece.type in [2, 9]:  # Amber types (Circle and Square)
		check_sap(player, moved_piece)
	elif piece.type in [4, 6, 11, 13]:  # Amalgam or Void types (Circle and Square)
		check_fireball(player, moved_piece)
		check_tidalwave(player, moved_piece)
		check_sap(player, moved_piece)
	check_launch(player, moved_piece)
	

func void_adjacent(moved_piece, piece1, piece2):
	if DataHandler.piece_dict[moved_piece].type in [6,13]:
			if GameLogic.is_adjacent(moved_piece, piece1):
				return true
			elif GameLogic.is_adjacent(moved_piece, piece2):
				return true
			else:
				return false

func check_fireball(player: bool, moved_piece):
	# Clear previous ruby targets and fireball state
	DataHandler.ruby_targets.clear()
	DataHandler.fireball_ready = false
	DataHandler.ruby_indicator_coord = []
	var rubies = []
	
	# Collect Rubies and Amalgams based on the player's type (Circle or Square)
	for piece_pos in DataHandler.piece_dict:
		var piece = DataHandler.piece_dict[piece_pos]
		if player:  # Circle player
			if piece.type == 0 || piece.type == 4:  # Ruby or Amalgam
				rubies.append(piece_pos)
		else:  # Square player
			if piece.type == 7 || piece.type == 11:  # Ruby or Amalgam
				rubies.append(piece_pos)

	# Check all combinations of Rubies and Amalgams for Fireball alignment
	for ruby_pos in rubies:
		for secondary_piece in rubies:
			if ruby_pos < secondary_piece:
				if typeof(moved_piece) == 1 || (moved_piece == ruby_pos || moved_piece == secondary_piece || void_adjacent(moved_piece, ruby_pos, secondary_piece)):
					var targets = GameLogic.ruby_fireball(ruby_pos, secondary_piece, moved_piece)
					if targets.size() > 0:
						# Store the valid targets and involved pieces
						DataHandler.ruby_targets.append(targets)

	# If valid targets exist, mark Fireball as ready and show indicator
	if DataHandler.ruby_targets != []:
		for arr in DataHandler.ruby_targets:
			if arr != [[],[]]:
				DataHandler.fireball_ready = false
				SignalBus.show_correct_icons.emit("Ruby")

func check_tidalwave(player: bool, moved_piece):
	# Clear previous targets and ready state
	DataHandler.pearl_targets.clear()
	DataHandler.pearl_indicator_coord = []
	DataHandler.tidalwave_ready = false
	
	var pearls = []
	# Collect Pearls and Amalgams based on the player's type (Circle or Square)
	for piece_pos in DataHandler.piece_dict:
		var piece = DataHandler.piece_dict[piece_pos]
		if player:  # Circle player
			if piece.type == 1 || piece.type == 4:  # Pearl or Amalgam
				pearls.append(piece_pos)
		else:  # Square player
			if piece.type == 8 || piece.type == 11:  # Pearl or Amalgam
				pearls.append(piece_pos)

	# Check combinations for valid Tidalwave targets
	for pearl_pos in pearls:
		for secondary_piece in pearls:
			if pearl_pos < secondary_piece:
				if typeof(moved_piece) == 1 || (moved_piece == pearl_pos or moved_piece == secondary_piece || void_adjacent(moved_piece, pearl_pos, secondary_piece)):
					var targets = GameLogic.pearl_tidalwave(pearl_pos, secondary_piece, moved_piece)
					if targets.size() > 0:
						DataHandler.pearl_targets.append(targets)


	# Update ready state and show indicator if targets exist
	if DataHandler.pearl_targets != []:
		for arr in DataHandler.pearl_targets:
			if arr != [[],[]]:
				DataHandler.tidalwave_ready = false
				SignalBus.show_correct_icons.emit("Pearl")

func check_sap(player: bool, moved_piece):
	# Clear previous targets and ready state
	DataHandler.amber_targets.clear()
	DataHandler.sap_ready = false
	DataHandler.amber_indicator_coord = []

	var ambers = []

	# Collect Amber and Amalgam pieces based on the player's type (Circle or Square)
	for piece_pos in DataHandler.piece_dict:
		var piece = DataHandler.piece_dict[piece_pos]
		if player:  # Circle player
			if piece.type == 2 || piece.type == 4:  # Amber or Amalgam
				ambers.append(piece_pos)
		else:  # Square player
			if piece.type == 9 || piece.type == 11:  # Amber or Amalgam
				ambers.append(piece_pos)

	# Check combinations for valid Sap targets
	var temp_targets = []
	for amber_pos in ambers:
		for secondary_piece in ambers:
			if amber_pos < secondary_piece:
				if typeof(moved_piece) == 1 || (moved_piece == amber_pos or moved_piece == secondary_piece or (piece_dict[moved_piece].type in [6,13] && GameLogic.get_points_on_line(amber_pos.x, amber_pos.y, secondary_piece.x, secondary_piece.y).has(moved_piece))):
					var targets = GameLogic.amber_sap(amber_pos, secondary_piece)
					if targets.size() > 0:
						var amber1_data = [amber_pos, get_direction(amber_pos, secondary_piece)]
						var amber2_data = [secondary_piece, get_direction(secondary_piece, amber_pos)]
						DataHandler.amber_indicator_coord.append([amber1_data, amber2_data])
						temp_targets.append(targets)
	DataHandler.amber_targets.append_array(temp_targets)
	

	# Update ready state and show indicator if targets exist
	if DataHandler.amber_targets.size() > 0:
		DataHandler.sap_ready = false
		SignalBus.show_correct_icons.emit("Amber")

func check_launch(player: bool, moved_piece):
	DataHandler.jade_targets.clear()
	var jades = []

	# Collect Jade and Amalgam pieces
	for piece_pos in DataHandler.piece_dict:
		var piece = DataHandler.piece_dict[piece_pos]
		if player:  # Circle player
			if piece.type == 3 or piece.type == 4:  # Jade or Amalgam
				jades.append(piece_pos)
		else:  # Square player
			if piece.type == 10 or piece.type == 11:  # Jade or Amalgam
				jades.append(piece_pos)

	# Check adjacent Jade pairs
	for jade_pos in jades:
		for secondary_piece in jades:
			if jade_pos < secondary_piece:
				var launch_pieces = GameLogic.jade_launch(jade_pos, secondary_piece, moved_piece)
				if launch_pieces != []:
					if launch_pieces[0] != null:
						if typeof(moved_piece) == 1 || (moved_piece == launch_pieces[0]["Piece"] or moved_piece == jade_pos or moved_piece == secondary_piece or void_adjacent(moved_piece, jade_pos, secondary_piece)):
							DataHandler.jade_targets.append({launch_pieces[0]["Piece"] : launch_pieces[0]["launch"]})
					if launch_pieces[1] != null:
						if typeof(moved_piece) == 1 || (moved_piece == launch_pieces[1]["Piece"] or moved_piece == jade_pos or moved_piece == secondary_piece or void_adjacent(moved_piece, jade_pos, secondary_piece)):
							DataHandler.jade_targets.append({launch_pieces[1]["Piece"] : launch_pieces[1]["launch"]})


	if DataHandler.jade_targets.size() > 0:
		DataHandler.launch_ready = false
		SignalBus.show_correct_icons.emit("Jade")

func fireball(target_pos: Array):
	# Validate the target exists before removing it
	for i in target_pos:
		if DataHandler.piece_dict.has(i):
			DataHandler.piece_dict[i].queue_free()
			DataHandler.piece_dict.erase(i)
			DataHandler.ruby_indicator_coord = []
			PlayerHandler.next_turn_step()
	
func tidalwave(target_pos: Array):
	# Validate the target exists before removing it
	for i in target_pos:
		if DataHandler.piece_dict.has(i):
			DataHandler.piece_dict[i].queue_free()
			DataHandler.piece_dict.erase(i)
			DataHandler.pearl_indicator_coord = []
			PlayerHandler.next_turn_step()
	
# Function to execute the Sap ability
func sap(target_pos: Array):
	# Validate the target exists before removing it
	for i in target_pos:
		if DataHandler.piece_dict.has(i):
			DataHandler.piece_dict[i].queue_free()
			DataHandler.piece_dict.erase(i)
			DataHandler.amber_indicator_coord = []
			PlayerHandler.next_turn_step()
	
# Function to execute the Launch ability
func launch(target_pos):
	var player
	for i in jade_targets.size():
		if launch_ready == true && launch_ready_step_2 == false:
			if piece_dict.has(clicked_piece) && jade_targets[i].has(clicked_piece):
				SignalBus.movement_options.emit(jade_targets[i][clicked_piece])
				launch_ready = false
				launch_ready_step_2 = true
				selected_launch_targets = jade_targets[i][clicked_piece]
				break
		elif launch_ready == false && launch_ready_step_2 == true:
			if jade_targets[i].has(clicked_piece) && jade_targets[i][clicked_piece].has(target_pos):
				if target_pos in piece_dict:
					
					player = GameLogic.check_player_of_piece(clicked_piece)
					var player_target = GameLogic.check_player_of_piece(clicked_slot)
					if player != player_target:
						DataHandler.piece_dict[target_pos].queue_free()
						DataHandler.piece_dict.erase(target_pos)
				SignalBus.changed_piece.emit(piece_dict[clicked_piece], clicked_slot, "launch")
				piece_dict[clicked_slot] = piece_dict[clicked_piece]
				piece_dict.erase(clicked_piece)
				SignalBus.reset_movement_options.emit()
				indicators_active = false
				
				# Attack phase
				GameLogic.attack(clicked_slot)
				
				# Abilities
				player = GameLogic.check_player_of_piece(clicked_slot)
				check_ability(player, clicked_slot)
				launch_ready_step_2 = false
				selected_launch_targets = null
				PlayerHandler.next_turn_step()

func get_direction(coord1: Vector2, coord2: Vector2) -> Vector2:
	# Calculate the raw direction vector
	var dx = coord2.x - coord1.x
	var dy = coord2.y - coord1.y

	# Normalize the direction to the closest cardinal or diagonal direction
	if dx > 0:
		dx = 1
	elif dx < 0:
		dx = -1
	else:
		dx = 0

	if dy > 0:
		dy = 1
	elif dy < 0:
		dy = -1
	else:
		dy = 0
	return Vector2(dx, dy)

func convert_direction_to_rotation(direction: Vector2) -> float:
	if direction == Vector2(1, 0):  # Right
		return 90
	elif direction == Vector2(1, -1):  # Down-Right
		return 135
	elif direction == Vector2(0, -1):  # Down
		return 180
	elif direction == Vector2(-1, -1):  # Down-Left
		return 225
	elif direction == Vector2(-1, 0):  # Left
		return 270
	elif direction == Vector2(-1, 1):  # Up-Left
		return 315
	elif direction == Vector2(0, 1):  # Up
		return 0
	elif direction == Vector2(1, 1):  # Up-Right
		return 45
	else:
		# If the input direction does not match any expected value, return -1 or an appropriate default
		return -1
