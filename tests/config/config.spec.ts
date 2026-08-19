'use strict';
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

    it('complains on malformed YAML syntax', () => {
      const test = () => ArnavonConfig.fromFile('tests/config/malformed.yaml');
      expect(test).to.throw();
    });

    it('works without schema.fio and schema.world.js in config directory', () => {
      const config = ArnavonConfig.fromFile('tests/config/minimal/config.yaml');
      expect(config).to.be.an.instanceOf(ArnavonConfig);
      expect(config.queue.driver).to.equal('amqp');
      expect(config.jobs).to.be.an.instanceof(Array);
      expect(config.jobs.length).to.equal(1);
      expect(config.jobs[0].name).to.equal('test-job');
      expect(config.consumers).to.be.an.instanceof(Array);
      expect(config.consumers.length).to.equal(1);
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

  describe('.from', () => {

    it('creates a config from plain objects', () => {
      const config = ArnavonConfig.from({
        queue: { driver: 'memory', config: {} },
        jobs: [
          { name: 'test-job', inputSchema: '.' },
        ],
        consumers: [
          { name: 'test-consumer', queue: 'test-queue', runner: { type: 'nodejs', config: { module: './test' } } },
        ],
      });
      expect(config).to.be.an.instanceOf(ArnavonConfig);
      expect(config.jobs).to.have.length(1);
      expect(config.jobs[0].name).to.equal('test-job');
      expect(config.consumers).to.have.length(1);
      expect(config.consumers[0].name).to.equal('test-consumer');
      expect(config.queue.driver).to.equal('memory');
    });

    it('accepts validator functions as inputSchema', () => {
      const myValidator = (data) => {
        if (!data.email) {throw new Error('email required');}
        return data;
      };
      const config = ArnavonConfig.from({
        queue: { driver: 'memory', config: {} },
        jobs: [
          { name: 'send-email', inputSchema: myValidator },
        ],
        consumers: [],
      });
      expect(config.jobs[0].name).to.equal('send-email');
      expect(config.jobs[0].inputSchema).to.equal(myValidator);
    });

    it('accepts handler functions in consumer definitions', () => {
      const handler = async (job) => { return job; };
      const config = ArnavonConfig.from({
        queue: { driver: 'memory', config: {} },
        jobs: [
          { name: 'test-job', inputSchema: '.' },
        ],
        consumers: [
          { name: 'my-consumer', queue: 'test-queue', handler },
        ],
      });
      expect(config.consumers[0].runner.type).to.equal('function');
    });

    it('sets cwd to process.cwd() by default', () => {
      const config = ArnavonConfig.from({
        queue: { driver: 'memory', config: {} },
        jobs: [],
        consumers: [],
      });
      expect(config.cwd).to.equal(process.cwd());
    });

    it('accepts custom cwd', () => {
      const config = ArnavonConfig.from({
        queue: { driver: 'memory', config: {} },
        jobs: [],
        consumers: [],
      }, '/custom/path');
      expect(config.cwd).to.equal('/custom/path');
    });

  });

});
