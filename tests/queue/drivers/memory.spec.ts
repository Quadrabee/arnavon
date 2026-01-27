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

    it('stores items in the queue', async () => {
      const queue = new MemoryQueue();
      const processorSpy = sinon.spy(() => Promise.resolve());

      await queue._push('test-key', { data: 'test1' });
      await queue._push('test-key', { data: 'test2' });
      await queue._consume('test-key', processorSpy);
      expect(processorSpy).to.have.been.calledTwice;
    });
  });

  describe('#_consume', () => {
    it('processes all items in the queue', async () => {
      const queue = new MemoryQueue();
      const processor = sinon.spy(() => Promise.resolve());

      // Push items first
      await queue._push('key1', { data: 'item1' });
      await queue._push('key2', { data: 'item2' });
      await queue._push('key3', { data: 'item3' });

      // Consume
      await queue._consume('selector', processor);

      expect(processor).to.have.been.calledThrice;
    });

    it('empties the queue after consuming', async () => {
      const queue = new MemoryQueue();
      const processor = sinon.spy(() => Promise.resolve());

      await queue._push('key1', { data: 'item1' });
      await queue._push('key2', { data: 'item2' });

      await queue._consume('selector', processor);
      expect(processor).to.have.been.calledTwice;

      // Consume again - should not process any items
      const processor2 = sinon.spy(() => Promise.resolve());
      await queue._consume('selector', processor2);
      expect(processor2).to.not.have.been.called;
    });

    it('does nothing when queue is empty', async () => {
      const queue = new MemoryQueue();
      const processor = sinon.spy(() => Promise.resolve());

      await queue._consume('selector', processor);

      expect(processor).to.not.have.been.called;
    });

    it('passes data and metadata to the processor', async () => {
      const queue = new MemoryQueue();
      const processor = sinon.spy(() => Promise.resolve());

      await queue._push('my-key', { foo: 'bar' });
      await queue._consume('selector', processor);

      expect(processor).to.have.been.calledOnce;
      const [data, metadata] = processor.getCall(0).args;
      expect(data).to.eql({ foo: 'bar' });
      expect(metadata).to.eql({ jobName: 'my-key' });
    });
  });

  describe('#_requeue', () => {
    it('requeues all messages from source queue to destination queue', async () => {
      const queue = new MemoryQueue();

      // Push items to a named "dlq" queue
      queue.pushToQueue('dlq', 'job-key', { data: 'item1' });
      queue.pushToQueue('dlq', 'job-key', { data: 'item2' });
      queue.pushToQueue('dlq', 'job-key', { data: 'item3' });

      const result = await queue._requeue('dlq', { destinationQueue: 'send-email' });

      expect(result.status).to.equal('completed');
      expect(result.requeued).to.equal(3);
      expect(result.failed).to.equal(0);
      expect(result.errors).to.eql([]);
      expect(queue.getQueueLength('dlq')).to.equal(0);
      expect(queue.getQueueLength('send-email')).to.equal(3);
    });

    it('requeues only the specified count of messages', async () => {
      const queue = new MemoryQueue();

      queue.pushToQueue('dlq', 'job-key', { data: 'item1' });
      queue.pushToQueue('dlq', 'job-key', { data: 'item2' });
      queue.pushToQueue('dlq', 'job-key', { data: 'item3' });

      const result = await queue._requeue('dlq', { destinationQueue: 'send-email', count: 2 });

      expect(result.requeued).to.equal(2);
      expect(result.failed).to.equal(0);
      expect(queue.getQueueLength('dlq')).to.equal(1);
      expect(queue.getQueueLength('send-email')).to.equal(2);
    });

    it('returns zero when source queue is empty', async () => {
      const queue = new MemoryQueue();

      const result = await queue._requeue('empty-dlq', { destinationQueue: 'send-email' });

      expect(result.status).to.equal('completed');
      expect(result.requeued).to.equal(0);
      expect(result.failed).to.equal(0);
      expect(result.errors).to.eql([]);
    });

    it('preserves original key when moving messages', async () => {
      const queue = new MemoryQueue();

      queue.pushToQueue('dlq', 'original-key', { data: 'item1' });

      await queue._requeue('dlq', { destinationQueue: 'send-email' });

      expect(queue.getQueueLength('send-email')).to.equal(1);
    });
  });

  describe('#pushToQueue', () => {
    it('pushes to a named queue', () => {
      const queue = new MemoryQueue();

      queue.pushToQueue('my-queue', 'key', { data: 'test' });

      expect(queue.getQueueLength('my-queue')).to.equal(1);
    });
  });

  describe('#getQueueLength', () => {
    it('returns length of default queue when no name provided', async () => {
      const queue = new MemoryQueue();

      await queue._push('key', { data: 'test' });

      expect(queue.getQueueLength()).to.equal(1);
    });

    it('returns length of named queue', () => {
      const queue = new MemoryQueue();

      queue.pushToQueue('named-queue', 'key', { data: 'test' });

      expect(queue.getQueueLength('named-queue')).to.equal(1);
      expect(queue.getQueueLength('other-queue')).to.equal(0);
    });
  });

});
