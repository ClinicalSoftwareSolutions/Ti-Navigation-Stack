/**
 Copyright Neville Dastur (Clinical Software Solutions Ltd)
 All rights reserved

 See the file "LICENSE" for the full license governing this code.
 */

var args = arguments[0] || {};

var APP = require("core");  // GET THE SINGLETON
var LOGGER = require('logger');

var child_number = args.child_number || 1;
var current_stack = APP.Stack.getCurrentStackIndex();

$.heading.text = "Stack number " + current_stack + ". Child number " + child_number;

// Tapping demonstrates opening a new screen controller
$.openChild.addEventListener("click", function() {
	var colors = ["red", "green", "white", "navy"];

	APP.Stack.open("new_view", {
		backgroundColor: colors[Math.floor(Math.random() * colors.length)],
		child_number: child_number+1
	});
});

$.openModal.addEventListener('click', function(){
	APP.Stack.openModal("modal_view");
});

$.close.addEventListener('click', function(){
	APP.Stack.navBack();
});

$.wrapper.addEventListener('swipe', function(e){
	LOGGER.debug("swipe to "+e.direction+' on stack ' + current_stack + ' child ' + child_number);
	
	if(e.direction === "down"){	
		APP.Stack.setStack(current_stack+1);
	}

	if(e.direction === "up"){	
		APP.Stack.setStack(current_stack-1);
	}

});

