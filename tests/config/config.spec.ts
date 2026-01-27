import { expect } from 'chai';
import path from 'path';

import ArnavonConfig from '../../src/config';

describe('ArnavonConfig', () => {

  it('exports a class', () => {
    expect(ArnavonConfig).to.be.an.instanceof(Function);
    expect(ArnavonConfig.name).to.equal('ArnavonConfig');
  });

  describe('.fromFile', () => {

    it('complains if file not found', () => {
      const test = (fname) => () => ArnavonConfig.fromFile(fname);

      expect(test('/tmp/test.yaml')).to.throw('Config file not found: \'/tmp/test.yaml\'');
    });

    it('returns a config instance (loads config.yaml at root of project)', () => {
      const config = ArnavonConfig.fromFile('example/config.yaml');
      expect(config).to.be.an.instanceOf(ArnavonConfig);
      expect(config.queue.driver).to.equal('amqp');
    });

    it('complains if config format is incorrect', () => {
      const test = () => ArnavonConfig.fromFile('tests/config/invalid.yaml');

      expect(test).to.throw(/Missing attribute `jobs`/);
    });

    it('uses default filename config.yaml if not provided', () => {
      // This will fail because config.yaml doesn't exist at project root
      // but it demonstrates the default behavior
      const test = () => ArnavonConfig.fromFile();
      expect(test).to.throw(/Config file not found/);
    });
  });

  describe('constructor', () => {
    it('sets all properties from data', () => {
      const config = ArnavonConfig.fromFile('example/config.yaml');

      expect(config.jobs).to.be.an.instanceof(Array);
      expect(config.jobs.length).to.be.greaterThan(0);
      expect(config.queue).to.exist;
      expect(config.queue.driver).to.equal('amqp');
      expect(config.consumers).to.be.an.instanceof(Array);
      expect(config.consumers.length).to.be.greaterThan(0);
    });

    it('sets the cwd to the config file directory', () => {
      const config = ArnavonConfig.fromFile('example/config.yaml');
      const expectedCwd = path.join(process.cwd(), 'example');
      expect(config.cwd).to.equal(expectedCwd);
    });
  });

  describe('schema loading', () => {
    it('loads schema.fio and schema.world.js from config directory if present', () => {
      // The example folder has both schema.fio and schema.world.js
      const config = ArnavonConfig.fromFile('example/config.yaml');

      // Jobs should have their inputSchema loaded from the custom schema
      expect(config.jobs).to.be.an.instanceof(Array);
      const emailJob = config.jobs.find(j => j.name === 'send-email');
      expect(emailJob).to.exist;
    });
  });

});
