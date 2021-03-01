import Consumer from '../../src/consumer';
import Config from '../../src/config';
import { expect } from 'chai';

describe('Consumer', () => {

  let config;
  beforeEach(() => {
    config = Config.fromFile('example/config.yaml');
  });

  it('is a class', () => {
    expect(Consumer).to.be.a.instanceof(Function);
  });

  describe('its constructor', () => {
    it('it works', () => {
      expect(new Consumer(config)).to.be.an.instanceof(Consumer);
    });
  });

});
