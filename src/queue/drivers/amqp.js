import Queue from '../index';
import amqplib from 'amqplib';
import logger from '../../logger';

class AmqpQueue extends Queue {

  #url;
  #conn;
  #channel;
  #exchange;
  #topology;
  #connectRetries;

  constructor(params) {
    super(params);
    if (!params.url) {
      throw new Error('AMQP: url parameter required');
    }
    this.#url = params.url;
    this.#connectRetries = params.connectRetries || 10;
    this.#topology = params.topology;
    // Which is our default exchange (only can have one)
    const defaultExchanges = params.topology.exchanges.filter(ex => ex.default === true);
    if (defaultExchanges.length === 0) {
      throw new Error('AmqpQueue: one exchange must be set as default');
    }
    if (defaultExchanges.length > 1) {
      throw new Error('AmqpQueue: only one exchange can be set as default');
    }

    this.#exchange = defaultExchanges[0].name;
  }

  _installTopology() {
    const createExchanges = () => {
      const promises = this.#topology.exchanges.map((ex) => {
        return this.#channel.assertExchange(ex.name, ex.type, ex.options);
      });
      return Promise.all(promises);
    };
    const createQueues = () => {
      const promises = this.#topology.queues.map((q) => {
        return this.#channel.assertQueue(q.name, q.options);
      });
      return Promise.all(promises);
    };
    const createBindings = () => {
      const promises = [];
      this.#topology.queues.forEach((q) => {
        const bindings = q.bindings || [];
        promises.concat(bindings.map((binding) => {
          return this.#channel.bindQueue(q.name, binding.exchange, binding.routingKey);
        }));
      });
      return Promise.all(promises);
    };
    return createExchanges()
      .then(createQueues)
      .then(createBindings);
  }

  _connectWithRetries(attemptsLeft) {
    return amqplib
      // Connect
      .connect(this.#url)
      .catch((err) => {
        logger.warn(`Unable to connect to rabbitmq. ${attemptsLeft} attempts left.`);
        if (attemptsLeft <= 0) {
          logger.error('Unable to connect to rabbitmq... Giving up.');
          throw err;
        }
        return new Promise((resolve) => {
          setTimeout(() => {
            resolve(this._connectWithRetries(attemptsLeft - 1));
          }, 1000);
        });
      });
  }

  _connect() {
    return this._connectWithRetries(this.#connectRetries)
      .then(conn => {
        this.#conn = conn;
        // Propagate errors
        this.#conn.on('close', (err) => this.emit('close', err));
        this.#conn.on('error', (err) => this.emit('error', err));
        // Create channel
        return conn.createConfirmChannel();
      })
      .then((channel) => {
        this.#channel = channel;
        // Install topology
        // Propagate errors
        this.#channel.on('close', (err) => this.emit('close', err));
        this.#channel.on('error', (err) => this.emit('error', err));
        // Ensure topology exists
        return this._installTopology();
      })
      .then(() => this)
      .catch((err) => {
        this.emit('error', err);
      });
  }

  _push(key, data) {
    const payload = Buffer.from(JSON.stringify(data));
    const options = { persistent: true };
    return new Promise((resolve, reject) => {
      return this.#channel.publish(this.#exchange, key, payload, options, (err) => {
        if (err) {
          return reject(err);
        }
        return resolve(data);
      });
    });
  }

  _consume(queueName, processor) {
    this.#channel.consume(queueName, (msg) => {
      logger.info(`${this.constructor.name}: Decoding queue item`);
      let payload;
      try {
        payload = JSON.parse(msg.content);
      } catch (error) {
        // TODO expose that kind of error to monitoring
        logger.error(error, `${this.constructor.name}: Incorrect payload, invalid json`);
        // Nack with allUpTo=false & requeue=false
        return this.#channel.nack(msg, false, false);
      }
      logger.info(payload, `${this.constructor.name}: Forwarding queue item to processor`);
      processor(payload)
        .then(() => {
          logger.info(`${this.constructor.name}: Acking item consumption`);
          this.#channel.ack(msg);
        })
        .catch((err) => {
          logger.error(err, `${this.constructor.name}: NAcking(!) item consumption`);
          // Nack with allUpTo=false & requeue=false
          return this.#channel.nack(msg, false, false);
        });
    })
      .catch((err) => this.emit('error', err));
  }

}

export default AmqpQueue;
