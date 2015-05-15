var SocketIO = require('socket.io');
var Manager = require('./manager');
var Hoek = require('hoek');
var Boom = require('boom');

var wsabi = module.exports = {};

/**
 * Registers a new wsabi (Socket.io) instance on the server, and starts
 * it listening. It takes "io" options that are passed into the socket.io
 * server.
 *
 * It also registers a preAuth point that allows you to disallow sockets
 * from accessing certain routes. By default sockets are allowed; to
 * disallow, pass an option like `plugins: { wsabi: { enabled: false }}`.
 *
 * @access public
 * @param    {Hapi.Server} server
 * @param    {Object=}     options
 * @property {Object.<String, *>} io
 *           Options to pass to the socket.io server.
 * @property {String[]} sticky
 *           Headers to store and pass on each request from the handshake.
 * @property {String[]} sticky
 *           Headers to strip from websocket responses.
 * @property {Boolean} [cookies=true] Whether cookies should be managed.
 * @param    {Function} next
 */
wsabi.register = function (server, options, next) {
    var config = Hoek.applyToDefaults({
        io:      {},
        cookies: true,
        sticky:  [],
        strip:   [],
        errors:  {
            disabled: Boom.badRequest('Websockets are not allowed on this route.'),
            required: Boom.badRequest('This route may only be accessed via websockets.')
        }
    }, options);

    // Start the socket server.
    var io = SocketIO.listen(server.listener, config.io);
    var managers = {};
    io.sockets.on('connection', function (socket) {
        new Manager(server, socket, config).boot(managers);
    });

    // Register the preauth plugin to enable filtering of requests.
    server.ext('onPreAuth', function (req, reply) {
        var settings = req.route.settings.plugins;
        // Error if we're using sockets and wsabi is disabled.
        if (req.websocket && Hoek.reach(settings, 'wsabi.enabled') === false) {
            return reply(Hoek.reach(settings, 'wsabi.errors.disabled') || config.errors.disabled);
        }

        // Error if we're not using sockets and wsabi is required.
        if (!req.websocket && Hoek.reach(settings, 'wsabi.required')) {
            return reply(Hoek.reach(settings, 'wsabi.errors.disabled') || config.errors.required);
        }

        return reply.continue();
    });

    // When the server gets a request, add the websocket if necessary.
    // We have to take this circuitous route :/
    server.ext('onRequest', function (req, reply) {
        var id = req.headers['x-wsabi-manager'], manager;
        if (id && (manager = managers[id])) {
            req.websocket = manager.socket;
        }

        return reply.continue();
    });

    next();
};

wsabi.register.attributes = { pkg: require('../package') };
