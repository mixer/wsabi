![Wsabi](http://i.imgur.com/pb4uMWM.png)

[![Build Status](https://img.shields.io/travis/WatchBeam/wsabi.svg?style=flat-square)](https://travis-ci.org/WatchBeam/wsabi) [![Coverage Status](https://img.shields.io/coveralls/WatchBeam/wsabi.svg?style=flat-square)](https://coveralls.io/r/WatchBeam/wsabi)

Wsabi is a layer which allows you to call Hapi http endpoints from websockets, basically serving as a bridge between Socket.io and Hapi's server.inject. It was originally built to be backwards compatible with the [Sails.js](http://sailsjs.org/#!/) websocket system, during a backend port.

## Usage

To Wsabi, simply register it on your server.

```js
server.register({ register: require('wsabi') }, function (err) {
    // ...
});
```

Options:

 * `io` defaults to an empty object. List of [options](https://github.com/Automattic/engine.io#methods-1) to pass to the socket.io server,
 * `cookies` defaults to "true". Determines whether Wsabi should "manage" the session cookies for you - see the note below.
 * `sticky` defaults to `[]`. Should be an array of headers you want to keep from the handshake and pass directly into the server. Setting sticky to `["x-forwarded-for"]` may be useful. The client will not be able to overwrite these.
 * `strip` defaults to `[]`. Should be an array of headers you don't care to send back down to the client over websockets.
 * `errors` is an object
    * `required` is the reply sent if sockets are required on the route, but it's accessed over HTTP. Defaults to a `Boom.badRequest` instance.
    * `disabled` is the reply sent if sockets are disabled on the route and it's attempted to be accessed over sockets. Defaults to a `Boom.badRequest` instance.

After this, you can then connect to your server using any supported client library, including:

 * [Sails.io.js](https://github.com/balderdashy/sails.io.js).
 * More to come?

Routes also have their own options that you can pass in the plugin config:
 * `required` defaults to `false`: setting it to true will cause an error to be sent if the socket is accessed over plain HTTP.
 * `enabled` defaults to `true`: setting it to false will cause an error to be sent if the socket is accessed over websockets.
 * `errors` object can be passed in for custom error overrides.

```js
// Example of a route with wsabi disabled:
server.route({
    method: 'GET',
    path: '/',
    config: {
        plugins: { wsabi: { enabled: false }}
    }
    // ...
})
```

If you'd like to access the websocket itself in your request, you can access `req.websocket`. That may also be used for checking if a route is running under websockets.

You can also access the socket.io server directly after registration via `server.plugins.wsabi.io`.

### A Note About Sessions

The session "state" is stored on the socket connection. Cookies passed in the initial Socket.io handshake request will be passed on automatically in every request on that socket. If a response includes a `set-cookie` header, we'll update the stored cookie jar, and if you send in a request with a `Cookie` header then the cookie jar will be updated appropriately.

You can disable handling of cookies by passing `cookies: false` in the plugin config. When disabled, only the cookies explicitly sent on each request will be used.

## License

This software is MIT licensed, copyright 2016 by Beam Interactive, Inc.

#### Why the name?

Because it's Hapi websockets, and if you say "WS Hapi" quickly several times it sounds like "wasabi". Wasabi itself was already taken on npm, so we have wsabi! Oh, and because sushi is awesome.
