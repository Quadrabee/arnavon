import NodeJSRunner from '../../../src/jobs/runners/nodejs';
import { expect, default as chai } from 'chai';
import Job from '../../../src/jobs/job';
import Arnavon from '../../../src';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import chaiAsPromised from 'chai-as-promised';

chai.should();
chai.use(sinonChai);
chai.use(chaiAsPromised);

describe('NodeJSRunner', () => {

  let runner, dummy;
  beforeEach(() => {
    dummy = require('./dummy.runner');
    Arnavon.cwd = () => __dirname;
    runner = new NodeJSRunner({ module: './dummy.runner' });
    dummy.runner.reset();
  });

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
      expect(test('./dummy.runner')).not.to.throw();
    });

    it('supports loading es6 modules', () => {
      const test = new NodeJSRunner({ module: './dummy.runner.es6' });
      expect(test).to.be.an.instanceof(NodeJSRunner);
    });
  });

  describe('#run', () => {
    it('should pass the job payload to the node module', () => {
      const job = new Job();
      runner.run(job);
      expect(dummy.runner.calls).to.have.length(1);
      expect(dummy.runner.calls[0]).to.equal(job);
    });

    it('should wait for the runner\'s promise to resolve before resolving', () => {
      const job = new Job();
      let resolve;
      const p = new Promise((res) => resolve = res);
      dummy.runner.promise = p;
      const runnerPromise = runner.run(job);
      expect(runnerPromise).to.be.an.instanceof(Promise);
      expect(dummy.runner.calls).to.have.length(1);
      expect(dummy.runner.calls[0]).to.equal(job);

      expect(runnerPromise).to.not.be.fulfilled;
      resolve();
      return runnerPromise.then(() => {
        expect(dummy.runner.calls).to.have.length(1);
      });
    });
  });
});
