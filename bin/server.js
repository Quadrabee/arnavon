import { Config, Server } from '../src';

const config = Config.fromFile();
const server = new Server(config);
server.startServer();
