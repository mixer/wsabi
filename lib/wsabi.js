'use strict';

const SocketIO = require('socket.io');
const Manager = require('./manager');
const Hoek = require('hoek');
const Boom = require('boom');

const wsabi = module.exports = {};

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
    const config = Hoek.applyToDefaults({
        io: {},
        cookies: true,
        sticky: [],
        strip: [],
        errors: {
            disabled: Boom.badRequest('Websockets are not allowed on this route.'),
            required: Boom.badRequest('This route may only be accessed via websockets.'),
        },
    }, options);

    // Start the socket server.
    const io = SocketIO.listen(server.listener, config.io);
    const managers = {};
    io.sockets.on('connection', (socket) => {
        new Manager(server, socket, config).boot(managers);
    });

    server.expose('io', io);

    // Register the preauth plugin to enable filtering of requests.
    server.ext('onPreAuth', (req, reply) => {
        const settings = req.route.settings.plugins;
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
    server.ext('onRequest', (req, reply) => {
        const id = req.headers['x-wsabi-manager'];
        const manager = id && managers[id];
        if (manager) {
            req.websocket = manager.socket;
        }

        return reply.continue();
    });

    next();
};

wsabi.register.attributes = { pkg: require('../package') };
