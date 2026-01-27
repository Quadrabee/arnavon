import { Consumer, Server, Config, Queue, default as Arnavon } from '../src/index';
import { expect } from 'chai';
import promClient from 'prom-client';
import ArnavonConfig from '../src/config';

describe('The Arnavon package', () => {

  it('exports the Consumer class', () => {
    expect(Consumer).to.be.an.instanceof(Function);
  });

  it('exports the Server class', () => {
    expect(Server).to.be.an.instanceof(Function);
  });

  it('exports the Config class', () => {
    expect(Config).to.be.an.instanceof(Function);
    expect(Config).to.equal(ArnavonConfig);
  });

  it('exports the Queue class', () => {
    expect(Queue).to.be.an.instanceof(Function);
  });

  describe('the Arnavon instance', () => {
    it('exposes a prometheus registry', () => {
      expect(Arnavon.registry).to.be.an.instanceof(promClient.Registry);
    });
  });

  describe('Arnavon.reset', () => {
    it('allows our tests to reset Arnavon\'s module', () => {
      const registry1 = Arnavon.registry;
      Arnavon.reset();
      const registry2 = Arnavon.registry;
      expect(registry1 === registry2).to.equal(false);
    });

    it('re-registers default metrics on the new registry', () => {
      Arnavon.reset();
      const metrics = Arnavon.registry.getMetricsAsArray();
      // Default metrics should be registered
      expect(metrics.length).to.be.greaterThan(0);
    });
  });

  describe('Arnavon.init', () => {
    it('expects an ArnavonConfig instance', () => {
      const test = (c) => () => Arnavon.init(c);
      expect(test()).to.throw(/ArnavonConfig expected, got/);
      expect(test(null)).to.throw(/ArnavonConfig expected, got/);
      expect(test([])).to.throw(/ArnavonConfig expected, got/);
      expect(test({})).to.throw(/ArnavonConfig expected, got/);
    });

    it('initializes the queue from config', () => {
      const config = Config.fromFile('example/config.yaml');
      Arnavon.init(config);
      expect(Arnavon.queue).to.exist;
      expect(Arnavon.config).to.equal(config);
    });

    it('resets the registry when initializing', () => {
      const config = Config.fromFile('example/config.yaml');
      const registry1 = Arnavon.registry;
      Arnavon.init(config);
      const registry2 = Arnavon.registry;
      expect(registry1 === registry2).to.equal(false);
    });
  });

  describe('Arnavon.cwd', () => {
    it('returns the config cwd', () => {
      const config = Config.fromFile('example/config.yaml');
      Arnavon.init(config);
      expect(Arnavon.cwd()).to.equal(config.cwd);
    });
  });

  describe('Arnavon.require', () => {
    it('requires a file relative to the config cwd', () => {
      const config = Config.fromFile('example/config.yaml');
      Arnavon.init(config);
      // The example config has a schema.world.js file
      const schemaWorld = Arnavon.require('schema.world.js');
      expect(schemaWorld).to.exist;
    });
  });

});
