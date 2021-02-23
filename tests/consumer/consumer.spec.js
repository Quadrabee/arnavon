import Consumer from '../../src/consumer';
import { expect } from 'chai';

describe('Consumer', () => {

  it('is a class', () => {
    expect(Consumer).to.be.a.instanceof(Function);
  });

  describe('its constructor', () => {
    it('it works', () => {
      expect(new Consumer()).to.be.an.instanceof(Consumer);
    });
  });

});
