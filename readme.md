# Wsabi [wip]

Wsabi is a layer which allows you to call Hapi http endpoints from websockets, basically serving as a bridge between Socket.io and Hapi's server.inject.

## Usage

[options](https://github.com/Automattic/engine.io#methods-1).

```js

server.register({
    register: require('wsabi')
}, function (err) {
    if (err) {
        console.error('Error loading wsabi', err);
    }
});
```

## License

This software is MIT licensed, copyright 2015 by Beam LLC.

#### Why the name?

Because it's Hapi websockets, and if you say "WS Hapi" quickly several times it sounds like "wasabi", and wasabi itself was already taken on npm ;)
