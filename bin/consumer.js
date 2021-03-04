import Arnavon, { Consumer, Config } from '../src';

const consumerId = process.argv[2];
if (!consumerId) {
  console.error('You must pass the name of a consumer you want to start');
  process.exit(10);
}
const config = Config.fromFile('example/config.yaml');
Arnavon.init(config);

const consumerConfig = config.consumers.find(c => c.name === consumerId);
if (!consumerConfig) {
  throw new Error(`Unable to find a config for consumer with name: ${consumerId}`);
}
const consumer = new Consumer(consumerConfig);
consumer.start();
