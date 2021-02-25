import { Config, Server } from '../src';

const config = Config.fromFile('example/config.yaml');
const server = new Server(config);
server.startServer();
