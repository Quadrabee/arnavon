import Arnavon from '../../src';
import Config from '../../src/config';
import { expect, default as chai } from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import proxyquire from 'proxyquire';

chai.should();
chai.use(sinonChai);

describe('Server', () => {

  let config, server, Server, listen;
  beforeEach(() => {
    config = Config.fromFile('example/config.yaml');
    listen = sinon.stub().yields();
    Server = proxyquire('../../src/server', {
      './rest': {
        default: function() {
          return {
            listen
          };
        }
      }
    }).default;

    server = new Server(config);
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
      const spy = sinon.stub(Arnavon.queue, 'connect').resolves(true);
      server.start();
      expect(spy).to.be.calledOnce;
    });

    it('starts the api, after successful connection to the queue', () => {
      Arnavon.queue.connect = sinon.stub().resolves(true);
      return server.start()
        .then(() => {
          expect(listen).to.be.calledOnce;
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
});
