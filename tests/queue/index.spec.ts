import sinon from 'sinon';
import { expect } from 'chai';
import chai from 'chai';
import sinonChai from 'sinon-chai';
import Queue from '../../src/queue';
import MemoryQueue from '../../src/queue/drivers/memory';

chai.should();
chai.use(sinonChai);

describe('Queue', () => {

  // Tests for the abstract class public contract

  it('exports the Queue class', () => {
    expect(Queue).to.be.an.instanceof(Function);
  });

  describe('.create', () => {
    it ('is a function', () => {
      expect(Queue.create).to.be.an.instanceof(Function);
    });
    it ('complains when unknown driver is passed', () => {
      const test = () => Queue.create({ driver: 'foo' });
      expect(test).to.throw(/Unknown queue driver: foo/);
    });
    it ('instantiates the proper subclass', () => {
      const queue = Queue.create({ driver: 'memory' });
      expect(queue).to.be.an.instanceof(MemoryQueue);
    });
  });

  // Tests through subclassing

  class TestQueue extends Queue {
    _connect() {
      return Promise.resolve('connected');
    }
    _push() {
      return Promise.resolve('pushed');
    }
    _consume() {
      return Promise.resolve('consumed');
    }
    _requeue(_sourceQueue, _options) {
      return Promise.resolve({ status: 'completed', requeued: 1, failed: 0, errors: [] });
    }
    _getQueuesInfo(queueNames) {
      return Promise.resolve(queueNames.map(name => ({ name, messages: 0, consumers: 0, state: 'running' })));
    }
  }

  let queue;
  beforeEach(() => {
    queue = new TestQueue();
  });

  describe('#connect', () => {
    it ('is a function', () => {
      expect(queue.connect).to.be.an.instanceof(Function);
    });
    it('returns a promise', () => {
      expect(queue.connect()).to.be.an.instanceof(Promise);
    });
    it ('calls the subclass _connect implementation', () => {
      const spy = sinon.stub(queue, '_connect')
        .returns(Promise.resolve());
      queue.connect();
      expect(spy).to.be.calledOnce;
    });
  });

  describe('#push', () => {
    it ('is a function', () => {
      expect(queue.push).to.be.an.instanceof(Function);
    });
    it('returns a promise', () => {
      expect(queue.push()).to.be.an.instanceof(Promise);
    });
    it ('calls the subclass _push implementation', () => {
      const spy = sinon.stub(queue, '_push')
        .returns(Promise.resolve());
      queue.push('key', 'data');
      expect(spy).to.be.calledOnceWith('key', 'data');
    });
  });

  describe('#consume', () => {
    it ('is a function', () => {
      expect(queue.consume).to.be.an.instanceof(Function);
    });
    it('expects a selector (String) and consumer (Function) as arguments', () => {
      const test = (selector, consumer) => () => queue.consume(selector, consumer);

      // invalid selector
      expect(test(null, () => {})).to.throw(/String selector expected, got/);
      expect(test(undefined, () => {})).to.throw(/String selector expected, got/);
      expect(test(() => {}, () => {})).to.throw(/String selector expected, got/);
      // invalid consumer
      expect(test('job-id', null)).to.throw(/Consumer callback expected, got/);
      expect(test('job-id', undefined)).to.throw(/Consumer callback expected, got/);
      expect(test('job-id,', '')).to.throw(/Consumer callback expected, got/);
    });
    it('returns a promise', () => {
      expect(queue.consume('job-id', () => {})).to.be.an.instanceof(Promise);
    });
    it ('calls the subclass _consume implementation', () => {
      const spy = sinon.stub(queue, '_consume')
        .returns(Promise.resolve());
      const processor = () => {};
      queue.consume('job-id', processor);
      // expect calls
      expect(spy).to.be.calledOnce;
      // the consumer function is decorated, let's help mocha asserting it
      const call = spy.getCall(0);
      expect(call.args[0]).to.equal('job-id');
      expect(call.args[1]).to.be.an.instanceof(Function);
    });
  });

  describe('#requeue', () => {
    it('is a function', () => {
      expect(queue.requeue).to.be.an.instanceof(Function);
    });
    it('expects a queue name (String) as first argument', () => {
      const test = (queueName) => () => queue.requeue(queueName);

      expect(test(null)).to.throw(/String queue name expected, got/);
      expect(test(undefined)).to.throw(/String queue name expected, got/);
      expect(test(123)).to.throw(/String queue name expected, got/);
    });
    it('returns a promise', () => {
      expect(queue.requeue('dlq-name')).to.be.an.instanceof(Promise);
    });
    it('calls the subclass _requeue implementation', () => {
      const spy = sinon.stub(queue, '_requeue')
        .returns(Promise.resolve({ status: 'initiated', requeued: 0, failed: 0, errors: [] }));
      queue.requeue('dlq-name', { count: 5 });
      expect(spy).to.be.calledOnceWith('dlq-name', { count: 5 });
    });
  });

  describe('#getQueuesInfo', () => {
    it('is a function', () => {
      expect(queue.getQueuesInfo).to.be.an.instanceof(Function);
    });
    it('returns a promise', () => {
      sinon.stub(queue, '_getQueuesInfo').returns(Promise.resolve([]));
      expect(queue.getQueuesInfo(['queue-1'])).to.be.an.instanceof(Promise);
    });
    it('calls the subclass _getQueuesInfo implementation', () => {
      const spy = sinon.stub(queue, '_getQueuesInfo')
        .returns(Promise.resolve([{ name: 'q1', messages: 5, consumers: 1, state: 'running' }]));
      queue.getQueuesInfo(['q1', 'q2']);
      expect(spy).to.be.calledOnceWith(['q1', 'q2']);
    });
  });

});
