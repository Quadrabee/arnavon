import Arnavon from '../../src/';
import Config from '../../src/config';
import { expect, default as chai } from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import proxyquire from 'proxyquire';
import { Job, JobDispatcher, JobRunner } from '../../src/jobs';

chai.should();
chai.use(sinonChai);

describe('Consumer', () => {

  let consumer, config, Consumer, listen, processExit, dispatcher;
  beforeEach(() => {
    const arncfg = Config.fromFile('example/config.yaml');
    config = arncfg.consumers[0];
    listen = sinon.stub().yields();
    processExit = sinon.stub(process, 'exit');
    dispatcher = new JobDispatcher(arncfg);
    Consumer = proxyquire('../../src/consumer', {
      '../api': {
        default: function() {
          return {
            listen
          };
        }
      }
    }).default;
    consumer = new Consumer(config, dispatcher);
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
    it('expects a JobDispatcher as second parameter', () => {
      const test = (disp) => () => new Consumer(config, disp);
      expect(test()).to.throw(/JobDispatcher expected, got/);
      expect(test(null)).to.throw(/JobDispatcher expected, got/);
      expect(test({})).to.throw(/JobDispatcher expected, got/);
    });
    it('it works', () => {
      expect(new Consumer(config, dispatcher)).to.be.an.instanceof(Consumer);
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
          expect(call.args[0]).to.equal('send-email');
        });
    });

    it('factors the adequate job runner according to configuration', () => {
      Arnavon.queue.connect = sinon.stub().resolves(true);
      const spy = sinon.stub(JobRunner, 'factor').resolves(true);
      return consumer.start()
        .then(() => {
          expect(spy).to.be.calledOnce;
          const call = spy.getCall(0);
          expect(call.args[0]).to.equal('nodejs');
          spy.restore();
        });
    });
  });

  describe('upon queue message reception', () => {
    let trigger, runner, jobFactor;
    beforeEach(() => {
      runner = {
        run: sinon.stub().resolves()
      };
      const promise = new Promise((resolve, reject) => {
        trigger = resolve;
      });
      jobFactor = sinon.stub(JobRunner, 'factor').returns(runner);
      Arnavon.queue.consume = (queueName, runnerCb) => {
        promise.then(runnerCb);
      };
    });

    afterEach(() => {
      jobFactor.restore();
    });

    it('calls the job runner', () => {
      Arnavon.queue.connect = sinon.stub().resolves(true);
      const msg = { foo: 'bar' };
      const test = consumer.start()
        .then(() => {
          expect(runner.run).to.be.calledOnce;
          const { args } = runner.run.getCall(0);
          expect(args[0]).to.equal(msg);
          expect(args[1]).to.eql({ dispatcher, prometheusRegistry: Arnavon.registry });
        });
      trigger(msg);
      return test;
    });

  });

});
