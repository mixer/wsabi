var Hoek = require('hoek');
var EventEmitter = require('events').EventEmitter;

var expect = require('chai').expect;
var sinon = require('sinon');

var sailsHandshake = { headers:
   { upgrade: 'websocket',
     connection: 'upgrade',
     host: 'localhost:1337',
     'x-forwarded-for': '10.0.2.2',
     pragma: 'no-cache',
     'cache-control': 'no-cache',
     origin: 'http://localhost:1337',
     'sec-websocket-version': '13',
     'user-agent': 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/42.0.2311.90 Safari/537.36',
     'accept-encoding': 'gzip, deflate, sdch',
     'accept-language': 'en-US,en;q=0.8',
     cookie: 'a=b',
     'sec-websocket-key': 'K+mIoFLBjZ6B8JDbrgsOLA==',
     'sec-websocket-extensions': 'permessage-deflate; client_max_window_bits' },
  time: 'Thu Apr 16 2015 12:25:53 GMT+0000 (UTC)',
  address: '127.0.0.1',
  xdomain: true,
  secure: false,
  issued: 1429187153599,
  url: '/socket.io/?__sails_io_sdk_version=0.11.0&__sails_io_sdk_platform=node&__sails_io_sdk_language=javascript&EIO=3&transport=websocket',
  query:
   { __sails_io_sdk_version: '0.11.0',
     __sails_io_sdk_platform: 'node',
     __sails_io_sdk_language: 'javascript',
     EIO: '3',
     transport: 'websocket' } };


describe('manager', function () {
    var Manager = require('../lib/manager');
    var SailsHandler = require('../lib/handlers/sails');
    var manager;

    beforeEach(function () {
        var socket = new EventEmitter();
        socket.handshake = sailsHandshake;
        var server = { inject: sinon.stub() };
        var config = {};
        manager = new Manager(server, socket, { cookies: true });
    });

    describe('handler selection', function () {
        it('use sails transport as requested', function () {
            manager.socket.handshake = sailsHandshake;
            expect(manager.detectVersion()).to.be.an.instanceof(SailsHandler);
        });
        it('uses sails handler by default', function () {
            var h = Hoek.clone(sailsHandshake);
            h.query = {};
            manager.socket.handshake = h;

            expect(manager.detectVersion()).to.be.an.instanceof(SailsHandler);
        });
    });

    describe('cookie management', function () {
        it('applies stored cookies to header', function () {
            var headers = {};
            manager.syncCookies(headers);
            expect(headers).to.deep.equal({ cookie: 'a=b'});
        });
        it('reads updated cookies', function () {
            var headers = { cookie: 'b=c'};
            manager.syncCookies(headers);
            expect(headers).to.deep.equal({ cookie: 'a=b; b=c' });
        });
        it('overwrites cookies', function () {
            var headers = { cookie: 'a=q'};
            manager.syncCookies(headers);
            expect(headers).to.deep.equal({ cookie: 'a=q' });
        });
        it('saves updates', function () {
            // once
            var headers = { cookie: 'b=c'};
            manager.syncCookies(headers);
            expect(headers).to.deep.equal({ cookie: 'a=b; b=c' });
            // saved them
            headers = {};
            manager.syncCookies(headers);
            expect(headers).to.deep.equal({ cookie: 'a=b; b=c' });
            // overwrites them
            headers = { cookie: 'b=q'};
            manager.syncCookies(headers);
            expect(headers).to.deep.equal({ cookie: 'a=b; b=q' });
            // saves overwrites
            headers = {};
            manager.syncCookies(headers);
            expect(headers).to.deep.equal({ cookie: 'a=b; b=q' });
        });

        it('also works with set-cookie', function () {
              manager.updateCookies({ 'set-cookie': ['b=c'] }, 'set-cookie');
              var headers = {};
              manager.syncCookies(headers);
              expect(headers).to.deep.equal({ cookie: 'a=b; b=c' });
        });

        it('does nothing when cookies disabled', function () {
            manager.config.cookies = false;
            headers = {};
            manager.syncCookies(headers);
            expect(headers).to.deep.equal({});
        });

        it('does not fail on malformed cookie headers', function () {
          expect(function () {
            manager.updateCookies({ 'cookie': ['qwert ;yfr fq:$ 02)$gu'] }, 'cookie');
          }).not.to.throw;
        });
    });

    describe('handling', function () {
        var handler;
        beforeEach(function () {
            handler = manager.handler = new EventEmitter();
            manager.handler.close = sinon.stub();
            manager.handler.boot = sinon.stub();
            manager.boot();
        });

        it('boots and closes on disconnect', function () {
            sinon.assert.called(handler.boot);
            manager.socket.emit('disconnect');
            sinon.assert.called(handler.close);
        });

        it('run requests', function () {
            var req = { headers: { foo: 'bar' }, payload: {}, route: '/', callback: sinon.stub() };
            sinon.stub(manager, 'syncCookies');
            sinon.stub(manager, 'updateCookies');

            handler.emit('request', req);
            sinon.assert.calledWith(manager.syncCookies, req.headers);
            expect(req.headers['x-wsabi-socket']).to.equal(manager.socket);
            sinon.assert.calledWith(manager.server.inject, req);

            var res = { headers: { 'set-cookie': 'asdf' }};
            manager.server.inject.yield(res);
            sinon.assert.calledWith(manager.updateCookies, res.headers);
            sinon.assert.calledWith(req.callback, res);
        });
    });
});
