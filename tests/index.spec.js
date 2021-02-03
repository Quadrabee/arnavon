import { Consumer, Server } from '../src/index';
import { expect } from 'chai';

describe('AWFW', () => {

  it('exports the Consumer class', () => {
    expect(Consumer).to.be.an.instanceof(Function);
  });

  it('exports the Server class', () => {
    expect(Server).to.be.an.instanceof(Function);
  });

});
