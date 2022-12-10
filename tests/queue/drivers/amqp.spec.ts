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
  });

});
