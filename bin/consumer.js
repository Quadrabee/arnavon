import Arnavon, { Consumer, Config } from '../src';

const consumerId = process.argv[2];
const config = Config.fromFile('example/config.yaml');
Arnavon.init(config);

const consumerConfig = config.consumers.find(c => c.id === consumerId);
if (!consumerConfig) {
  throw new Error(`Unable to find a config for consumer with ID: ${consumerId}`);
}
const consumer = new Consumer(consumerConfig);
consumer.start();
