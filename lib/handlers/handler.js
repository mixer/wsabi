'use strict';

const EventEmitter = require('events').EventEmitter;
const util = require('util');

/**
 * The response object sent to sockets. It's subset of the "res" sent from
 * the .inject method. Note that binary data will not be accepted and lead
 * to undefined behaviour.
 *
 * @access public
 * @typedef {Object} Response
 * @property {Number} statusCode
 * @property {Object} headers
 * @property {String} payload
 * @see http://hapijs.com/api#serverinjectoptions-callback
 */

/**
 * The callback, send in the "request" event, should be called when the
 * response is prepared to be sent down to the client. It takes, as its
 * first and only argument, a Response object.
 *
 * @access public
 * @callback RequestCallback
 * @typedef {Object} Response
 */

/**
 * This is triggered when a response is sent. That is, when a callback
 * is called from a Handler.
 *
 * @access public
 * @event Handler#response
 * @param {Response}
 */

/**
 * The request event is sent whenever the socket sends up a *valid* HTTP
 * request that should be emulated. Notably, in the request, the "headers"
 * will be merged in with the headers used originally to send the request,
 * so you don't need to worry about resending session information.
 *
 * Also, if there are cookie updates sent down the socket, we'll take care
 * of them, but cookie updates you may get if you use standard HTTP in
 * parallel with this will not be recorded.
 *
 * The event data will be well-formed "options" suitable for use in the
 * Hapi "inject" method, as well as a callback function.
 *
 * @access public
 * @event Handler#request
 * @type {Object}
 * @property {String} method The request method (GET, POST, etc)
 *                           of the request.
 * @property {String} url    The path or fully qualified URL the request is
 *                           sent to.
 * @property {Object.<String, *>=} headers Key/value header information
 * @property {Object.<String, *>=} payload The request body.
 * @property {RequestCallback} The request callback to trigger after we're
 *                             all done.
 * @see http://hapijs.com/api#serverinjectoptions-callback
 */


/**
 * Base class that handlers extend from. Essentially they're responsible
 * for parsing incoming requests from sockets, and dispensing replies
 * back out.
 *
 * @interface
 * @access protected
 * @param {SocketIO.Socket} socket
 */
function Handler(socket) {
    EventEmitter.call(this);
    this.socket = socket;
    this.open = false;
}
util.inherits(Handler, EventEmitter);

/**
 * Called when the socket is open and ready to get messages.
 * @access public
 */
Handler.prototype.boot = function () {
    this.open = true;
};

/**
 * Called when the socket is closed. No messages should be sent
 * or received after this time.
 * @access public
 */
Handler.prototype.close = function () {
    this.open = false;
    this.removeAllListeners();
};

/**
 * List of valid HTTP methods.
 * @type {String[]}
 */
const methods = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'];

/**
 * Validates and dispatches an outgoing request, returning an string error if
 * invalid, emitting an event otherwise.
 *
 * @access protected
 * @fires Handler#request
 * @param  {Object} req
 * @return {String|Undefined}
 */
Handler.prototype.dispatch = function (req) {
    // Make sure basic stuff is correct.
    if (methods.indexOf(req.method) === -1) return 'Invalid method.';
    if (typeof req.url !== 'string') return 'Invalid URL.';
    if (typeof req.headers !== 'object') return 'Invalid headers.';

    // Disallow internal settings that could screw things up.
    if (req.credentials || req.simulate) return 'Invalid request.';

    // Make sure keys are strings, not anything bizarre.
    for (const key in req.headers) {
        if (typeof key !== 'string' || typeof req.headers[key] !== 'string') {
            return 'Invalid headers.';
        }
    }

    // At this point, we're good. Emit it!
    this.emit('request', req);
};

module.exports = Handler;
