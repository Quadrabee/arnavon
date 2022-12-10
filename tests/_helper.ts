import { default as Arnavon, Config } from '../src';

beforeEach(() => {
  const config = Config.fromFile('example/config.yaml');
  Arnavon.init(config);
});
