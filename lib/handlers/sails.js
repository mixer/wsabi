var Hoek = require('hoek');
var Handler = require('./handler');

var assert = require('assert');
var bind = require('../util').bind;
var util = require('util');

/**
 * Valid event/method names that Sails.io.js can send.
 * Based on the code in http://git.io/vvVs4.
 * @access private
 * @type {String[]}
 */
var events = ['get', 'post', 'put', 'delete', 'patch', 'options', 'head'];

/**
 * Handler for the Sails socket protocol. This was originally designed
 * as we were porting from Sails to Hapi, so this is backwards compatible
 * with the Sails.io.js 0.11 protocl.
 *
 * @constructor
 * @access public
 * @augments Handler
 */
function SailsHandler() {
    Handler.apply(this, arguments);
}
util.inherits(SailsHandler, Handler);

SailsHandler.prototype.boot = function () {
    Handler.prototype.boot.call(this);

    var fn = bind(this.onRequest, this);
    for (var i = 0; i < events.length; i++) {
        this.socket.on(events[i], fn);
    }
};

/**
 * This method is called when we get a socket request. We validate the
 * incoming event, and fire a request event if it's valid.
 * @access private
 * @fires Handler#request
 * @param  {Object}   ev
 * @param  {Function} callback
 */
SailsHandler.prototype.onRequest = function (ev, callback) {
    var request = {
        method: ev.method,
        url: ev.url,
        headers: ev.headers || {},
        payload: ev.payload || undefined,

        callback: function (response) {
            var body = response.payload;
            try {
                body = JSON.parse(body);
            } catch (e) {}

            callback(undefined, {
                body: body,
                headers: response.headers,
                statusCode: response.statusCode
            });
        }
    };

    var err = validate(request);
    if (err) return callback(err);

    this.emit('request', request);
};

/**
 * Helper function to validate a request. Returns nothing if it is
 * valid, or a string if invalid.
 *
 * @access private
 * @param  {Object} r
 * @return {Undefined|String}
 */
function validate (r) {
    if (events.indexOf(r.method) === -1) return 'Invalid method.';
    if (typeof r.url !== 'string')       return 'Invalid URL.';
    if (typeof r.headers !== 'object')   return 'Invalid headers.';

    for (var key in r.headers) {
        if (typeof key !== 'string' || typeof r.headers[key] !== 'string') {
            return 'Invalid headers.';
        }
    }
}

module.exports = SailsHandler;
