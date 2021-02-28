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

});
