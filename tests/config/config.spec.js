import { expect } from 'chai';

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
  });

});
