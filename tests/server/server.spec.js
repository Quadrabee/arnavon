import Server from '../../src/server';
import Config from '../../src/config';
import { expect } from 'chai';

describe('Server', () => {

  let config, server;
  beforeEach(() => {
    config = Config.fromFile('example/config.yaml');
    server = new Server(config);
  });

  it('is a class', () => {
    expect(Server).to.be.a.instanceof(Function);
  });

  describe('its constructor', () => {
    it('expects an ArnavonConfig instance', () => {
      expect(() => new Server()).to.throw(/ArnavonConfig expected/);
    });

    it('it works', () => {
      expect(server).to.be.an.instanceof(Server);
    });
  });

  describe('#start', () => {
    it('is a function', () => {
      expect(server.start).to.be.an.instanceOf(Function);
    });
  });
});
