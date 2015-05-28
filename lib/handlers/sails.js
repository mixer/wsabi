var Boom = require('boom');
var Handler = require('./handler');

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
 * @param  {Object}   ev
 * @param  {Function} callback
 */
SailsHandler.prototype.onRequest = function (ev, callback) {
    ev = ev || {};

    var request = {
        method:   String(ev.method).toUpperCase(),
        url:      ev.url,
        headers:  ev.headers || {},
        payload:  ev.data || undefined,
        callback: this.respond(callback)
    };

    var err = this.dispatch(request);
    if (err) request.callback(Boom.badRequest(err).output);
};

/**
 * Generator for a "response" function. When invoked with a standard
 * response, it parses the response and sends down a Sails-compatible
 * reply in the callback.
 *
 * @param  {Function} callback
 * @return {Function}
 */
SailsHandler.prototype.respond = function (callback) {
    return function (response) {
        // Use the rawPayload and turn it to a utf8 string - Hapi
        // seems to have issues with special characters.
        var body = response.rawPayload.toString('utf8');
        try {
            body = JSON.parse(body);
        } catch (e) {
            // ignore parsing errors
        }

        callback({
            body:       body,
            headers:    response.headers,
            statusCode: response.statusCode
        });
    };
};

module.exports = SailsHandler;
