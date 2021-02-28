import Consumer from '../../src/consumer';
import Config from '../../src/config';
import { expect } from 'chai';
import Arnavon from '../../src';

describe('Consumer', () => {

  let config;
  beforeEach(() => {
    Arnavon._reset();
    config = Config.fromFile('example/config.yaml');
  });

  it('is a class', () => {
    expect(Consumer).to.be.a.instanceof(Function);
  });

  describe('its constructor', () => {
    it('expects an ArnavonConfig instance', () => {
      expect(() => new Consumer()).to.throw(/ArnavonConfig expected/);
    });

    it('it works', () => {
      expect(new Consumer(config)).to.be.an.instanceof(Consumer);
    });
  });

});
