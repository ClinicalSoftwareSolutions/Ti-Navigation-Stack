/*
 * A window stack controller library
 * Copyright Neville Dastur 2013
 */

var Alloy = require("alloy");
var _ = require('alloy/underscore');
var APP = require('core');
var LOGGER = require('logger');

/**
 * The stack controller
 */
var gSTACK = {
	currentStack: -1,
	previousScreen: null,
	controllerStacks: [],
	modalStack: [],
	hasDetail: false,
	currentDetailStack: -1,
	previousDetailScreen: null,
	detailStacks: [],
	Master: [],
	Detail: []
};

var gContentView = null;
var gMainWindow = null;
var gNavBar = null;
var gSTACK_PARAMS = {};

exports.init = function(_params) {
	gContentView = _params.view;
	if(!gContentView) { Ti.API.error("Window Stack - A view to place content into must be passed.");}

	gMainWindow = _params.window;
	if(!gMainWindow) { Ti.API.error("Window Stack - The main window of the application must be passed.");}

	if(!_params.stacks || _params.stacks.length === 0) {
		Ti.API.debug("Nothing to init stack with");
	}
	else {
		gSTACK_PARAMS = _.clone(_params.stacks);
	}

	if(OS_ANDROID) {
		gMainWindow.addEventListener("androidback", backButtonHandler);
	}

};

/**
 * Global event handler to change screens
 * @param {String} [_id] The ID (index) of the STACK being opened
 */
exports.handleNavigation = function(_id, _extra_params) {
	LOGGER.debug(__FILE__+'handleNavigation');

	if(typeof _id === "string") {
		for(var i=gSTACK_PARAMS.length-1; i>=0; i--) {
			if( gSTACK_PARAMS[i].title === _id) {
				_id = gSTACK_PARAMS[i].id;
				break;
			}
		}

		if(typeof _id === "string") {
			Ti.API.error("Stack.handleNavigation | Invalid string id was passed");
			return;
		}
	}

	Ti.API.debug("Stack.handleNavigation | " + gSTACK_PARAMS[_id].controller + " extraParams: " + JSON.stringify(_extra_params));

	// Requesting same screen as we're on
	if(_id == gSTACK.currentStack) {
		// Do nothing
		return;
	} else {
		// Fire hook saying STACK about to change
		// This originally Closes any loading screens
		Ti.App.fireEvent("app:StackChanging", {index: _id, previousIndex: gSTACK.currentStack});

		// Set current stack
		gSTACK.currentStack = _id;

		// Create new controller stack if it doesn't exist
		if(typeof gSTACK.controllerStacks[_id] === "undefined") {
			gSTACK.controllerStacks[_id] = [];
		}

		if(Alloy.isTablet) {
			gSTACK.currentDetailStack = _id;

			if(typeof gSTACK.detailStacks[_id] === "undefined") {
				gSTACK.detailStacks[_id] = [];
			}
		}

		// Set current controller stack
		var controllerStack = gSTACK.controllerStacks[_id];

		// If we're opening for the first time, create new screen
		// Otherwise, add the last screen in the stack (screen we navigated away from earlier on)
		var screen;

		gSTACK.hasDetail = false;
		gSTACK.previousDetailScreen = null;

		if(controllerStack.length > 0) {
			// Retrieve the last screen
			if(Alloy.isTablet) {
				screen = controllerStack[0];

				if(screen.type == "tablet") {
					gSTACK.hasDetail = true;
				}
			} else {
				screen = controllerStack[controllerStack.length - 1];
			}

		} else {
			// Create a new screen
			var controller = gSTACK_PARAMS[_id].controller.toLowerCase();
			var params = _(gSTACK_PARAMS[_id]).extend(_extra_params);
			LOGGER.log("debug", "Stack::handleNavigation - creating controller with: " + JSON.stringify(params));

			screen = Alloy.createController(controller, params).getView();
			var screenParams = {
				__CSSWS__params : {
					controller: controller,
					isModal: false,
					isOverlayed: false
				}
			};
			_.extend( screen, screenParams );

			// Add screen to the controller stack
			controllerStack.push(screen);
		}

		// Add the screen to the window
		addScreen(screen);

		// Reset the modal stack
		gSTACK.modalStack = [];

		if (gNavBar) {
			gNavBar.showBack( {visible: controllerStack.length>1 ? true : false } );
		}

		Ti.App.fireEvent("app:StackChanged", {index: _id});
	}
};

/**
 * Navigate back in the chain
 */
exports.navBack = function() {
	backButtonHandler();
};

/**
 * Get an image of the previous screen
 */
exports.getPreviousScreenImage = function() {
	if(gSTACK.previousScreen) {
		// Get an image of the previous screen
		var img = gSTACK.previousScreen.toImage(null, true);
		var file = Ti.Filesystem.getFile(Ti.Filesystem.applicationDataDirectory,'lastscreen.png');
		file.write(img);
		return img;
	}
	else {
		return null;
	}
};

/**
 * Back button handler
 * @param {Object} _event Standard Titanium event callback
 */
var backButtonHandler = function(_event) {
	Ti.API.debug("STACK.backButtonHandler");

	if(gSTACK.modalStack.length > 0) {
		exports.removeChild(true);
		return;
	} else {
		var stack;

		if(Alloy.isHandheld || !gSTACK.hasDetail) {
			stack = gSTACK.controllerStacks[gSTACK.currentStack];
		} else {
			stack = gSTACK.detailStacks[gSTACK.currentDetailStack];
		}

		if(stack.length > 1) {
			exports.removeChild();
		} else {
			gMainWindow.close();
		}
	}
};

/**
 * Open a child screen
 * @param {String} [_controller] The name of the controller to open
 * @param {Object} [_params] An optional dictionary of parameters to pass to the controller
 * @param {Boolean} [_modal] Whether this is for the modal stack
 * @param {Boolean} [_overlay] Whether this view should be overlayed
 */
exports.addChild = function(_controller, _params, _modal, _overlay) {
	_modal = _modal || false;
	_overlay = _overlay || false;
	_params = _params || {};

	Ti.API.debug("STACK.addChild | " + _controller + ". Params: " + JSON.stringify(_params) + " Modal: "+_modal + " Overlay: " + _overlay );
	var stack;

	// Determine if stack is associated with a stack
	if(_modal) {
		stack = gSTACK.modalStack;
	} else {
		if(Alloy.isHandheld || !gSTACK.hasDetail) {
			stack = gSTACK.controllerStacks[gSTACK.currentStack];
		} else {
			stack = gSTACK.detailStacks[gSTACK.currentDetailStack];
		}
	}

	// Create the new screen controller
	var screen = Alloy.createController(_controller, _params).getView();
	var screenParams = {
		__CSSWS__params : {
			controller: _controller,
			isModal: _modal,
			isOverlayed: _overlay
		}
	};
	_.extend( screen, screenParams );

	// Add screen to the controller stack
	stack.push(screen);

	// Add the screen to the window
	if(Alloy.isHandheld || !gSTACK.hasDetail || _modal) {
		addScreen(screen);
		Ti.App.fireEvent("APP:screenAdded");
	} else {
		addDetailScreen(screen);
		Ti.App.fireEvent("APP:detailScreenAdded");
	}

	if (gNavBar) {
		gNavBar.showBack( {visible: stack.length>1 ? true : false } );
	}

	if(_modal && gSTACK.modalStack.length === 1) {
		Ti.App.fireEvent('APP:StackModalOpened');
	}

	return screen;
};

/**
 * Removes a child screen
 * @param {Boolean} [_modal] Removes the child from the modal stack
 */
exports.removeChild = function(_modal) {
	Ti.API.debug("STACK.removeChild | Modal: " + _modal);
	var stack;

	if(_modal) {
		stack = gSTACK.modalStack;
	} else {
		if(Alloy.isTablet && gSTACK.hasDetail) {
			stack = gSTACK.detailStacks[gSTACK.currentDetailStack];
		} else {
			stack = gSTACK.controllerStacks[gSTACK.currentStack];
		}
	}

	var screen = stack[stack.length - 1];
	var previousStack;
	var previousScreen;

	stack.pop();

	if(stack.length === 0) {
		previousStack = gSTACK.controllerStacks[gSTACK.currentStack];

		if(Alloy.isHandheld || !gSTACK.hasDetail) {
			previousScreen = previousStack[previousStack.length - 1];

			addScreen(previousScreen);
		} else {
			previousScreen = previousStack[0];

			if(_modal) {
				addScreen(previousScreen);
			} else {
				addDetailScreen(previousScreen);
			}
		}
	} else {
		previousScreen = stack[stack.length - 1];

		if(Alloy.isHandheld || !gSTACK.hasDetail) {
			addScreen(previousScreen);
		} else {
			if(_modal) {
				addScreen(previousScreen);
			} else {
				addDetailScreen(previousScreen);
			}
		}
	}

	if (gNavBar) {
		gNavBar.showBack( {visible: stack.length>1 ? true : false } );
	}

	if(_modal && gSTACK.modalStack.length === 0) {
		Ti.App.fireEvent('APP:StackModalClosed');
	}

};

/**
 * Removes all children screens
 * @param {Boolean} [_modal] Removes all children from the modal stack
 */
exports.removeAllChildren = function(_modal) {
	Ti.API.debug("STACK.removeAllChild | Modal: " + _modal);
	var stack = _modal ? gSTACK.modalStack : gSTACK.controllerStacks[gSTACK.currentStack];

	for(var i = stack.length - 1; i > 0; i--) {
		stack.pop();
	}

	addScreen(stack[0]);

	if (NavBar) {
		NavBar.showBack( {visible: false } );
	}
};

/**
 * Global function to add a screen
 * @param {Object} [_screen] The screen to add
 */
var addScreen = function(_screen) {
	Ti.API.debug("STACK.addScreen");

	if(_screen) {
		var screenParams = _screen.__CSSWS__params || {};
		Ti.API.debug("STACK.addScreen. __CSSWS__params: " + JSON.stringify(screenParams));

		// if(OS_IOS){
		// 	var inAnimation=false;
		// 	gContentView.add(_screen);
		// 	//_screen.addEventListener('postlayout',function(e){
		// 	//	if(inAnimation) return;
		// 		inAnimation=true;
		// 		gContentView.left = '320dp';
		// 		gContentView.animate({
	 //   				//view: _screen,
	 //   				left: '0dp',
	 //   				duration: 250,
	 //   				curve: Ti.UI.ANIMATION_CURVE_EASE_IN_OUT
	 //   				//transition:Ti.UI.iPhone.AnimationStyle.FLIP_FROM_RIGHT
		// 		});				
		// 	//});
		// }
		// else {
			gContentView.add(_screen);
//		}

		if(gSTACK.previousScreen) {
			removeScreen(gSTACK.previousScreen);
		}

		gSTACK.previousScreen = _screen;

		_screen.fireEvent("screenAdd");
	}
	else {
		Ti.API.debug("STACK.addScreen | Screen object not valid");	
	}
};

/**
 * Global function to remove a screen
 * @param {Object} [_screen] The screen to remove
 */
var removeScreen = function(_screen) {
	Ti.API.debug("STACK.removeScreen");
	if(_screen) {
		var screenParams = _screen.__CSSWS__params || {};
		Ti.API.debug("STACK.removeScreen. __CSSWS__params: " + JSON.stringify(screenParams));
		
		_screen.fireEvent('screenClose');

		gContentView.remove(_screen);

		gSTACK.previousScreen = null;
	}
	else {
		Ti.API.debug("STACK.removeScreen | Screen object not valid");		
	}
};

/**
 * Adds a screen to the Master window
 * @param {String} [_controller] The name of the controller to open
 * @param {Object} [_params] An optional dictionary of parameters to pass to the controller
 * @param {Object} [_wrapper] The parent wrapper screen to fire events to
 */
var addMasterScreen = function(_controller, _params, _wrapper) {
	var screen = Alloy.createController(_controller, _params).getView();

	_wrapper.addEventListener("APP:tabletScreenAdded", function(_event) {
		screen.fireEvent("APP:screenAdded");
	});

	gSTACK.Master[gSTACK.currentStack].add(screen);
};

/**
 * Adds a screen to the Detail window
 * @param {Object} [_screen] The screen to add
 */
var addDetailScreen =  function(_screen) {
	Ti.API.debug("SATCK.addDetailScreen");

	if(_screen) {
		gSTACK.Detail[gSTACK.currentStack].add(_screen);

		if(gSTACK.previousDetailScreen && gSTACK.previousDetailScreen != _screen) {
			var pop = true;

			if(gSTACK.detailStacks[gSTACK.currentDetailStack][0].type == "PARENT" && _screen.type != "PARENT") {
				pop = false;
			}

			removeDetailScreen(gSTACK.previousDetailScreen, pop);
		}

		gSTACK.previousDetailScreen = _screen;
	}
};

/**
 * Removes a screen from the Detail window
 * @param {Object} [_screen] The screen to remove
 * @param {Boolean} [_pop] Whether to pop the item off the controller stack
 */
var removeDetailScreen = function(_screen, _pop) {
	Ti.API.debug("STACK.removeDetailScreen");

	if(_screen) {
		gSTACK.Detail[gSTACK.currentStack].remove(_screen);

		gSTACK.previousDetailScreen = null;

		if(_pop) {
			var stack = gSTACK.detailStacks[gSTACK.currentDetailStack];

			stack.splice(0, stack.length - 1);
		}
	}
};
