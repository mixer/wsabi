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
 * @property {Object.<String, *>} io Options to pass to the socket.io server.
 * @property {Boolean} [cookies=true] Whether cookies should be managed.
 * @param    {Function} next
 */
wsabi.register = function (server, options, next) {
    var config = Hoek.applyToDefaults({
        io: {},
        cookies: true,
        errors: {
            disabled: Boom.badRequest('Websockets are not allowed on this route.'),
            required: Boom.badRequest('This route may only be accessed via websockets.')
        }
    }, options);

    // Start the socket server.
    var io = SocketIO.listen(server.listener, config.io);
    io.sockets.on('connection', function (socket) {
        new Manager(server, socket, config).boot();
    });

    // Register the preauth plugin to enable filtering of requests.
    server.ext('onPreAuth', function(req, reply) {
        var enabled = Hoek.reach(req.route.settings.plugins, 'wsabi.enabled');
        if (enabled === false && req.headers['x-wsabi-socket']) {
            return reply(config.errors.disabled);
        }

        var required = Hoek.reach(req.route.settings.plugins, 'wsabi.required');
        if (required === true && !req.headers['x-wsabi-socket']) {
            return reply(config.errors.required);
        }

        return reply.continue();
    });

    next();
};

wsabi.register.attributes = { pkg: require('../package') };
