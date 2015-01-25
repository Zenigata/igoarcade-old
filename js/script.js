// Mixing jQuery and Node.js code in the same file? Yes please!

WGo.lang = 'fr';

/* Board */

var board = new WGo.Board(document.getElementById("board"), {
	width: 600,
	size: 9
});

var game = new WGo.Game(board.size);

board.addEventListener("click", function(x, y) {
	game.play(x, y);
	board.addObject({
		x: x,
		y: y,
		c: game.turn
	});
});

/* Pachi */

/*var pachi = require('pachi');

var gtp = pachi();
gtp.send('boardsize 9', function(error, response) {

	gtp.exit(function() {

	});
});*/