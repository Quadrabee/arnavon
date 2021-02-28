import { Consumer, Server, default as Arnavon } from '../src/index';
import { expect } from 'chai';
import promClient from 'prom-client';

describe('The Arnavon package', () => {

  it('exports the Consumer class', () => {
    expect(Consumer).to.be.an.instanceof(Function);
  });

  it('exports the Server class', () => {
    expect(Server).to.be.an.instanceof(Function);
  });

  describe('the Arnavon instance', () => {
    it('exposes a prometheus registry', () => {
      expect(Arnavon.registry).to.be.an.instanceof(promClient.Registry);
    });
  });

  describe('Arnavon._reset', () => {
    it('allows our tests to reset Arnavon\'s module', () => {
      const registry1 = Arnavon.registry;
      Arnavon._reset();
      const registry2 = Arnavon.registry;
      expect(registry1 === registry2).to.equal(false);
    });
  });

});
