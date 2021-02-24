import NodeJSRunner from '../../../src/jobs/runners/nodejs';
import { expect } from 'chai';
import Job from '../../../src/jobs/job';

describe('NodeJSRunner', () => {

  it('exports a class', () => {
    expect(NodeJSRunner).to.be.an.instanceof(Function);
    expect(NodeJSRunner.name).to.equal('NodeJSRunner');
  });

  describe('its constructor', () => {
    it('expects the config to contain a module path', () => {
      expect(() => new NodeJSRunner({})).to.throw(/Module path expected, got/);
    });

    it('throws errors if the module can\'t be loaded or found', () => {
      const test = (m) => () => new NodeJSRunner({ module: m });

      expect(test('foo/bar')).to.throw('Module \'foo/bar\' can\'t be loaded');
      expect(test('/tmp/test.js')).to.throw('Module \'/tmp/test.js\' can\'t be loaded');
      // correct
      expect(test('./tests/jobs/runners/dummy.runner')).not.to.throw();
    });
  });

  let runner, dummy;
  beforeEach(() => {
    dummy = require('./dummy.runner');
    runner = new NodeJSRunner({ module: './tests/jobs/runners/dummy.runner' });
  });

  describe('#run', () => {
    it('should pass the job payload to the node module', () => {
      const job = new Job();
      runner.run(job);
      expect(dummy.runner.calls).to.have.length(1);
      expect(dummy.runner.calls[0]).to.equal(job);
    });
  });
});
