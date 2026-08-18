'use strict';
import { expect } from 'chai';
import ArnavonApp from '../src/app';
import MemoryQueue from '../src/queue/drivers/memory';

describe('ArnavonApp', () => {

  it('exports a class', () => {
    expect(ArnavonApp).to.be.an.instanceof(Function);
    expect(ArnavonApp.name).to.equal('ArnavonApp');
  });

  describe('constructor', () => {
    it('creates an instance with a queue definition', () => {
      const app = new ArnavonApp({ queue: { driver: 'memory', config: {} } });
      expect(app).to.be.an.instanceof(ArnavonApp);
    });

    it('creates a queue from the definition', () => {
      const app = new ArnavonApp({ queue: { driver: 'memory', config: {} } });
      expect(app.queue).to.be.an.instanceof(MemoryQueue);
    });

    it('creates its own prometheus registry', () => {
      const app = new ArnavonApp({ queue: { driver: 'memory', config: {} } });
      expect(app.registry).to.exist;
    });
  });

  describe('#job', () => {
    it('registers a job definition and returns self for chaining', () => {
      const app = new ArnavonApp({ queue: { driver: 'memory', config: {} } });
      const result = app.job('send-email', { inputSchema: '.' });
      expect(result).to.equal(app);
    });

    it('accepts a validator function', () => {
      const app = new ArnavonApp({ queue: { driver: 'memory', config: {} } });
      app.job('send-email', { validate: (data) => data });
      // No error thrown
    });
  });

  describe('#consumer', () => {
    it('registers a consumer with a handler and returns self for chaining', () => {
      const app = new ArnavonApp({ queue: { driver: 'memory', config: {} } });
      const result = app.consumer('mailer', {
        queue: 'emails',
        handler: async (job) => job,
      });
      expect(result).to.equal(app);
    });

    it('registers a consumer with a runner config', () => {
      const app = new ArnavonApp({ queue: { driver: 'memory', config: {} } });
      app.consumer('mailer', {
        queue: 'emails',
        runner: { type: 'nodejs', config: { module: './test' } },
      });
      // No error thrown
    });
  });

  describe('#startApi', () => {
    it('starts a server and can be stopped', async () => {
      const app = new ArnavonApp({ queue: { driver: 'memory', config: {} } });
      app.job('test-job', { inputSchema: '.' });
      await app.startApi({ port: 0 }); // port 0 = random available port
      await app.stop();
    });
  });

  describe('#startConsumer', () => {
    it('throws if consumer name not found', async () => {
      const app = new ArnavonApp({ queue: { driver: 'memory', config: {} } });
      app.job('test-job', { inputSchema: '.' });

      try {
        await app.startConsumer('nonexistent');
        throw new Error('should have thrown');
      } catch (err) {
        expect(err.message).to.include('No consumer with name');
      }
    });
  });

  describe('#startAllConsumers', () => {
    it('throws if no consumers defined', async () => {
      const app = new ArnavonApp({ queue: { driver: 'memory', config: {} } });

      try {
        await app.startAllConsumers();
        throw new Error('should have thrown');
      } catch (err) {
        expect(err.message).to.include('No consumers to start');
      }
    });
  });

  describe('.fromYaml', () => {
    it('creates an ArnavonApp from a YAML config file', () => {
      const app = ArnavonApp.fromYaml('example/config.yaml');
      expect(app).to.be.an.instanceof(ArnavonApp);
    });

    it('throws for non-existent config file', () => {
      expect(() => ArnavonApp.fromYaml('nonexistent.yaml')).to.throw(/Config file not found/);
    });
  });

  describe('fluent API', () => {
    it('allows chaining job and consumer definitions', () => {
      const app = new ArnavonApp({ queue: { driver: 'memory', config: {} } })
        .job('send-email', { validate: (d) => d })
        .job('log-info', { inputSchema: '.' })
        .consumer('mailer', { queue: 'emails', handler: async (job) => job })
        .consumer('logger', { queue: 'logs', handler: async (job) => job });

      expect(app).to.be.an.instanceof(ArnavonApp);
    });
  });

});
