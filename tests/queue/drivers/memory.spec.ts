import { expect } from 'chai';
import chai from 'chai';
import sinonChai from 'sinon-chai';
import sinon from 'sinon';
import MemoryQueue from '../../../src/queue/drivers/memory';

chai.should();
chai.use(sinonChai);

describe('MemoryQueue', () => {

  it('exports the MemoryQueue class', () => {
    expect(MemoryQueue).to.be.an.instanceof(Function);
  });

  describe('constructor', () => {
    it('returns an instance of MemoryQueue', () => {
      const queue = new MemoryQueue();
      expect(queue).to.be.an.instanceof(MemoryQueue);
    });
  });

  describe('#_connect', () => {
    it('returns a promise that resolves to the queue instance', () => {
      const queue = new MemoryQueue();
      const result = queue._connect();
      expect(result).to.be.an.instanceof(Promise);
      return result.then((resolved) => {
        expect(resolved).to.equal(queue);
      });
    });
  });

  describe('#_push', () => {
    it('returns a promise', () => {
      const queue = new MemoryQueue();
      const result = queue._push('test-key', { data: 'test' });
      expect(result).to.be.an.instanceof(Promise);
    });

    it('resolves successfully', () => {
      const queue = new MemoryQueue();
      return queue._push('test-key', { data: 'test' }).then((result) => {
        expect(result).to.be.undefined;
      });
    });

    it('stores items in the queue', () => {
      const queue = new MemoryQueue();
      const processorSpy = sinon.spy();

      return queue._push('test-key', { data: 'test1' })
        .then(() => queue._push('test-key', { data: 'test2' }))
        .then(() => {
          queue._consume('test-key', processorSpy);
          expect(processorSpy).to.have.been.calledTwice;
        });
    });
  });

  describe('#_consume', () => {
    it('processes all items in the queue', () => {
      const queue = new MemoryQueue();
      const processor = sinon.spy();

      // Push items first
      queue._push('key1', { data: 'item1' });
      queue._push('key2', { data: 'item2' });
      queue._push('key3', { data: 'item3' });

      // Consume
      queue._consume('selector', processor);

      expect(processor).to.have.been.calledThrice;
    });

    it('empties the queue after consuming', () => {
      const queue = new MemoryQueue();
      const processor = sinon.spy();

      queue._push('key1', { data: 'item1' });
      queue._push('key2', { data: 'item2' });

      queue._consume('selector', processor);
      expect(processor).to.have.been.calledTwice;

      // Consume again - should not process any items
      const processor2 = sinon.spy();
      queue._consume('selector', processor2);
      expect(processor2).to.not.have.been.called;
    });

    it('does nothing when queue is empty', () => {
      const queue = new MemoryQueue();
      const processor = sinon.spy();

      queue._consume('selector', processor);

      expect(processor).to.not.have.been.called;
    });

    it('passes key and data to the processor', () => {
      const queue = new MemoryQueue();
      const processor = sinon.spy();

      queue._push('my-key', { foo: 'bar' });
      queue._consume('selector', processor);

      expect(processor).to.have.been.calledOnce;
      const [key, data] = processor.getCall(0).args;
      expect(key).to.equal('my-key');
      expect(data).to.eql({ foo: 'bar' });
    });
  });

});
