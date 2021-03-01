import Arnavon from '../../src/';
import Config from '../../src/config';
import { expect, default as chai } from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import proxyquire from 'proxyquire';

chai.should();
chai.use(sinonChai);

describe('Consumer', () => {

  let consumer, config, Consumer, listen, processExit;
  beforeEach(() => {
    const arncfg = Config.fromFile('example/config.yaml');
    config = arncfg.consumers[0];
    listen = sinon.stub().yields();
    processExit = sinon.stub(process, 'exit');
    Consumer = proxyquire('../../src/consumer', {
      '../api': {
        default: function() {
          return {
            listen
          };
        }
      }
    }).default;
    consumer = new Consumer(config);
  });

  afterEach(() => {
    processExit.restore();
  });

  it('is a class', () => {
    expect(Consumer).to.be.a.instanceof(Function);
  });

  describe('its constructor', () => {
    it('expects a ConsumerConfig as parameter', () => {
      const test = (cfg) => () => new Consumer(cfg);
      expect(test()).to.throw(/ConsumerConfig expected, got/);
      expect(test(null)).to.throw(/ConsumerConfig expected, got/);
      expect(test({})).to.throw(/ConsumerConfig expected, got/);
    });
    it('it works', () => {
      expect(new Consumer(config)).to.be.an.instanceof(Consumer);
    });
  });

  describe('#start', () => {

    it('is a function', () => {
      expect(consumer.start).to.be.an.instanceOf(Function);
    });

    it('connects to the queue', () => {
      const spy = sinon.stub(Arnavon.queue, 'connect').resolves(true);
      consumer.start();
      expect(spy).to.be.calledOnce;
    });

    it('starts the api, after successful connection to the queue', () => {
      Arnavon.queue.connect = sinon.stub().resolves(true);
      return consumer.start()
        .then(() => {
          expect(listen).to.be.calledOnce;
        });
    });

    it('quits if unable to start the api', () => {
      Arnavon.queue.connect = sinon.stub().resolves(true);
      listen.yields(new Error('oops'));
      return consumer.start()
        .finally(() => {
          expect(processExit).to.be.calledOnceWith(10);
        });
    });

    it('quits when unable to connect to the queue', () => {
      Arnavon.queue.connect = sinon.stub().rejects(new Error('oops'));
      return consumer.start()
        .finally(() => {
          expect(processExit).to.be.calledOnceWith(10);
        });
    });

    it('starts consuming the queue, after successful start of the API', () => {
      Arnavon.queue.connect = sinon.stub().resolves(true);
      const spy = sinon.stub(Arnavon.queue, 'consume').resolves(true);
      return consumer.start()
        .then(() => {
          expect(spy).to.be.calledOnce;
          const call = spy.getCall(0);
          expect(call.args[0]).to.equal('send-slack');
        });
    });

  });

});
