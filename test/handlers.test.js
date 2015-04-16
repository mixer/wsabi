var EventEmitter = require('events').EventEmitter;
var expect = require('chai').expect;

describe('sails handler', function () {
    var Handler = require('../lib/handlers/sails');
    var socket, handler;

    beforeEach(function () {
        socket = new EventEmitter();
        handler = new Handler(socket);
        handler.boot();
    });

    afterEach(function () {
        handler.close();
    });

    it('parses valid incoming requests', function (done) {
        handler.on('request', function (req) {
            expect(req.method).to.equal('GET');
            expect(req.url).to.equal('/api/v1/users/current?');
            expect(req.headers).to.deep.equal({ a: 'b' });
            expect(req.payload).to.deep.equal({ b: 'c' });
            done();
        });
        socket.emit('get', { method: 'get', headers: { a: 'b' }, data: { b: 'c' }, url: '/api/v1/users/current?' });
    });

    it('disallows attempts at passing credentials', function (done) {
        handler.on('request', function (req) {
            expect(req.credentials).not.to.be.defined;
            done();
        });
        socket.emit('get', { method: 'get', headers: { a: 'b' }, data: { b: 'c' }, url: '/api/v1/users/current?', credentials: {} });
    });

    it('sends valid responses', function (done) {
        handler.on('request', function (req) {
            req.callback({ statusCode: 200, headers: { foo: 'bar' }, payload: '{"a":42}'});
            done();
        });
        socket.emit('get', { method: 'get', headers: {}, data: {}, url: '/api/v1/users/current?' }, function (res) {
            expect(res).to.deep.equal({
                body: { a: 42 },
                headers: { foo: 'bar' },
                statusCode: 200
            });
        });
    });


    [
        'hola',
        {},
        null,
        { method: 'blip', url: '/', headers: {}, data: {} },
        { method: 'get', headers: {}, data: {} },
        { method: 'get', headers: { 1: 2 }, data: {}, url: '/api/v1/users/current?' }
    ].forEach(function (r, i) {
        it('rejects malformed requests #' + i, function (done) {
            socket.emit('get', r, function (res) {
                expect(res.statusCode).to.equal(400);
                done();
            });
        });
    });

});
