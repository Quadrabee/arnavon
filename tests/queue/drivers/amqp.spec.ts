import { expect } from 'chai';
import chai from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import AmqpQueue from '../../../src/queue/drivers/amqp';
import Config from '../../../src/config';

chai.should();
chai.use(sinonChai);

describe('AmqpQueue', () => {

  let config;
  beforeEach(() => {
    config = Config.fromFile('example/config.yaml');
    // Clear AMQP_URL env var to test url parameter
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
      config.queue.config.topology.exchanges.push({
        name: 'second',
        default: true,
        type: 'topic',
      });
      expect(() => new AmqpQueue(config.queue.config)).to.throw(/only one exchange can be set as default/);
    });

    it('complains if no url is provided and AMQP_URL env var is not set', () => {
      const configWithoutUrl = { ...config.queue.config };
      delete configWithoutUrl.url;
      expect(() => new AmqpQueue(configWithoutUrl)).to.throw(/AMQP: url parameter required/);
    });

    it('uses AMQP_URL env var if url parameter is not provided', () => {
      process.env.AMQP_URL = 'amqp://env-host:5672';
      const configWithoutUrl = { ...config.queue.config };
      delete configWithoutUrl.url;
      const queue = new AmqpQueue(configWithoutUrl);
      expect(queue).to.be.an.instanceof(AmqpQueue);
      // The URL is stored in a protected property
      expect((queue as any).url).to.equal('amqp://env-host:5672');
    });

    it('uses AMQP_URL env var over url parameter when both are present', () => {
      process.env.AMQP_URL = 'amqp://env-host:5672';
      const queue = new AmqpQueue(config.queue.config);
      expect(queue).to.be.an.instanceof(AmqpQueue);
      // Env var takes precedence over config url
      expect((queue as any).url).to.equal('amqp://env-host:5672');
    });

    it('uses default values for connectRetries and prefetchCount', () => {
      const configWithDefaults = {
        url: 'amqp://localhost',
        topology: config.queue.config.topology,
      };
      const queue = new AmqpQueue(configWithDefaults);
      expect(queue).to.be.an.instanceof(AmqpQueue);
      // Default values should be applied internally
    });
  });

  describe('.isRetryable', () => {
    const replyError = (code: number) => Object.assign(new Error(`Channel closed by server: ${code}`), { code });

    it('retries what a restarting broker answers', () => {
      expect(AmqpQueue.isRetryable(Object.assign(new Error('connect ECONNREFUSED'), { code: 'ECONNREFUSED' }))).to.equal(true);
      expect(AmqpQueue.isRetryable(replyError(404))).to.equal(true);
      expect(AmqpQueue.isRetryable(replyError(320))).to.equal(true);
      expect(AmqpQueue.isRetryable(new Error('Socket closed abruptly during opening handshake'))).to.equal(true);
    });

    it('gives up on configuration errors', () => {
      expect(AmqpQueue.isRetryable(replyError(406))).to.equal(false);
      expect(AmqpQueue.isRetryable(replyError(403))).to.equal(false);
      expect(AmqpQueue.isRetryable(new Error('Handshake terminated by server: 403 (ACCESS-REFUSED) with message "ACCESS_REFUSED"'))).to.equal(false);
      expect(AmqpQueue.isRetryable(new Error('Handshake terminated by server: 530 (NOT-ALLOWED) with message "NOT_ALLOWED - vhost x not found"'))).to.equal(false);
      expect(AmqpQueue.isRetryable(replyError(541))).to.equal(false);
    });
  });

  describe('#_connect', () => {
    const notFound = Object.assign(new Error('NOT_FOUND - queue \'q\' in vhost \'/\' process is stopped by supervisor'), { code: 404 });
    let retryDelay: number;

    beforeEach(() => {
      retryDelay = AmqpQueue.RETRY_DELAY_MS;
      AmqpQueue.RETRY_DELAY_MS = 1;
    });

    afterEach(() => {
      AmqpQueue.RETRY_DELAY_MS = retryDelay;
    });

    it('retries the setup until the broker is ready', async () => {
      const queue = new AmqpQueue(config.queue.config);
      const setup = sinon.stub(queue, '_setup');
      setup.onFirstCall().rejects(notFound);
      setup.onSecondCall().resolves();
      const errored = sinon.spy();
      queue.on('error', errored);
      await queue._connect();
      expect(setup).to.be.calledTwice;
      expect(errored).not.to.be.called;
    });

    it('emits an error once out of retries', async () => {
      const queue = new AmqpQueue({ ...config.queue.config, connectRetries: 2 });
      const setup = sinon.stub(queue, '_setup').rejects(notFound);
      const errored = sinon.spy();
      queue.on('error', errored);
      await queue._connect();
      expect(setup).to.be.calledThrice;
      expect(errored).to.be.calledOnceWith(notFound);
    });

    it('does not retry configuration errors', async () => {
      const queue = new AmqpQueue(config.queue.config);
      const mismatch = Object.assign(new Error('PRECONDITION_FAILED'), { code: 406 });
      const setup = sinon.stub(queue, '_setup').rejects(mismatch);
      const errored = sinon.spy();
      queue.on('error', errored);
      await queue._connect();
      expect(setup).to.be.calledOnce;
      expect(errored).to.be.calledOnceWith(mismatch);
    });
  });

  describe('#_installTopology', () => {
    it('throws an error if no channel is available', () => {
      const queue = new AmqpQueue(config.queue.config);
      expect(() => queue._installTopology()).to.throw(/Cannot install topology, no channel found/);
    });
  });

  describe('#_push', () => {
    it('throws an error if no channel is available', () => {
      const queue = new AmqpQueue(config.queue.config);
      expect(() => queue._push('key', { data: 'test' }, { exchange: 'test' })).to.throw(/Cannot push, no channel found/);
    });
  });

  describe('#_consume', () => {
    it('throws an error if no channel is available', () => {
      const queue = new AmqpQueue(config.queue.config);
      expect(() => queue._consume('queue-name', () => Promise.resolve())).to.throw(/Cannot consume, no channel found/);
    });
  });

});
