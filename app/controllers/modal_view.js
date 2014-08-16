/**
 Copyright Neville Dastur (Clinical Software Solutions Ltd)
 All rights reserved

 See the file "LICENSE" for the full license governing this code.
 */

var args = arguments[0] || {};

var APP = require("core");  // GET THE SINGLETON
var LOGGER = require('logger');

// Tapping demonstrates opening a new screen controller
$.close.addEventListener("click", function() {
	APP.Stack.navBack();
});
