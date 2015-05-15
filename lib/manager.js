var crypto = require('crypto');
var Hoek = require('hoek');

var Jar = require('./jar');
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

    this.id = crypto.randomBytes(32).toString('hex');
    socket.handshake.headers = lowerKeys(socket.handshake.headers);

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
 * @param {Object} registry Object the manager registers itself in.
 */
Manager.prototype.boot = function (registry) {
    var $ = this;

    registry[$.id] = $;

    // When the handler tells us we have a request, inject it into the
    // server and wait for the response.
    $.handler.on('request', function (req) {
        req.headers['x-wsabi-manager'] = $.id;
        req.headers = lowerKeys(req.headers);
        $.syncCookies(req.headers);
        $.addStickyHeaders(req);

        $.server.inject(req, function (res) {
            // Check to make sure the client didn't disconnect in the
            // middle of making a request. That would be quite rude.
            if ($.handler) {
                $.updateCookies(lowerKeys(res.headers), 'set-cookie');
                $.stripHeaders(res);
                req.callback(res);
            }
        });
    });

    // When the socket disconnects, close the handler and null for gc.
    $.socket.on('disconnect', function () {
        $.handler.close();
        $.handler = null;
        $.jar = null;
        delete registry[$.id];
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
    headers.cookie = this.jar.getCookies();
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

    try {
        this.jar.setCookies(header);
    } catch (c) {
        // ignore errors in parsing cookies.
    }
};

/**
 * Adds "sticky" headers from the handshake onto the request.
 * @param {Object} req
 */
Manager.prototype.addStickyHeaders = function (req) {
    var sticky = this.config.sticky;
    for (var i = 0; i < sticky.length; i++) {
        req.headers[sticky[i]] = this.socket.handshake.headers[sticky[i]];
    }
};

/**
 * Strips headers from the response.
 * @param  {Object} res
 */
Manager.prototype.stripHeaders = function (res) {
    var strip = this.config.strip;
    for (var i = 0; i < strip.length; i++) {
        delete res.headers[strip[i]];
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
