'use strict';
import { expect, use, should } from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import AmqpQueue from '../../../src/queue/drivers/amqp';
import Config from '../../../src/config';
import amqplib from 'amqplib';

should();
use(sinonChai);

// Helpers to build a mock AMQP connection and channel
function createMockChannel(overrides: Record<string, any> = {}) {
  return {
    prefetch: sinon.stub(),
    assertExchange: sinon.stub().resolves(),
    assertQueue: sinon.stub().resolves(),
    bindQueue: sinon.stub().resolves(),
    publish: sinon.stub().callsFake((exchange, key, content, options, cb) => cb && cb(null)),
    consume: sinon.stub().resolves(),
    ack: sinon.stub(),
    nack: sinon.stub(),
    reject: sinon.stub(),
    on: sinon.stub(),
    ...overrides,
  };
}

function createMockConnection(channel) {
  return {
    createConfirmChannel: sinon.stub().resolves(channel),
    on: sinon.stub(),
    close: sinon.stub().resolves(),
  };
}

async function connectQueue(config, sandbox) {
  const channel = createMockChannel();
  const conn = createMockConnection(channel);
  sandbox.stub(amqplib, 'connect').resolves(conn);
  const queue = new AmqpQueue(config);
  await queue._connect();
  return { queue, channel, conn };
}

describe('AmqpQueue', () => {

  let config;
  beforeEach(() => {
    config = Config.fromFile('example/config.yaml');
    delete process.env.AMQP_URL;
  });

  afterEach(() => {
    delete process.env.AMQP_URL;
  });

  it('exports the AmqpQueue class', () => {
    expect(AmqpQueue).to.be.an.instanceof(Function);
  });

  describe('constructor', () => {
    it('returns an instance of AmqpQueue', () => {
      const queue = new AmqpQueue(config.queue.config);
      expect(queue).to.be.an.instanceof(AmqpQueue);
    });

    it('complains if no default exchange is defined', () => {
      delete config.queue.config.topology.exchanges[0].default;
      expect(() => new AmqpQueue(config.queue.config)).to.throw(/one exchange must be set as default/);
    });

    it('complains if more than one exchange is defined as default', () => {
      config.queue.config.topology.exchanges.push({ name: 'second', default: true, type: 'topic' });
      expect(() => new AmqpQueue(config.queue.config)).to.throw(/only one exchange can be set as default/);
    });

    it('complains if no url is provided and AMQP_URL env var is not set', () => {
      const cfg = { ...config.queue.config };
      delete cfg.url;
      expect(() => new AmqpQueue(cfg)).to.throw(/AMQP: url parameter required/);
    });

    it('uses AMQP_URL env var if url parameter is not provided', () => {
      process.env.AMQP_URL = 'amqp://env-host:5672';
      const cfg = { ...config.queue.config };
      delete cfg.url;
      const queue = new AmqpQueue(cfg);
      expect((queue as any).url).to.equal('amqp://env-host:5672');
    });

    it('uses AMQP_URL env var over url parameter when both are present', () => {
      process.env.AMQP_URL = 'amqp://env-host:5672';
      const queue = new AmqpQueue(config.queue.config);
      expect((queue as any).url).to.equal('amqp://env-host:5672');
    });

    it('uses default values for connectRetries and prefetchCount', () => {
      const queue = new AmqpQueue({ url: 'amqp://localhost', topology: config.queue.config.topology });
      expect(queue).to.be.an.instanceof(AmqpQueue);
    });
  });

  describe('.deriveManagementUrl', () => {
    it('derives management URL from AMQP URL', () => {
      const result = AmqpQueue.deriveManagementUrl('amqp://user:pass@myhost:5672/myvhost');
      expect(result.url).to.equal('http://myhost:15672');
      expect(result.vhost).to.equal('myvhost');
      expect(result.auth).to.equal(Buffer.from('user:pass').toString('base64'));
    });

    it('uses default vhost when none specified', () => {
      const result = AmqpQueue.deriveManagementUrl('amqp://user:pass@myhost:5672');
      expect(result.vhost).to.equal('/');
    });

    it('builds AMQP URI for shovel with encoded vhost', () => {
      const result = AmqpQueue.deriveManagementUrl('amqp://user:pass@myhost:5672/my%2Fvhost');
      expect(result.amqpUri).to.include('user:pass@myhost:5672');
    });

    it('handles URL with query string', () => {
      const result = AmqpQueue.deriveManagementUrl('amqp://user:pass@myhost:5672?heartbeat=30');
      expect(result.url).to.equal('http://myhost:15672');
      expect(result.vhost).to.equal('/');
    });
  });

  describe('#_installTopology', () => {
    it('throws an error if no channel is available', () => {
      const queue = new AmqpQueue(config.queue.config);
      expect(() => queue._installTopology()).to.throw(/Cannot install topology, no channel found/);
    });
  });

  describe('#_connect', () => {
    const sandbox = sinon.createSandbox();
    afterEach(() => sandbox.restore());

    it('connects and installs topology', async () => {
      const channel = createMockChannel();
      const conn = createMockConnection(channel);
      sandbox.stub(amqplib, 'connect').resolves(conn);

      const queue = new AmqpQueue(config.queue.config);
      await queue._connect();

      expect(conn.createConfirmChannel).to.be.calledOnce;
      expect(channel.prefetch).to.be.calledOnceWith(5);
      expect(channel.assertExchange.callCount).to.equal(3);
      expect(channel.assertQueue.callCount).to.equal(4);
    });

    it('retries on connection failure then succeeds', async () => {
      const channel = createMockChannel();
      const conn = createMockConnection(channel);
      let callCount = 0;
      sandbox.stub(amqplib, 'connect').callsFake(() => {
        callCount++;
        if (callCount === 1) {return Promise.reject(new Error('ECONNREFUSED'));}
        return Promise.resolve(conn);
      });

      const queue = new AmqpQueue({
        url: 'amqp://localhost',
        connectRetries: 3,
        topology: config.queue.config.topology,
      });
      await queue._connect();

      expect(callCount).to.be.at.least(2);
    }).timeout(5000);

    it('propagates connection close events', async () => {
      const channel = createMockChannel();
      const conn = createMockConnection(channel);
      sandbox.stub(amqplib, 'connect').resolves(conn);

      const queue = new AmqpQueue(config.queue.config);
      const closeSpy = sinon.spy();
      queue.on('close', closeSpy);
      await queue._connect();

      const closeHandler = conn.on.getCalls().find(c => c.args[0] === 'close');
      closeHandler.args[1](new Error('connection closed'));
      expect(closeSpy).to.be.calledOnce;
    });

    it('propagates connection error events', async () => {
      const channel = createMockChannel();
      const conn = createMockConnection(channel);
      sandbox.stub(amqplib, 'connect').resolves(conn);

      const queue = new AmqpQueue(config.queue.config);
      const errorSpy = sinon.spy();
      queue.on('error', errorSpy);
      await queue._connect();

      const errorHandler = conn.on.getCalls().find(c => c.args[0] === 'error');
      errorHandler.args[1](new Error('connection error'));
      expect(errorSpy).to.be.calledOnce;
    });
  });

  describe('#_push', () => {
    const sandbox = sinon.createSandbox();
    afterEach(() => sandbox.restore());

    it('throws an error if no channel is available', () => {
      const queue = new AmqpQueue(config.queue.config);
      expect(() => queue._push('key', { data: 'test' }, { exchange: 'test' })).to.throw(/Cannot push, no channel found/);
    });

    it('publishes JSON-serialized data to the default exchange', async () => {
      const { queue, channel } = await connectQueue(config.queue.config, sandbox);
      const data = { foo: 'bar' };
      await queue._push('my-key', data, {});

      expect(channel.publish).to.be.calledOnce;
      const [exchange, key, payload, options] = channel.publish.getCall(0).args;
      expect(exchange).to.equal('example-arnavon');
      expect(key).to.equal('my-key');
      expect(JSON.parse(payload.toString())).to.eql(data);
      expect(options.persistent).to.be.true;
    });

    it('publishes to a custom exchange when specified', async () => {
      const { queue, channel } = await connectQueue(config.queue.config, sandbox);
      await queue._push('my-key', { foo: 'bar' }, { exchange: 'custom-exchange' });
      expect(channel.publish.getCall(0).args[0]).to.equal('custom-exchange');
    });

    it('forwards headers in publish options', async () => {
      const { queue, channel } = await connectQueue(config.queue.config, sandbox);
      const headers = { 'x-delay': '5000' };
      await queue._push('my-key', {}, { exchange: undefined, headers });
      expect(channel.publish.getCall(0).args[3].headers).to.eql(headers);
    });

    it('rejects when publish reports an error', async () => {
      const channel = createMockChannel({
        publish: sinon.stub().callsFake((ex, key, content, opts, cb) => cb(new Error('publish failed'))),
      });
      const conn = createMockConnection(channel);
      sandbox.stub(amqplib, 'connect').resolves(conn);
      const queue = new AmqpQueue(config.queue.config);
      await queue._connect();

      try {
        await queue._push('key', {}, {});
        throw new Error('should have rejected');
      } catch (err) {
        expect(err.message).to.equal('publish failed');
      }
    });
  });

  describe('#_consume', () => {
    const sandbox = sinon.createSandbox();
    afterEach(() => sandbox.restore());

    it('throws an error if no channel is available', () => {
      const queue = new AmqpQueue(config.queue.config);
      expect(() => queue._consume('queue-name', () => Promise.resolve())).to.throw(/Cannot consume, no channel found/);
    });

    it('starts consuming from the specified queue', async () => {
      const { queue, channel } = await connectQueue(config.queue.config, sandbox);
      await queue._consume('my-queue', sinon.stub().resolves());
      expect(channel.consume).to.be.calledOnce;
      expect(channel.consume.getCall(0).args[0]).to.equal('my-queue');
    });

    it('ACKs on successful processing', async () => {
      const channel = createMockChannel({
        consume: sinon.stub().callsFake((queueName, handler) => {
          handler({
            content: Buffer.from(JSON.stringify({ payload: 'test', meta: {} })),
            fields: { routingKey: 'test' },
          });
          return Promise.resolve();
        }),
      });
      const conn = createMockConnection(channel);
      sandbox.stub(amqplib, 'connect').resolves(conn);
      const queue = new AmqpQueue(config.queue.config);
      await queue._connect();

      const processor = sinon.stub().resolves();
      await queue._consume('my-queue', processor);
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(processor).to.be.calledOnce;
      expect(channel.ack).to.be.calledOnce;
    });

    it('NACKs (rejects) on processor failure', async () => {
      const channel = createMockChannel({
        consume: sinon.stub().callsFake((queueName, handler) => {
          handler({
            content: Buffer.from(JSON.stringify({ payload: 'test', meta: {} })),
            fields: { routingKey: 'test' },
          });
          return Promise.resolve();
        }),
      });
      const conn = createMockConnection(channel);
      sandbox.stub(amqplib, 'connect').resolves(conn);
      const queue = new AmqpQueue(config.queue.config);
      await queue._connect();

      const processor = sinon.stub().rejects(new Error('processing failed'));
      await queue._consume('my-queue', processor);
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(channel.reject).to.be.calledOnce;
      expect(channel.reject.getCall(0).args[1]).to.be.false;
    });

    it('NACKs on invalid JSON payload', async () => {
      const channel = createMockChannel({
        consume: sinon.stub().callsFake((queueName, handler) => {
          handler({ content: Buffer.from('not valid json{{{'), fields: {} });
          return Promise.resolve();
        }),
      });
      const conn = createMockConnection(channel);
      sandbox.stub(amqplib, 'connect').resolves(conn);
      const queue = new AmqpQueue(config.queue.config);
      await queue._connect();

      const processor = sinon.stub().resolves();
      await queue._consume('my-queue', processor);
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(processor).to.not.have.been.called;
      expect(channel.nack).to.be.calledOnce;
      expect(channel.nack.getCall(0).args[1]).to.be.false;
      expect(channel.nack.getCall(0).args[2]).to.be.false;
    });

    it('handles null message (consumption cancelled)', async () => {
      const channel = createMockChannel({
        consume: sinon.stub().callsFake((queueName, handler) => {
          handler(null);
          return Promise.resolve();
        }),
      });
      const conn = createMockConnection(channel);
      sandbox.stub(amqplib, 'connect').resolves(conn);
      const queue = new AmqpQueue(config.queue.config);
      await queue._connect();

      const processor = sinon.stub().resolves();
      await queue._consume('my-queue', processor);

      expect(processor).to.not.have.been.called;
      expect(channel.ack).to.not.have.been.called;
      expect(channel.nack).to.not.have.been.called;
    });

    it('passes parsed payload and metadata to processor', async () => {
      const jobData = { payload: { email: 'test@test.com' }, meta: { id: '123' } };
      const channel = createMockChannel({
        consume: sinon.stub().callsFake((queueName, handler) => {
          handler({
            content: Buffer.from(JSON.stringify(jobData)),
            fields: { routingKey: 'send-email', deliveryTag: 42 },
          });
          return Promise.resolve();
        }),
      });
      const conn = createMockConnection(channel);
      sandbox.stub(amqplib, 'connect').resolves(conn);
      const queue = new AmqpQueue(config.queue.config);
      await queue._connect();

      const processor = sinon.stub().resolves();
      await queue._consume('my-queue', processor);
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(processor).to.be.calledOnce;
      const [payload, metadata] = processor.getCall(0).args;
      expect(payload).to.eql(jobData);
      expect(metadata.routingKey).to.equal('send-email');
    });
  });

  describe('#_disconnect', () => {
    const sandbox = sinon.createSandbox();
    afterEach(() => sandbox.restore());

    it('closes the connection', async () => {
      const { queue, conn } = await connectQueue(config.queue.config, sandbox);
      await queue._disconnect();
      expect(conn.close).to.be.calledOnce;
    });

    it('handles disconnect when not connected', async () => {
      const queue = new AmqpQueue(config.queue.config);
      await queue._disconnect();
    });
  });

  describe('#_requeue', () => {
    const sandbox = sinon.createSandbox();
    let queue, fetchStub;

    beforeEach(async () => {
      const result = await connectQueue(config.queue.config, sandbox);
      queue = result.queue;
      fetchStub = sandbox.stub(globalThis, 'fetch');
    });

    afterEach(() => sandbox.restore());

    it('creates a shovel to requeue messages', async () => {
      fetchStub.onFirstCall().resolves({ ok: false, status: 404 });
      fetchStub.onSecondCall().resolves({
        ok: true,
        json: () => Promise.resolve({ messages: 5 }),
      });
      fetchStub.onThirdCall().resolves({ ok: true });

      const result = await queue._requeue('dead-letters', {});

      expect(result.status).to.equal('initiated');
      expect(result.requeued).to.equal(5);
      expect(fetchStub.callCount).to.equal(3);

      const createCall = fetchStub.getCall(2);
      expect(createCall.args[1].method).to.equal('PUT');
      const body = JSON.parse(createCall.args[1].body);
      expect(body.value['src-queue']).to.equal('dead-letters');
      expect(body.value['dest-exchange']).to.equal('example-arnavon');
    });

    it('limits requeue count when specified', async () => {
      fetchStub.onFirstCall().resolves({ ok: false, status: 404 });
      fetchStub.onSecondCall().resolves({
        ok: true,
        json: () => Promise.resolve({ messages: 100 }),
      });
      fetchStub.onThirdCall().resolves({ ok: true });

      const result = await queue._requeue('dead-letters', { count: 10 });
      expect(result.requeued).to.equal(10);
      const body = JSON.parse(fetchStub.getCall(2).args[1].body);
      expect(body.value['src-delete-after']).to.equal(10);
    });

    it('throws when a requeue is already in progress', async () => {
      fetchStub.onFirstCall().resolves({ ok: true });

      try {
        await queue._requeue('dead-letters', {});
        throw new Error('should have thrown');
      } catch (err) {
        expect(err.message).to.include('already in progress');
      }
    });

    it('throws when shovel plugin is not available', async () => {
      fetchStub.onFirstCall().resolves({ ok: false, status: 404 });
      fetchStub.onSecondCall().resolves({
        ok: true,
        json: () => Promise.resolve({ messages: 5 }),
      });
      fetchStub.onThirdCall().resolves({
        ok: false,
        status: 404,
        text: () => Promise.resolve('Not Found'),
      });

      try {
        await queue._requeue('dead-letters', {});
        throw new Error('should have thrown');
      } catch (err) {
        expect(err.message).to.include('Shovel plugin not available');
      }
    });

    it('throws on authentication failure', async () => {
      fetchStub.onFirstCall().resolves({ ok: false, status: 404 });
      fetchStub.onSecondCall().resolves({
        ok: true,
        json: () => Promise.resolve({ messages: 5 }),
      });
      fetchStub.onThirdCall().resolves({
        ok: false,
        status: 401,
        text: () => Promise.resolve('Unauthorized'),
      });

      try {
        await queue._requeue('dead-letters', {});
        throw new Error('should have thrown');
      } catch (err) {
        expect(err.message).to.include('authentication failed');
      }
    });
  });

  describe('#_getQueuesInfo', () => {
    const sandbox = sinon.createSandbox();
    let queue, fetchStub;

    beforeEach(async () => {
      const result = await connectQueue(config.queue.config, sandbox);
      queue = result.queue;
      fetchStub = sandbox.stub(globalThis, 'fetch');
    });

    afterEach(() => sandbox.restore());

    it('fetches info for each queue from management API', async () => {
      fetchStub.onFirstCall().resolves({
        ok: true,
        json: () => Promise.resolve({ name: 'q1', messages: 10, consumers: 2, state: 'running' }),
      });
      fetchStub.onSecondCall().resolves({
        ok: true,
        json: () => Promise.resolve({ name: 'q2', messages: 0, consumers: 0, state: 'idle' }),
      });

      const result = await queue._getQueuesInfo(['q1', 'q2']);
      expect(result).to.have.length(2);
      expect(result[0]).to.eql({ name: 'q1', messages: 10, consumers: 2, state: 'running' });
      expect(result[1]).to.eql({ name: 'q2', messages: 0, consumers: 0, state: 'idle' });
    });

    it('returns unknown state for non-existent queues (404)', async () => {
      fetchStub.resolves({ ok: false, status: 404 });
      const result = await queue._getQueuesInfo(['missing-queue']);
      expect(result[0]).to.eql({ name: 'missing-queue', messages: 0, consumers: 0, state: 'unknown' });
    });

    it('returns unknown state on network errors', async () => {
      fetchStub.rejects(new Error('ECONNREFUSED'));
      const result = await queue._getQueuesInfo(['some-queue']);
      expect(result[0]).to.eql({ name: 'some-queue', messages: 0, consumers: 0, state: 'unknown' });
    });

    it('returns unknown state for non-200/404 responses', async () => {
      fetchStub.resolves({ ok: false, status: 500 });
      const result = await queue._getQueuesInfo(['some-queue']);
      expect(result[0].state).to.equal('unknown');
    });
  });

});
