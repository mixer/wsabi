![Wsabi](http://i.imgur.com/yBFItmN.png)

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

After this, you can then connect to your server using any supported client library, including:

 * [Sails.io.js](https://github.com/balderdashy/sails.io.js).
 * More to come?

If there's a route you want to disallow Wsabi on, simply pass "enabled: false" as a config option:

```js
server.route({
    method: 'GET',
    path: '/',
    config: {
        plugins: { wsabi: { enabled: false }}
    }
    // ...
})
```

### A Note About Sessions

The session "state" is stored on the socket connection. Cookies passed in the initial Socket.io handshake request will be passed on automatically in every request on that socket. If a response includes a `set-cookie` header, we'll update the stored cookie jar, and if you send in a request with a `Cookie` header then the cookie jar will be updated appropriately.

You can disable handling of cookies by passing `cookies: false` in the plugin config. When disabled, only the cookies explicitly sent on each request will be used.

## License

This software is MIT licensed, copyright 2015 by Beam LLC.

#### Why the name?

Because it's Hapi websockets, and if you say "WS Hapi" quickly several times it sounds like "wasabi". Wasabi itself was already taken on npm, so we have wsabi! Oh, and because sushi is awesome.
