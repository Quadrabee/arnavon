import { Consumer, Config } from '../src';

const config = Config.fromFile('example/config.yaml');
const consumer = new Consumer(config);
consumer.start();
