'use strict';
import { expect, use, should } from 'chai';
import Arnavon from '../../src/';
import Config from '../../src/config';
import Consumer from '../../src/consumer';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import { JobDispatcher, JobRunner } from '../../src/jobs';

should();
use(sinonChai);

describe('Consumer', () => {

  let consumer, config, processExit, dispatcher;
  beforeEach(() => {
    const arncfg = Config.fromFile('example/config.yaml');
    config = arncfg.consumers[0];
    processExit = sinon.stub(process, 'exit');
    dispatcher = new JobDispatcher(arncfg);
    consumer = new Consumer(config, dispatcher);
    // Stub _startApi to avoid actually starting an HTTP server
    sinon.stub(consumer, '_startApi').resolves(consumer);
  });

  afterEach(() => {
    processExit.restore();
    sinon.restore();
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
      expect(consumer).to.be.an.instanceof(Consumer);
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
          expect(consumer._startApi).to.be.calledOnce;
        });
    });

    it('quits if unable to start the api', () => {
      Arnavon.queue.connect = sinon.stub().resolves(true);
      consumer._startApi.restore();
      sinon.stub(consumer, '_startApi').rejects(new Error('oops'));
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
    let trigger, runner, jobFactor, msg;
    beforeEach(() => {
      msg = {
        meta: {
          jobName: 'send-email',
        },
        payload: {
          from: 'llambeau@quadrabee.com',
          to: 'blambeau@enspirit.be',
          subject: 'An email subject',
        },
      };

      runner = {
        run: sinon.stub().resolves(),
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

    it('dresses the the job', () => {
      Arnavon.queue.connect = sinon.stub().resolves(true);
      const validator = dispatcher.getValidator(msg.meta);
      const getValidator = sinon.spy(dispatcher, 'getValidator');
      const validate = sinon.spy(validator, 'validate');

      const test = consumer.start()
        .then(() => {
          expect(getValidator).to.be.calledOnceWith(msg.meta);
          expect(validate).to.be.calledOnce;
        });
      trigger(msg);
      return test;
    });

    it('calls the job runner', () => {
      Arnavon.queue.connect = sinon.stub().resolves(true);
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

  describe('#stop', () => {

    it('disconnects the queue', async () => {
      Arnavon.queue.connect = sinon.stub().resolves(true);
      const disconnectSpy = sinon.stub(Arnavon.queue, 'disconnect').resolves(Arnavon.queue);
      await consumer.start();
      await consumer.stop();
      expect(disconnectSpy).to.be.calledOnce;
    });

    it('stops the internal API server', async () => {
      Arnavon.queue.connect = sinon.stub().resolves(true);
      sinon.stub(Arnavon.queue, 'disconnect').resolves(Arnavon.queue);
      const stopApiSpy = sinon.spy(consumer, '_stopApi');
      await consumer.start();
      await consumer.stop();
      expect(stopApiSpy).to.be.calledOnce;
    });
  });

  describe('with multiple consumer configs', () => {
    let multiConsumer;
    beforeEach(() => {
      // Reset registry to avoid metric registration conflicts from prior Consumer creation
      Arnavon.reset();
      const arncfg = Config.fromFile('example/config.yaml');
      dispatcher = new JobDispatcher(arncfg);
      const configs = arncfg.consumers;
      multiConsumer = new Consumer(configs, dispatcher);
      sinon.stub(multiConsumer, '_startApi').resolves(multiConsumer);
    });

    it('starts consuming all configured queues', () => {
      Arnavon.queue.connect = sinon.stub().resolves(true);
      sinon.stub(JobRunner, 'factor').returns({ run: sinon.stub().resolves() });
      const consumeSpy = sinon.stub(Arnavon.queue, 'consume').resolves(true);
      return multiConsumer.start()
        .then(() => {
          expect(consumeSpy.callCount).to.equal(2);
          const queueNames = consumeSpy.getCalls().map(c => c.args[0]);
          expect(queueNames).to.include('send-email');
          expect(queueNames).to.include('send-email-via-binary');
        });
    });

    it('factors a runner for each consumer config', () => {
      Arnavon.queue.connect = sinon.stub().resolves(true);
      sinon.stub(Arnavon.queue, 'consume').resolves(true);
      const factorSpy = sinon.stub(JobRunner, 'factor').returns({ run: sinon.stub().resolves() });
      return multiConsumer.start()
        .then(() => {
          expect(factorSpy.callCount).to.equal(2);
          const types = factorSpy.getCalls().map(c => c.args[0]);
          expect(types).to.include('nodejs');
          expect(types).to.include('binary');
        });
    });
  });

});
