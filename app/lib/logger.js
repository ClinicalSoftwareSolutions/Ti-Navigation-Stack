/*
 * Unified logging
 * Also acts as a proxy to analytics
 */

exports.log = function(_severity, _text, _forAnalytics ,_data) {
	_data = _data || {};
	_forAnalytics = _forAnalytics || false;

	switch(_severity.toLowerCase()) {
			case "debug":
				if(Ti.App.deployType === "development" || Ti.App.deployType === "test") {
					Ti.API.debug(_text);
				}
				break;
			case "error":
				if(Ti.App.deployType === "development" || Ti.App.deployType === "test") {
					Ti.API.error(_text);
				}
				break;
			case "info":
				if(Ti.App.deployType === "development" || Ti.App.deployType === "test") {
					Ti.API.info(_text + JSON.stringify(_data,null,2));
				}
				break;
			case "trace":
				Ti.API.trace(_text);
				break;
			case "warn":
				Ti.API.warn(_text);
				break;
			default:
				Ti.API.error("*** ERROR IN LOGGER - unknown severity type ("+_severity+") ***");
				break;
	}
};

exports.debug = function(_text, _forAnalytics, _data) {
	exports.log('debug',_text, _forAnalytics, _data);
}

exports.error = function(_text, _forAnalytics, _data) {
	exports.log('error',_text, _forAnalytics, _data);
}

exports.info = function(_text, _forAnalytics, _data) {
	exports.log('info',_text, _forAnalytics, _data);
}

exports.trace = function(_text, _forAnalytics, _data) {
	exports.log('trace',_text, _forAnalytics, _data);
}

exports.warn = function(_text, _forAnalytics, _data) {
	exports.log('warn',_text, _forAnalytics, _data);
}
