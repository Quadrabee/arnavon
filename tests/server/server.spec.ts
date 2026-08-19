'use strict';
import { expect, use, should } from 'chai';
import Arnavon from '../../src';
import Config from '../../src/config';
import Server from '../../src/server';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';

should();
use(sinonChai);

describe('Server', () => {

  let config, server: Server;
  beforeEach(() => {
    config = Config.fromFile('example/config.yaml');
    server = new Server(config);
    // Stub _startApi to avoid actually starting an HTTP server
    sinon.stub(server, '_startApi').resolves(server);
  });

  afterEach(() => {
    sinon.restore();
  });

  it('is a class', () => {
    expect(Server).to.be.a.instanceof(Function);
  });

  describe('its constructor', () => {
    it('expects an ArnavonConfig instance', () => {
      expect(() => new Server()).to.throw(/ArnavonConfig expected/);
    });

    it('it works', () => {
      expect(server).to.be.an.instanceof(Server);
    });
  });

  describe('#start', () => {

    it('is a function', () => {
      expect(server.start).to.be.an.instanceOf(Function);
    });

    it('connects to the queue', () => {
      const spy = sinon.stub(Arnavon.queue, 'connect').resolves(Arnavon.queue);
      server.start();
      expect(spy).to.be.calledOnce;
    });

    it('starts the api, after successful connection to the queue', () => {
      Arnavon.queue.connect = sinon.stub().resolves(true);
      return server.start()
        .then(() => {
          expect(server._startApi).to.be.calledOnce;
        });
    });

    it('quits when unable to connect to the queue', () => {
      Arnavon.queue.connect = sinon.stub().rejects(new Error('oops'));
      const spy = sinon.stub(process, 'exit');
      return server.start()
        .finally(() => {
          expect(spy).to.be.calledOnceWith(10);
          spy.restore();
        });
    });
  });

  describe('#stop', () => {

    it('disconnects the queue', async () => {
      Arnavon.queue.connect = sinon.stub().resolves(true);
      const disconnectSpy = sinon.stub(Arnavon.queue, 'disconnect').resolves(Arnavon.queue);
      await server.start();
      await server.stop();
      expect(disconnectSpy).to.be.calledOnce;
    });

    it('stops the internal API server', async () => {
      Arnavon.queue.connect = sinon.stub().resolves(true);
      sinon.stub(Arnavon.queue, 'disconnect').resolves(Arnavon.queue);
      const stopApiSpy = sinon.spy(server, '_stopApi');
      await server.start();
      await server.stop();
      expect(stopApiSpy).to.be.calledOnce;
    });
  });
});
