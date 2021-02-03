import Queue from '../index';
import amqplib from 'amqplib';
import logger from '../../logger';

class AMQPQueue extends Queue {

  #url;
  #conn;
  #channel;
  #exchange;
  #selector;
  // for consumers only
  #queue;

  constructor(params) {
    super(params);
    this.#url = params.url;
    this.#exchange = params.exchange;
    this.#selector = params.selector;
  }

  _connect() {
    return amqplib
      // Connect
      .connect(this.#url)
      .then(conn => {
        this.#conn = conn;
        // Propagate errors
        this.#conn.on('close', (err) => this.emit('close', err));
        this.#conn.on('error', (err) => this.emit('error', err));
        // Create channel
        return conn.createChannel();
      })
      .then((channel) => {
        this.#channel = channel;
        // Propagate errors
        channel.on('close', (err) => this.emit('close', err));
        // Ensure exchange exists
        return channel.assertExchange(this.#exchange, 'topic', {
          durable: true
        });
      })
      .then(() => this)
      .catch((err) => {
        this.emit('error', err);
      });
  }

  _push(key, data) {
    const published = this.#channel.publish(this.#exchange, key, Buffer.from(JSON.stringify(data)));
    if (published) {
      return Promise.resolve();
    }
    return Promise.reject();
  }

  _consume(processor) {
    logger.info(`${this.constructor.name} assertQueue ${this.#selector}`);
    this.#channel.assertQueue(this.#selector)
      .then((q) => {
        // bind queue to exchange
        return this.#channel.bindQueue(q.queue, this.#exchange, this.#selector);
      })
      .then(() => {
        this.#channel.consume(this.#queue, (msg) => {
          logger.info(`${this.constructor.name}: Decoding queue item`);
          let payload;
          try {
            payload = JSON.parse(msg.content);
          } catch (error) {
            // TODO expose that kind of error to monitoring
            logger.error(error, `${this.constructor.name}: Incorrect payload, invalid json`);
            return this.#channel.nack(msg);
          }
          logger.info(payload, `${this.constructor.name}: Forwarding queue item to processor`);
          processor(payload)
            .then(() => {
              logger.info(`${this.constructor.name}: Acking item consumption`);
              this.#channel.ack(msg);
            })
            .catch((err) => {
              logger.error(err, `${this.constructor.name}: NAcking(!) item consumption`);
              this.#channel.nack(msg);
            });
        });
      })
      .catch((err) => this.emit('error', err));
  }

}

export default AMQPQueue;
