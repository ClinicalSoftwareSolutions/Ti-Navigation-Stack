
var __FILE__ = "core.js(lib) | ";

var Alloy = require("alloy");
var LOGGER = require('logger');

var APP = {
	/**
	 * Device information
	 */
	Device: {
		isHandheld: Alloy.isHandheld,
		isTablet: Alloy.isTablet,
		type: Alloy.isHandheld ? "handheld" : "tablet",
		os: null,
		name: null,
		version: Ti.Platform.version,
		versionMajor: parseInt(Ti.Platform.version.split(".")[0], 10),
        versionMinor: parseInt(Ti.Platform.version.split(".")[1], 10),
        width: Ti.Platform.displayCaps.platformWidth > Ti.Platform.displayCaps.platformHeight ? Ti.Platform.displayCaps.platformHeight : Ti.Platform.displayCaps.platformWidth,
		height: Ti.Platform.displayCaps.platformWidth > Ti.Platform.displayCaps.platformHeight ? Ti.Platform.displayCaps.platformWidth : Ti.Platform.displayCaps.platformHeight,
		dpi: Ti.Platform.displayCaps.dpi,
		orientation: Ti.Gesture.orientation == Ti.UI.LANDSCAPE_LEFT || Ti.Gesture.orientation == Ti.UI.LANDSCAPE_RIGHT ? "LANDSCAPE" : "PORTRAIT",
		statusBarOrientation: null
	},

	/**
	 * Set to true if on device that is iOS >+ 7. Mainly as need to add 20 to top if so
	 */ 
	isiOS7Plus: false,
	
	/**
	 * The main app window
	 * @type {Object}
	 */
	MainWindow: null,
	
	/**
	 * The global view all screen controllers get added to
	 */
	GlobalWrapper: null,
	
	/**
	 * The global view all content screen controllers get added to
	 */
	ContentWrapper: null,
	
	/**
	 * The window stack
	 */
	Stack: null,
	

	/**
     * Determines the device characteristics
     */
    determineDevice: function() {
    	if(OS_IOS) {
    		APP.isiOS7Plus = (APP.Device.versionMajor >= 7) ? true : false;

            APP.Device.os = "IOS";

            if(Ti.Platform.osname.toUpperCase() == "IPHONE") {
                APP.Device.name = "IPHONE";
            } else if(Ti.Platform.osname.toUpperCase() == "IPAD") {
                APP.Device.name = "IPAD";
            }
        } else if(OS_ANDROID) {
            APP.Device.os = "ANDROID";

            APP.Device.name = Ti.Platform.model.toUpperCase();

            // Fix the display values
            APP.Device.width = (APP.Device.width / (APP.Device.dpi / 160));
            APP.Device.height = (APP.Device.height / (APP.Device.dpi / 160));
        }
    },

	/**
	 * Initiate functions
	 */
	init: function() {
		LOGGER.log('debug', "APP.init");
		LOGGER.log('debug', "Deploytype = "+Ti.App.deployType);
		//Ti.API.debug("Alloy.CFG = " + JSON.stringify(Alloy.CFG,null,2) );

		APP.determineDevice();

		// Set up the window stack
		APP.Stack = require('nav_stack');

		if (APP.isiOS7Plus ===true) {
			APP.MainWindow.setTop(20);
			Ti.UI.setBackgroundColor('white');	// To see status bar
		}


		APP.MainWindow.addEventListener('open',function(){
			APP.Stack.setStack(1);
		});
		
		APP.initMainWindow();
	},

	/**
	 * Init the app for normal startup
	 */
	initMainWindow: function() {
		Ti.API.debug("APP.initMainWindow");

		APP.Stack.init({
			window: APP.MainWindow,
			view: APP.GlobalWrapper,
			stacks: [
			{
				"title": "Stack One",
				"controller": "new_view",
				"params": { stackname: "One" }
			},
			{
				"title": "Stack Two",
				"controller": "new_view",
				"params": { stackname: "Two" }
			},
			{
				"title": "Stack Three",
				"controller": "new_view",
				"params": { stackname: "Three" }
			},
			]
		});

		APP.MainWindow.open();
	},
};

module.exports = APP;
