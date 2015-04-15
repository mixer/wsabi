var Hoek = require('hoek');
var SocketIO = require('socket.io');
var Jar = require('tough-cookie').CookieJar;
var util = require('./util');

/**
 * List of protocol handlers available.
 * @access private
 * @type {Object.<String, Handler>}
 */
var Handlers = {
    Sails: require('./handlers/sails')
};

/**
 * Headers we look for for cookies.
 * @type {String[]}
 */
var tryCookie = ['set-cookie', 'Cookie', 'cookie'];

var wsabi = module.exports = {};

/**
 * Registers a new wsabi (Socket.io) instance on the server, and starts
 * it listening.
 *
 * @access public
 * @param    {Hapi.Server}           server
 * @param    {Object=}               options
 * @property {Object.<String, *>} io Options to pass to the socket.io server.
 * @param    {Function} next
 */
wsabi.register = function (server, options, next) {
    var config = Hoek.applyToDefaults({
        io: {}
    }, options);

    var io = SocketIO.listen(server.listener, config.io);
    io.sockets.on('connection', function (socket) {
        wsabi.manageConnection(server, socket);
    });

    next();
};

wsabi.register.attributes = require('../package');

/**
 * Takes a new connection, adds event listeners and manages it.
 * @access private
 * @param {Hapi.Server} server
 * @param {SocketIO.Socket} socket
 */
wsabi.manageConnection = function (server, socket) {
    // Manager to use for the socket protocol.
    var handler = wsabi.detectVersion(socket);
    // The current session cookie we're saving.
    // Handle cookies for the session in this nice jar.
    var jar = new Jar();
    // The address the cookies are on. Doesn't really matter.
    var uri = server.uri || 'http://example.com';

    // Start handling.
    updateJar(socket.handshake.headers);
    handler.boot();

    // When the handler tells us we have a request, inject it into the
    // server and wait for the response.
    handler.on('request', function (req) {
        // update our jar if the client gives new cookies
        updateJar(req.headers);
        // and set the cookies on the request.
        req.headers.Cookie = jar.getCookieStringSync(uri);

        server.inject(req, function (res) {
            // Check to make sure the client didn't disconnect in the
            // middle of making a request. That would be quite rude.
            if (handler) {
                req.callback(res);
                updateJar(res.headers); // update set-cookie headers
            }
            callback = null;
        });
    });

    // When the socket disconnects, close the handler and null for gc.
    socket.on('disconnect', function () {
        handler.close();
        handler = null;
        cookie = null;
    });

    /**
     * The cookie jar if there's a set-cookie string in the given object.
     * @param  {Object} headers
     */
    function updateJar (headers) {
        if (!headers) return;

        for (var i = 0; i < tryCookie.length; i ++) {
            var h = headers[tryCookie[i]];

            if (h) {
                return jar.setCookieSync(h, uri);
            }
        }
    }
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
wsabi.detectVersion = function (socket) {
    if ('__sails_io_sdk_version' in socket.handshake.query) {
        return new Handlers.Sails(socket);
    }

    return new Handlers.Sails(socket);
};

