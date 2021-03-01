import { Config, Server, default as Arnavon } from '../src';

const config = Config.fromFile('example/config.yaml');
Arnavon.init(config);
const server = new Server(config);
server.start();
