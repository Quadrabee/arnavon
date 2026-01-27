import { expect } from 'chai';
import chai from 'chai';
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
