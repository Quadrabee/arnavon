import sinon from 'sinon';
import { expect } from 'chai';
import chai from 'chai';
import sinonChai from 'sinon-chai';
import Queue from '../../src/queue';
import MemoryQueue from '../../src/queue/drivers/memory';

chai.should();
chai.use(sinonChai);

describe.only('Queue', () => {

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
    it('returns a promise', () => {
      expect(queue.consume()).to.be.an.instanceof(Promise);
    });
    it ('calls the subclass _consume implementation', () => {
      const spy = sinon.stub(queue, '_consume')
        .returns(Promise.resolve());
      const processor = () => {};
      queue.consume(processor);
      expect(spy).to.be.calledOnce;
    });
  });

});
