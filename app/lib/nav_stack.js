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
		var ctrlView = controller.getView();

		var scrollableView = Ti.UI.createScrollableView({
	    	showPagingControl: false,
	    	scrollingEnabled: false,
	    	opacity: 0,
	    	top: 0, left: 0,
	    	height: Ti.UI.FILL,
	    	width: Ti.UI.FILL,
	    	currentPage:0,
	    	views: [ctrlView]
		});

		G.navStacksObjs[_index] = scrollableView;
		LOGGER.debug(__FILE__+"createScrollableViewContainer done. Current page="+scrollableView.getCurrentPage());

		// Add to the GlobalView
		G.ContentView.add( scrollableView );
	}
};

function getNumberOfPages() {
	// Only open if a current stack has been set
	if(G.currentStackIndex < 0) {
		LOGGER.error(__FILE__+"open() A current stack has not been set");
		return;
	}

	var ScrollableView = G.navStacksObjs[G.currentStackIndex];
	return ScrollableView.getViews().length;
};

function toPage(index) {
	var ScrollableView = G.navStacksObjs[G.currentStackIndex];
	LOGGER.debug(__FILE__+"scrolling toPage() "+index);
	ScrollableView.scrollToView(index);	
}
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
	if(!_controller){
		LOGGER.error(__FILE__+'a controller name is required');
		return;
	}

	if(_modal) {
		openModel(_controller, _controllerArguments);
		return;
	}

	// Only open if a current stack has been set
	if(G.currentStackIndex < 0) {
		LOGGER.error(__FILE__+"open() A current stack has not been set");
		return;
	}

	var ScrollableView = G.navStacksObjs[G.currentStackIndex];
	var controllerArguments = _controllerArguments || {};

	LOGGER.debug(__FILE__+'open() on current stack: ' +G.currentStackIndex + 
		' Creating controller: '+_controller+
		' with args: '+ JSON.stringify(controllerArguments) );
	LOGGER.debug(__FILE__+"open() pre-scrollTo current page now " + ScrollableView.getCurrentPage() );

	var controller = Alloy.createController(_controller, controllerArguments);
	var ctrlView = controller.getView();
	ScrollableView.addView( ctrlView );
	ScrollableView.scrollToView( getNumberOfPages()-1 );
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

	var ScrollableView = G.navStacksObjs[G.currentStackIndex];
	var currentPage = getNumberOfPages()-1;

	LOGGER.debug(__FILE__+"close() number of pages " + getNumberOfPages() );

	var pageToScrollTo = currentPage-1;
	LOGGER.debug(__FILE__+"close() scrolling to page " + pageToScrollTo );
	ScrollableView.scrollToView( pageToScrollTo );

	ScrollableView.addEventListener('scrollend',function(e){
		LOGGER.debug(__FILE__+"close() removingView on page " + currentPage );
		ScrollableView.removeView( currentPage );

		ScrollableView.removeEventListener('scrollend', arguments.callee);
	});


	_callback && _callback();
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

	var ScrollableView = G.navStacksObjs[G.currentStackIndex];
	
	// If we are a modal stack and only one controller exists then
	// close it and switch back to the stack prior to opening
	// the modal
	if(G.currentStackIndex===0 && ScrollableView.getCurrentPage() === 1) {
		LOGGER.debug(__FILE__+"Modal stack and only 1 screen in stack");
		
		close(function onCloseComplete(){
			LOGGER.debug(__FILE__+'onCloseComplete()');
			setStack(G.previousStackIndex);
		});
	}
	else {
		if(ScrollableView.getCurrentPage() >= 1){
			LOGGER.debug(__FILE__+"close as stack current page ("+ScrollableView.getCurrentPage()+") >= 1");
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
exports.toPage = toPage;

