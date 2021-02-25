import JobDispatcher from '../../src/jobs/dispatcher';
import { expect } from 'chai';

describe('JobDispatcher', () => {

  it('exports a class', () => {
    expect(JobDispatcher).to.be.a.instanceof(Function);
    expect(JobDispatcher.name).to.equal('JobDispatcher');
  });

  describe('its constructor', () => {
    it('expects a Config as parameter', () => {
      const test = (cfg) => () => new JobDispatcher(cfg);
      expect(test()).to.throw(/Config expected, got undefined/);
      expect(test(null)).to.throw(/Config expected, got null/);
      expect(test({})).to.throw(/Config expected, got/);
    });
  });

});
