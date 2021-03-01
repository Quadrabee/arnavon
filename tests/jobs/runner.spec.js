import Arnavon from '../../src';
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

    it('let errors from promises bubble up', () => {
      const job = new Job();
      runner._run = sinon.stub().returns(Promise.reject(42));
      const res = runner.run(job);
      return res
        .then((result) => {
          throw new Error('shouldn\'t have resolved');
          expect(result).to.equal(42);
        })
        .catch((err) => {
          expect(err).to.equal(42);
        });
    });

    it('wraps promises returned and increments failure counter on rejection', () => {
      const job = new Job();
      runner._run = sinon.stub().returns(Promise.reject(42));
      const res = runner.run(job);
      const metric = Arnavon.registry.getSingleMetric('runner_failed_jobs');
      const spy = sinon.spy(metric, 'inc');

      return res
        .then(() => {
          throw new Error('shouldn\'t have resolved');
        })
        .catch(() => {
          expect(spy).to.have.been.calledOnce;
        });
    });

    it('wraps promises returned and increments success counter on resolution', () => {
      const job = new Job();
      runner._run = sinon.stub().returns(Promise.resolve(42));
      const res = runner.run(job);
      const metric = Arnavon.registry.getSingleMetric('runner_successful_jobs');
      const spy = sinon.spy(metric, 'inc');

      return res
        .then(() => {
          expect(spy).to.have.been.calledOnce;
        });
    });

    it('catches errors thrown by #_run() and rejects promises', () => {
      const job = new Job();
      runner._run = sinon.stub().throws(new Error('oops'));
      const res = runner.run(job);
      return res
        .then(() => {
          throw new Error('should not have resolved');
        })
        .catch(err => {
          expect(err).to.match(/oops/);
        });
    });

    it('catches errors thrown by #_run() and increment prometheus counter', () => {
      const metric = Arnavon.registry.getSingleMetric('runner_failed_jobs');
      const spy = sinon.spy(metric, 'inc');
      const job = new Job();
      runner._run = sinon.stub().throws(new Error('oops'));
      const res = runner.run(job);
      return res
        .then(() => {
          throw new Error('should not have resolved');
        })
        .catch(() => {
          expect(spy).to.be.calledOnce;
        });
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
      Arnavon._reset();
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
