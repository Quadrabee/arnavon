import sinon from 'sinon';
import Runners from '../../src/jobs/runners';
import JobRunner from '../../src/jobs/runner';
import { expect } from 'chai';
import Job from '../../src/jobs/job';

describe('JobRunner', () => {

  it('exports a class', () => {
    expect(JobRunner).to.be.a.instanceof(Function);
    expect(JobRunner.name).to.equal('JobRunner');
  });

  class TestRunner extends JobRunner {
    constructor(config) {
      super();
      this.config = config;
    }

    _run() {
    }
  }

  let runner;
  beforeEach(() => {
    runner = new TestRunner();
  });

  describe('#run', () => {
    it('expects a job as parameter', () => {
      const test = (j) => () => runner.run(j);

      expect(test()).to.throw(/Job expected, got/);
      expect(test(null)).to.throw(/Job expected, got/);
      expect(test('')).to.throw(/Job expected, got/);
      expect(test({})).to.throw(/Job expected, got/);
      // correct
      expect(test(new Job())).to.not.throw();
    });

    it('calls the _run child class implementation', () => {
      const spy = sinon.spy(runner, '_run');
      const job = new Job();
      runner.run(job);
      expect(spy).to.be.calledOnceWith(job);
    });

    it('returns a Promise', () => {
      const job = new Job();
      const res = runner.run(job);
      expect(res).to.be.an.instanceof(Promise);
    });

    it('wraps promises returned by implementation specific #_run()', (done) => {
      const job = new Job();
      runner._run = sinon.stub().returns(Promise.resolve(42));
      const res = runner.run(job);
      res
        .then((result) => {
          expect(result).to.equal(42);
          done();
        })
        .catch(done);
    });

    it('wraps non promise results with a Promise', (done) => {
      const job = new Job();
      runner._run = sinon.stub().returns('foo');
      const res = runner.run(job);
      res
        .then((result) => {
          expect(result).to.equal('foo');
          done();
        })
        .catch(done);
    });
  });

  describe('.factor', () => {

    beforeEach(() => {
      Runners.register('Test', TestRunner);
    });

    it('throws errors for unknown runner types', () => {
      const test = (t) => () => JobRunner.factor(t, {});
      expect(test('foo')).to.throw(/Unknown runner type: foo/);
      // correct
      expect(test('Test')).to.not.throw();
    });

    it('factors known runner type', () => {
      const runner = JobRunner.factor('Test', { foo: 42 });
      expect(runner).to.be.an.instanceof(TestRunner);
      expect(runner.config).to.deep.equal({ foo: 42 });
    });

  });

});
