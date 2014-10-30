/*
 * A navigation stack controller library
 * Copyright Neville Dastur 2014
 */

var __FILE__ = "nav_stack.js | ";
var Alloy = require("alloy");
var _ = require('alloy/underscore');
var LOGGER = require('logger');

var G = {
	MainWindow: null,
	ContentView: null,

	// The passed parameters for the navigation stacks
	navStacksParams: [],

	// An array for Navigator objects for each stack
	// index 0 is reserved for the modal stack
	navStacksObjs: [],

	// The index of the current Stack
	currentStackIndex: -1,

	// The index of the previous stack
	previousStackIndex: -1
};

/**
 * Init the stack
 * @param  {[type]} _args [description]
 * @return {[type]}       [description]
 */
function init(_args) {
	if(!_args.view) { Ti.API.error("Window Stack - A view to place content into must be passed.");}
	G.ContentView = _args.view;

	if(!_args.window) { Ti.API.error("Window Stack - The main window of the application must be passed.");}
	G.MainWindow = _args.window;

	if(!_args.stacks || _args.stacks.length === 0) {
		Ti.API.debug("Nothing to init stack with");
	}
	else {
		G.navStacksParams = _.clone(_args.stacks);

		// Add object for the modal stack at index 0
		G.navStacksParams.unshift({title: 'modal'});
	}

};

function createScrollableViewContainer(_index, _args) {
	var args = _args || {};

	if(! G.navStacksObjs[_index] ) {
		// Set the controller and controller arguments vars which also handles
		// 1) if modal in which case passed in args
		// 2) overide the home controller settings from init
		var controllerName = args.controller || G.navStacksParams[_index].controller || "";
		var controllerArguments = args.controllerArguments || {};

		LOGGER.debug(__FILE__+'Stack: ' +_index + 
			' Creating controller: '+controllerName+
			' with args: '+ JSON.stringify(controllerArguments) );

		var controller = Alloy.createController(controllerName, controllerArguments);

		var scrollableView = Ti.UI.createScrollableView({
	    	showPagingControl: false,
	    	opacity: 0,
	    	top: 0, left: 0,
	    	height: Ti.UI.FILL,
	    	width: Ti.UI.FILL,
		});

		G.navStacksObjs[_index] = scrollableView;
		var ctrlView = controller.getView();
		scrollableView.addView( ctrlView );
		LOGGER.debug(__FILE__+"createScrollableViewContainer done");

		// Add to the GlobalView
		G.ContentView.add( scrollableView );
	}
};

/**
 * Set which stack to use
 * @param {[type]} _index [description]
 * @param {[type]} _args  [description]
 */
function setStack(_index, _args){
	LOGGER.debug(__FILE__+'requested change to stack index '+_index);

	var args = _args || {};

	if(typeof _index === "string") {
		for(var i=G.navStacksParams.length-1; i>=0; i--) {
			if( G.navStacksParams[i].title === _index) {
				// Set index
				_index = i;
				break;
			}
		}

		if(typeof _index !== "number") {
			Ti.API.error("Stack.handleNavigation | Invalid string id ("+_index+") was passed");
			return;
		}
	}

	// If requested the stack we are currently on, just ignore
	if(_index === G.currentStackIndex) {
		return;
	}

	// Check bounds
	if(_index <1 || _index >G.navStacksParams.length-1) {
		LOGGER.debug(__FILE__+"invalid stack index");
		return;
	}

	LOGGER.debug(__FILE__+'changing to stack index '+_index);

	// Save previous stack index
	G.previousStackIndex = G.currentStackIndex;
	// Set to the new current stack
	G.currentStackIndex = _index;

	// Fire of an event to let the app know we are about to change the stack
	Ti.App.fireEvent("app:StackChanging", {index: G.currentStackIndex, previousIndex: G.previousStackIndex});

	// Make new scrollable view container for this stack if reqiured
	createScrollableViewContainer(_index, args);

	function showStack() {
		LOGGER.debug(__FILE__+'showStack()');

		var animation = Titanium.UI.createAnimation();
		animation.opacity = 1;
		animation.duration = 600;

		var incomingStack = G.navStacksObjs[G.currentStackIndex];
		incomingStack.show();
		Ti.API.trace(0);
		incomingStack.animate(animation);
	}

	// Hide any view in the currently viewed stack unless closing off a modal in which case there won't be an object
	if( G.navStacksObjs[G.previousStackIndex] ) {
		var outgoingStack = G.navStacksObjs[G.previousStackIndex];
		
		LOGGER.debug(__FILE__+'hiding current stack top controller');
		outgoingStack.animate({opacity: 0, duration: 500},
			function outgoingFadeComplete(){
				outgoingStack.hide();
				showStack();
			});
	}
	else {
		showStack();
	}
};

/**
 * [open description]
 * @param  {[type]} _controller          [description]
 * @param  {[type]} _controllerArguments [description]
 * @param  {[type]} _modal               [description]
 * @return {[type]}                      [description]
 */
function open(_controller, _controllerArguments, _modal) {
	if(_modal) {
		openModel(_controller, _controllerArguments);
		return;
	}

	// Only open if a current stack has been set
	if(G.currentStackIndex < 0) {
		LOGGER.error(__FILE__+"open() A current stack has not been set");
		return;
	}

	var Navigator = G.navStacksObjs[ G.currentStackIndex ];
	Navigator.open(_controller, _controllerArguments);
};

/**
 * Opens a controller on the modal stack
 * The modal stack is always index 0
 * @param  {[type]} _controller          [description]
 * @param  {[type]} _controllerArguments [description]
 * @return {[type]}                      [description]
 */
function openModal(_controller, _controllerArguments) {
	if(G.currentStackIndex !== 0) {
		setStack(0, {controller: _controller, controllerArguments: _controllerArguments});
	}
	else {
		G.navStacksObjs[0].open(_controller, _controllerArguments);
	}

};

/**
 * [close description]
 * @return {[type]} [description]
 */
function close(_callback) {
	if(G.currentStackIndex < 0) {
		LOGGER.error(__FILE__+"close() A current stack has not been set");
		return;
	}

	var Navigator = G.navStacksObjs[ G.currentStackIndex ];
	Navigator.close( function onCloseComplete(){
		if(Navigator.controllers.length===0){
			LOGGER.debug(__FILE__+"last controller closed so remove navigator object");
			G.navStacksObjs[ G.currentStackIndex ] = null;
			_callback && _callback();
		}
	});
};

/**
 * Navigate back in the current stack, unless we are already home
 * @return {[type]} [description]
 */
function navBack() {
	LOGGER.debug(__FILE__+"navBack()");

	// Only do if we are currently on a stack
	if(G.currentStackIndex < 0) {
		LOGGER.error(__FILE__+"navBack() A current stack has not been set");
		return;
	}

	var Navigator = G.navStacksObjs[ G.currentStackIndex ];
	
	// If we are a modal stack and only one controller exists then
	// close it and switch back to the stack prior to opening
	// the modal
	if(G.currentStackIndex===0 && Navigator.controllers.length===1) {
		LOGGER.debug(__FILE__+"Modal stack and only 1 screen in stack");
		
		close(function onCloseComplete(){
			setStack(G.previousStackIndex);
		});
	}
	else {
		if(Navigator.controllers.length>1){
			LOGGER.debug(__FILE__+"close as stack length ("+Navigator.controllers.length+") > 1");
			//LOGGER.debug( __FILE__+JSON.stringify(Navigator.controllers,null,2) )
			close();
		}
		else {
			LOGGER.debug(__FILE__+"navBack has done nothing");
		}
	}
};

/**
 * Get an image of the previous screen
 */
function getPreviousScreenImage() {
	if(G.currentStackIndex < 0) {
		LOGGER.error(__FILE__+"navBack() A current stack has not been set");
		return;
	}

	var Navigator = G.navStacksObjs[ G.currentStackIndex ];

	if(Navigator.controllers.length>1) {
		var underlyingControllerView = Navigator.controllers[that.controllers.length - 2].getView();
		var img = underlyingControllerView.toImage(null, true);
		var file = Ti.Filesystem.getFile(Ti.Filesystem.applicationDataDirectory,'lastscreen.png');
		file.write(img);
		return img;
	}
	else {
		return null;
	}

};

function getCurrentStackIndex() {
	return G.currentStackIndex;
};

// -------------------------------------------------
// Module exports
// -------------------------------------------------
exports.init = init;
exports.setStack = setStack;
exports.open = open;
exports.openModal = openModal;
//exports.close = close;
exports.navBack = navBack;
exports.getPreviousScreenImage = getPreviousScreenImage;
exports.getCurrentStackIndex = getCurrentStackIndex;
/*
OLD exports

exports.init = function(_params)
exports.handleNavigation = function(_id, _extra_params) {
exports.navBack = function() {
exports.getPreviousScreenImage = function() {
exports.addChild = function(_controller, _params, _modal, _overlay) {
exports.removeChild = function(_modal) {
exports.removeAllChildren = function(_modal) {
*/

/**
 * Stack-based navigation module which manages the navigation state and such for an app.
 * This particular module manages a stack of views added to a specific parent
 * most common in a one-window architecture.
 *
 * @class Navigation
 */

/**
 * The Navigation object
 * @param {Object} _args
 * @param {Object} _args.parent The parent which this navigation stack will belong
 * @constructor
 */
function Navigation(_args) {
	var that = this;

	_args = _args || {};

	/**
	 * Whether or not the navigation module is busy opening/closing a screen
	 * @type {Boolean}
	 */
	this.isBusy = false;

	/**
	 * The controller stack
	 * @type {Array}
	 */
	this.controllers = [];

	/**
	 * The current controller object reference
	 * @type {Controllers}
	 */
	this.currentController = null;

	/**
	 * The parent object all screen controllers are added to
	 * @type {Object}
	 */
	this.parent = _args.parent;

	/**
	 * Open a screen controller
	 * @param {String} _controller
	 * @param {Object} _controllerArguments The arguments for the controller (optional)
	 * @return {Controllers} Returns the new controller
	 */
	this.open = function(_controller, _controllerArguments) {
		if(that.isBusy) {
			return;
		}

		that.isBusy = true;

		function doViewIn() {
			var controller = Alloy.createController(_controller, _controllerArguments);

			that.controllers.push(controller);

			that.currentController = controller;

			that.parent.add(that.currentController.getView());

			// Handle if the current controller has an override way of opening itself
			if(that.currentController.open) {
				that.currentController.open();

				that.isBusy = false;
			} else {
				that.animateIn(that.currentController, "right");
			}

			// that.testOutput();

			return that.currentController;
		}

		// Handle removing the current controller from the screen
		if(that.currentController) {
			that.animateOut(that.currentController, "left", function onOutComplete() {
				// Maybe this is a related to the hack in original code, but
				// it solves the animate timeout errors
				Ti.API.trace(0);
				doViewIn();
			});
		}
		else {
			doViewIn();
		}

	};

	/**
	 * Close the controller at the top of the stack
	 * @param {Function} _callback
	 */
	this.close = function(_callback) {
		if(that.isBusy) {
			return;
		}

		that.isBusy = true;

		var outgoingController = that.currentController;
		var incomingController = that.controllers[that.controllers.length - 2];

		LOGGER.debug("incoming: " +JSON.stringify(incomingController) );
		LOGGER.debug("outgoing: " +JSON.stringify(outgoingController) );

		// Animate in the previous controller
		if(incomingController) {
			that.parent.add(incomingController.getView());

			if(incomingController.open) {
				incomingController.open();

				that.isBusy = false;
				doOut();
			} else {
				that.animateIn(incomingController, "left", function onAnimateInComplete(){
					Ti.API.trace(0);
					doOut();
				});
			}
		}
		else { // last in stack, just do out
			doOut();
		}

		function doOut(){
			that.animateOut(outgoingController, "right", function() {
				that.controllers.pop();

				outgoingController = null;

				// Assign the new current controller from the stack
				that.currentController = that.controllers[that.controllers.length - 1];

				if(_callback) {
					_callback();
				}

				// that.testOutput();
			});
		}
	};

	/**
	 * Hide the current controller stack, without removing it from the stack
	 * @param  {[type]} _callback [description]
	 * @return {[type]}           [description]
	 */
	this.hide = function(_callback) {
		if(that.isBusy) {
			return;
		}
		that.isBusy = true;

		if(that.currentController !== "undefined") {
			var outgoingController = that.currentController;
			that.animateOut(outgoingController, "right", function onAnimateOutComplete() {
				// Don't remove from the controller stack
				// and don't reset the current controller
				that.currentController = null;

				if(_callback) {
					_callback();
				}

				// that.testOutput();
			});
		}
	};

	/**
	 * Show the top level controller of this navigation stack
	 * @param  {[type]} _callback [description]
	 * @return {[type]}           [description]
	 */
	this.show = function(_callback) {
		if(that.isBusy) {
			return;
		}
		that.isBusy = true;

		// Only show if the top level controller was previously hidden
		// and there is a valid top level controller
		
		var incomingController = that.controllers[that.controllers.length - 1];

		if(that.currentController === null && typeof incomingController !== "undefined") {
			Ti.API.debug("Showing current controller");
			
			that.parent.add(incomingController.getView());

			that.currentController = incomingController;

			if(incomingController.open) {
				incomingController.open();

				that.isBusy = false;
			} else {
				that.animateIn(incomingController, "left", function onAnimateInComplete(){
					if(_callback) {
						_callback();
					}
				});
			}

		}

	};

	/**
	 * Close all controllers except the first in the stack
	 * @param {Function} _callback
	 */
	this.closeToHome = function(_callback) {
		if(that.isBusy || that.controllers.length == 1) {
			return;
		}

		that.isBusy = true;

		var outgoingController = that.currentController;
		var incomingController = that.controllers[0];

		// Animate in the previous controller
		if(incomingController) {
			that.parent.add(incomingController.getView());

			if(incomingController.open) {
				incomingController.open();

				that.isBusy = false;
			} else {
				that.animateIn(incomingController, "left");
			}
		}

		that.animateDisappear(outgoingController, function() {
			that.controllers.splice(1, that.controllers.length - 1);

			outgoingController = null;

			// Assign the new current controller from the stack
			that.currentController = that.controllers[0];

			if(_callback) {
				_callback();
			}

			// that.testOutput();
		});
	};

	/**
	 * Close all controllers
	 */
	this.closeAll = function() {
		for(var i = 0, x = that.controllers.length; i < x; i++) {
			that.parent.remove(that.controllers[i].getView());
		}

		that.controllers = [];
		that.currentController = null;

		that.isBusy = false;

		// that.testOutput();
	};

	/**
	 * Animate out a screen controller using opacity
	 * @param {Controllers} _controller
	 * @param {Function} _callback
	 */
	this.animateDisappear = function(_controller, _callback) {
		if(OS_IOS || OS_ANDROID) {
			var animation = Ti.UI.createAnimation({
				transform: Ti.UI.create2DMatrix({
					scale: 0
				}),
				opacity: 0,
				curve: Ti.UI.ANIMATION_CURVE_EASE_IN,
				duration: 300
			});

			animation.addEventListener("complete", function onComplete() {
				for(var i = 0, x = that.controllers.length; i > 1 && i < x; i++) {
					that.parent.remove(that.controllers[i].getView());
				}

				that.isBusy = false;

				if(_callback) {
					_callback();
				}

				animation.removeEventListener("complete", onComplete);
			});

			_controller.getView().animate(animation);
		} else {
			for(var i = 0, x = that.controllers.length; i > 1 && i < x; i++) {
				that.parent.remove(that.controllers[i].getView());
			}

			that.isBusy = false;

			if(_callback) {
				_callback();
			}
		}
	};

	/**
	 * Animate in a screen controller
	 * @param {Controllers} _controller
	 * @param {String} _direction left || right
	 * @param {Function} _callback
	 */
	this.animateIn = function(_controller, _direction, _callback) {
		if(OS_IOS || OS_ANDROID) {
			var animation = Ti.UI.createAnimation({
				opacity: 1,
				duration: 300
			});

			animation.addEventListener("complete", function onComplete() {
				that.isBusy = false;

				if(_callback) {
					_callback();
				}

				animation.removeEventListener("complete", onComplete);
			});

			// WEIRD hack to ensure the animation below works on iOS.
			Ti.API.trace(that.parent.size.width);

			if(OS_IOS) {
				_controller.getView().left = (_direction === "left") ? -that.parent.size.width : that.parent.size.width;

				animation.left = 0;
			}

			_controller.getView().animate(animation);
		} else {
			that.isBusy = false;

			if(_callback) {
				_callback();
			}
		}
	};

	/**
	 * Animate out a screen controller
	 * @param {Controllers} _controller
	 * @param {String} _direction left || right
	 * @param {Function} _callback
	 */
	this.animateOut = function(_controller, _direction, _callback) {
		if(OS_IOS || OS_ANDROID) {
			var animation = Ti.UI.createAnimation({
				opacity: 0,
				duration: 300
			});

			animation.addEventListener("complete", function onComplete() {
				that.parent.remove(_controller.getView());

				that.isBusy = false;

				if(_callback) {
					_callback();
				}

				animation.removeEventListener("complete", onComplete);
			});

			animation.left = (_direction === "left") ? -that.parent.size.width : that.parent.size.width;

			_controller.getView().animate(animation);
		} else {
			that.parent.remove(_controller.getView());

			that.isBusy = false;

			if(_callback) {
				_callback();
			}
		}
	};

	/**
	 * Spits information about the navigation stack out to console
	 */
	this.testOutput = function() {
		var stack = [];

		for(var i = 0, x = that.controllers.length; i < x; i++) {
			if(that.controllers[i].getView().controller) {
				stack.push(that.controllers[i].getView().controller);
			}
		}

		Ti.API.debug("Navigator Stack Length: " + that.controllers.length);
		Ti.API.debug(JSON.stringify(that.controllers));
		Ti.API.debug(JSON.stringify(stack));
	};
}

// // Calling this module function returns a new navigation instance
// module.exports = function(_args) {
// 	return new Navigation(_args);
// };