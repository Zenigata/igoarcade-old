(function(WGo){

"use strict";

// basic updating function - handles board changes
var update_board = function(e) {
	// update board's position
	if(e.change) this.board.update(e.change);

	// remove old markers from the board
	if(this.temp_marks) this.board.removeObject(this.temp_marks);

	// init array for new objects
	var add = [];

	this.notification();

	// add current move marker
	if(e.node.move && this.config.markLastMove) {
		if(e.node.move.pass) this.notification(WGo.t((e.node.move.c == WGo.B ? "b" : "w")+"pass"));
		else add.push({
			type: "CR",
			x: e.node.move.x, 
			y: e.node.move.y
		});
	}

	// add variation letters
	if(e.node.children.length > 1) {
		for(var i = 0; i < e.node.children.length; i++) {
			if(e.node.children[i].move && !e.node.children[i].move.pass) add.push({
				type: "LB",
				text: String.fromCharCode(65+i),
				x: e.node.children[i].move.x,
				y: e.node.children[i].move.y,
				c: "rgba(0,32,128,0.8)"
			});
		}
	}

	// add other markup
	if(e.node.markup) {
		for(var i in e.node.markup) {
			for(var j = 0; j < add.length; j++) {
				if(e.node.markup[i].x == add[j].x && e.node.markup[i].y == add[j].y) {
					add.splice(j,1);
					j--;
				}
			}
		}
		add = add.concat(e.node.markup);
	}

	// add new markers on the board
	this.temp_marks = add;
	this.board.addObject(add);
};

// preparing board
var prepare_board = function(e) {
	// set board size
	this.board.setSize(e.kifu.size);

	// remove old objects
	this.board.removeAllObjects();

	// activate wheel
	if(this.config.enableWheel) this.setWheel(true);
};

// function handling board clicks in normal mode
var board_click_default = function(x,y) {
	if(!this.kifuReader || !this.kifuReader.node) return false;
	for(var i in this.kifuReader.node.children) {
		if(this.kifuReader.node.children[i].move && this.kifuReader.node.children[i].move.x == x && this.kifuReader.node.children[i].move.y == y) {
			this.next(i);
			return;
		}
	}
};

/**
 * We can say this class is abstract, stand alone it doesn't do anything. 
 * However it is useful skelet for building actual player's GUI. Extend this class to create custom player template.
 * It controls board and inputs from mouse and keyboard, but everything can be overriden.
 *
 * Possible configurations:
 *  - sgf: sgf string (default: undefined)
 *  - json: kifu stored in json/jgo (default: undefined)
 *  - sgfFile: sgf file path (default: undefined)
 *  - board: configuration object of board (default: {})
 *  - enableWheel: allow player to be controlled by mouse wheel (default: true)
 *  - lockScroll: disable window scrolling while hovering player (default: true),
 *  - enableKeys: allow player to be controlled by arrow keys (default: true),
 *  - markLastMove: marks the last move with a circle (default: true),
 *
 * @param {object} config object if form: {key1: value1, key2: value2, ...}
 */

var Player = function(config) {
	this.config = config;

	// add default configuration
	for(var key in Player.default) if(this.config[key] === undefined && Player.default[key] !== undefined) this.config[key] = Player.default[key];

	this.element = document.createElement("div");
	this.board = new WGo.Board(this.element, this.config.board);

	this.init();
	this.initGame();
};

Player.prototype = {
	constructor: Player,

	/**
	 * Init player. If you want to call this method PlayerView object must have these properties: 
	 *  - player - WGo.Player object
	 *  - board - WGo.Board object (or other board renderer)
	 *  - element - main DOMElement of player
	 */

	init: function() {
		// declare kifu
		this.kifu = null;

		// creating listeners
		this.listeners = {
			kifuLoaded: [prepare_board.bind(this)],
			update: [update_board.bind(this)],
			frozen: [],
			unfrozen: [],
		};

		if(this.config.kifuLoaded) this.addEventListener("kifuLoaded", this.config.kifuLoaded);
		if(this.config.update) this.addEventListener("update", this.config.update);
		if(this.config.frozen) this.addEventListener("frozen", this.config.frozen);
		if(this.config.unfrozen) this.addEventListener("unfrozen", this.config.unfrozen);

		this.board.addEventListener("click", board_click_default.bind(this));
		this.element.addEventListener("click", this.focus.bind(this));

		this.focus();
	},

	initGame: function() {
		// try to load game passed in configuration
		if(this.config.sgf) {
			this.loadSgf(this.config.sgf, this.config.move);
		}
		else if(this.config.json) {
			this.loadJSON(this.config.json, this.config.move);
		}
		else if(this.config.sgfFile) {
			this.loadSgfFromFile(this.config.sgfFile, this.config.move);
		}

	},

	/**
	 * Create update event and dispatch it. It is called after position's changed.
	 *
	 * @param {string} op an operation that produced update (e.g. next, previous...)
	 */
	update: function(op) {
		if(!this.kifuReader || !this.kifuReader.change) return;

		var ev = {
			type: "update",
			op: op,
			target: this,
			node: this.kifuReader.node,
			position: this.kifuReader.getPosition(),
			path: this.kifuReader.path,
			change: this.kifuReader.change,
		}
		this.dispatchEvent(ev);
	},

	/**
	 * Implementation of EventTarget interface, though it's a little bit simplified.
	 * You need to save listener if you would like to remove it later.
	 *
	 * @param {string} type of listeners
	 * @param {Function} listener callback function
	 */
	addEventListener: function(type, listener) {
		this.listeners[type] = this.listeners[type] || [];
		this.listeners[type].push(listener);
	},

	/**
	 * Remove event listener previously added with addEventListener.
	 *
	 * @param {string} type of listeners
	 * @param {Function} listener function
	 */
	removeEventListener: function(type, listener) {
		if(!this.listeners[type]) return;
		var i = this.listeners[type].indexOf(listener);
		if(i != -1) this.listeners[type].splice(i,1);
	},

	/**
	 * Dispatch an event. In default there are two events: "kifuLoaded" and "update"
	 * 
	 * @param {string} evt event
	 */
	dispatchEvent: function(evt) {
		if(!this.listeners[evt.type]) return;
		for(var l in this.listeners[evt.type]) this.listeners[evt.type][l](evt);
	},

	/**
	 * Output function for notifications.
 	 */
	notification: function(text) {
		if(console) console.log(text);
	},

	/**
	 * Output function for helps.
 	 */
	help: function(text) {
		if(console) console.log(text);
	},

	/**
	 * Output function for errors. TODO: reporting of errors - by cross domain AJAX
	 */
	error: function(err) {
		if(!WGo.ERROR_REPORT) throw err;
		if(console) console.log(err);
	},

	/**
	 * Play next move.
	 * 
	 * @param {number} i if there is more option, you can specify it by index
	 */
	next: function(i) {
		if(this.frozen || !this.kifu) return;

		try {
			this.kifuReader.next(i);
			this.update();
		}
		catch(err) {
			this.error(err);
		}
	},

	/**
	 * Freeze or onfreeze player. In frozen state methods: next, previous etc. don't work.
	 */
	setFrozen: function(frozen) {
		this.frozen = frozen;
		this.dispatchEvent({
			type: this.frozen ? "frozen" : "unfrozen",
			target: this,
		});
	},

	/**
	 * Append player to given element.
	 */
	appendTo: function(elem) {
		elem.appendChild(this.element);
	},

	/**
	 * Get focus on the player
	 */
	focus: function() {
		if(this.config.enableKeys) this.setKeys(true);
	},
};

Player.default = {
	sgf: undefined,
	json: undefined,
	sgfFile: undefined,
	move: undefined,
	board: {},
	enableWheel: true,
	lockScroll: true,
	enableKeys: true,
	rememberPath: true,
	kifuLoaded: undefined,
	update: undefined,
	frozen: undefined,
	unfrozen: undefined,
	allowIllegalMoves: false,
	markLastMove: true,
};

WGo.Player = Player;

//--- i18n support ------------------------------------------------------------------------------------------

/**
 * For another language support, extend this object with similiar object.
 */

var player_terms = {
	"about-text": "<h1>WGo.js Player 2.0</h1>"
				+ "<p>WGo.js Player is extension of WGo.js, HTML5 library for purposes of game of go. It allows to replay go game records and it has many features like score counting. It is also designed to be easily extendable.</p>"
				+ "<p>WGo.js is open source licensed under <a href='http://en.wikipedia.org/wiki/MIT_License' target='_blank'>MIT license</a>. You can use and modify any code from this project.</p>"
				+ "<p>You can find more information at <a href='http://wgo.waltheri.net/player' target='_blank'>wgo.waltheri.net/player</a></p>"
				+ "<p>Copyright &copy; 2013 Jan Prokop</p>",
	"black": "Black",
	"white": "White",
	"DT": "Date",
	"KM": "Komi",
	"HA": "Handicap",
	"AN": "Annotations",
	"CP": "Copyright",
	"GC": "Game comments",
	"GN": "Game name",
	"ON": "Fuseki",
	"OT": "Overtime",
	"TM": "Basic time",
	"RE": "Result",
	"RO": "Round",
	"RU": "Rules",
	"US": "Recorder",
	"PC": "Place",
	"EV": "Event",
	"SO": "Source",
	"none": "none",
	"bpass": "Black passed.",
	"wpass": "White passed.",
};

for(var key in player_terms) WGo.i18n.en[key] = player_terms[key];

})(WGo);