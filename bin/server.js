import { Config, Server, Queue } from '../src';

const config = Config.fromFile();
const queue = Queue.create(config.queue);
const server = new Server(config, queue);
server.startServer();
