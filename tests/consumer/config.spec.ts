'use strict';
import { expect } from 'chai';
import ConsumerConfig from '../../src/consumer/config';

describe('ConsumerConfig', () => {

  it('exports a class', () => {
    expect(ConsumerConfig).to.be.an.instanceof(Function);
    expect(ConsumerConfig.name).to.equal('ConsumerConfig');
  });

  describe('its constructor', () => {

    it('throws when given null', () => {
      expect(() => new ConsumerConfig(null as any)).to.throw(/Config object expected, got null/);
    });

    it('throws when given undefined', () => {
      expect(() => new ConsumerConfig(undefined as any)).to.throw(/Config object expected, got undefined/);
    });

    it('throws when name is missing', () => {
      expect(() => new ConsumerConfig({} as any)).to.throw(/Valid job name expected/);
    });

    it('throws when name is not a string', () => {
      expect(() => new ConsumerConfig({ name: 42 } as any)).to.throw(/Valid job name expected/);
    });

    it('throws when name is empty string', () => {
      expect(() => new ConsumerConfig({ name: '' } as any)).to.throw(/Valid job name expected/);
    });

    it('works with a valid config', () => {
      const cfg = {
        name: 'test-consumer',
        queue: 'test-queue',
        runner: { type: 'nodejs', config: { module: './test' } },
      };
      expect(() => new ConsumerConfig(cfg as any)).to.not.throw();
    });

    it('sets properties correctly', () => {
      const runner = { type: 'nodejs', config: { module: './test' } };
      const cfg = {
        name: 'my-consumer',
        queue: 'my-queue',
        runner,
      };
      const config = new ConsumerConfig(cfg as any);
      expect(config.name).to.equal('my-consumer');
      expect(config.queue).to.equal('my-queue');
      expect(config.runner).to.equal(runner);
    });

  });

  describe('.json', () => {

    it('returns a ConsumerConfig instance', () => {
      const cfg = {
        name: 'test-consumer',
        queue: 'test-queue',
        runner: { type: 'nodejs', config: { module: './test' } },
      };
      const result = ConsumerConfig.json(cfg as any);
      expect(result).to.be.an.instanceof(ConsumerConfig);
    });

    it('sets properties from the data', () => {
      const cfg = {
        name: 'json-consumer',
        queue: 'json-queue',
        runner: { type: 'binary', config: { path: '/bin/echo' } },
      };
      const result = ConsumerConfig.json(cfg as any);
      expect(result.name).to.equal('json-consumer');
      expect(result.queue).to.equal('json-queue');
    });

  });

});
