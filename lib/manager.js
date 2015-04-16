var Hoek = require('hoek');
var Jar = require('tough-cookie').CookieJar;
var lowerKeys = require('./util').lowerKeys;

/**
 * The manager is responsible for handling the websocket connection and
 * ferrying data between the connection and Hapi.
 *
 * @access public
 * @param {Hapi.Server} server
 * @param {SocketIO.Socket} socket
 * @param {Object} config
 */
function Manager(server, socket, config) {
    this.server = server;
    this.socket = socket;
    this.config = config;
    this.handler = this.detectVersion();


    // The address the cookies are on. Doesn't really matter at all.
    this.uri = this.server.uri || 'http://example.com';

    if (this.config.cookies) {
        // Handle cookies for the session in this nice jar.
        this.jar = new Jar();
        // Start handling.
        this.updateCookies(socket.handshake.headers, 'cookie');
    }
}

/**
 * Boots up the manager and starts listening on the connection.
 * @access public
 */
Manager.prototype.boot = function () {
    var $ = this;

    // When the handler tells us we have a request, inject it into the
    // server and wait for the response.
    $.handler.on('request', function (req) {
        req.headers = lowerKeys(req.headers);
        req.headers['x-wsabi-socket'] = $.socket;
        $.syncCookies(req.headers);

        $.server.inject(req, function (res) {
            // Check to make sure the client didn't disconnect in the
            // middle of making a request. That would be quite rude.
            if ($.handler) {
                req.callback(res);
                $.updateCookies(lowerKeys(res.headers), 'set-cookie');
            }
            callback = null;
        });
    });

    // When the socket disconnects, close the handler and null for gc.
    $.socket.on('disconnect', function () {
        $.handler.close();
        $.handler = null;
        $.jar = null;
    });

    $.handler.boot();
};

/**
 * Syncs the cookies with what's in the headers, if cookies are enabled.
 * It adds cookies to the chat, and copies whatever is in the jar
 * to the headers.
 *
 * @access private
 * @param  {Object} headers
 */
Manager.prototype.syncCookies = function (headers) {
    if (!this.config.cookies || !headers) return;

    this.updateCookies(headers, 'cookie');
    headers.cookie = this.jar.getCookieStringSync(this.uri);
};

/**
 * Updates the cookies stored on the manager.
 *
 * @access private
 * @param {Object} headers
 * @param {String} prop
 */
Manager.prototype.updateCookies = function (headers, prop) {
    if (!this.config.cookies || !headers) return;

    var header = headers[prop];
    if (!header) return;

    var cookies = Array.isArray(header) ? header : [header];
    for (var i = 0; i < cookies.length; i ++) {
        this.jar.setCookieSync(cookies[i], this.uri);
    }
};

/**
 * List of protocol handlers available.
 * @access private
 * @type {Object.<String, Handler>}
 */
var Handlers = {
    Sails: require('./handlers/sails')
};

/**
 * Detects the version that the socket connection should be served with.
 * It tries to read valid GET parameters. It returns a constructor
 * that should be invoked with the socket.
 *
 * @access private
 * @param  {Socket.IO} socket
 * @return {Handler}
 */
Manager.prototype.detectVersion = function () {
    if (Hoek.reach(this.socket, 'handshake.query.__sails_io_sdk_version')) {
        return new Handlers.Sails(this.socket);
    }

    // Default to the sails transport.
    this.socket.emit('warn', { error: 'Unknown protocol; defaulting to Sails.'});
    return new Handlers.Sails(this.socket);
};

module.exports = Manager;
