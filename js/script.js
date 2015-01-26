// Mixing jQuery and Node.js code in the same file? Yes please!

WGo.lang = 'fr';

/* Board */

var board = new WGo.Board(document.getElementById("board"), {
	width: 600,
	size: 9
});

var game = new WGo.Game(board.size);

/* Pachi */

var pachi = require('pachi');

var gtp = pachi({playouts:5000, theads:4, pondering:false, maximize_score:true});

gtp.send('boardsize 9', function(error, response) {});
gtp.send('time_settings 0 4 1', function(error, response) {});

/* Play */

board.addEventListener("click", function(x, y) {
	console.log(x + '|' + y);
	// coup du joueur
	board.addObject({
		x: x,
		y: y,
		c: game.turn
	});
	game.play(x, y);

	// coup de l'ordinateur
	var coord = numberToLetterCoordinates(x, y);
	gtp.send('play b ' + coord.x  + coord.y, function(error, response) {});
	gtp.send('genmove white', function(error, response) {
                console.log('move: '+response);
		if (response && response !== '') {
			var move = letterToNumberCoordinates(response.charAt(0), response.charAt(1));
			board.addObject({
				x: move.x,
				y: move.y,
				c: game.turn
			});
			game.play(move.x, move.y);
		}

        });

	/*gtp.send('list_commands', function(error, response) {
                console.log('cmd: '+response);
        });


	gtp.send('showboard', function(error, response) {
		console.log('show: '+response);
	});*/
});

/* Utils */

// les coordonnées
var numberToLetterCoordinates = function(x, y) {
	var ch = x+"A".charCodeAt(0);
	if(ch >= "I".charCodeAt(0)) ch++;
	return {x: String.fromCharCode(ch), y: board.size-y};
};

var letterToNumberCoordinates = function(l, y) {
	var x = l.charCodeAt(0) - "A".charCodeAt(0);
	if(l.charCodeAt(0) >= "I".charCodeAt(0)) x--;
	return {x: x, y: Math.abs(y-board.size)};
};
