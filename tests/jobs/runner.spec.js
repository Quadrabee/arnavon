import Arnavon from '../../src';
import sinon from 'sinon';
import Runners from '../../src/jobs/runners';
import JobRunner from '../../src/jobs/runner';
import { expect } from 'chai';
import Job from '../../src/jobs/job';
import { InvalidRunError } from '../../src/robust';

describe('JobRunner', () => {

  let testJob;
  beforeEach(() => {
    testJob = new Job({}, {
      dispatched: new Date(),
      dequeued: new Date(),
    });
  });

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
    it('calls the _run child class implementation', () => {
      const spy = sinon.spy(runner, '_run');
      runner.run(testJob);
      expect(spy).to.be.calledOnceWith(testJob);
    });

    it('returns a Promise', () => {
      const res = runner.run(testJob);
      expect(res).to.be.an.instanceof(Promise);
    });

    it('wraps promises returned by implementation specific #_run()', (done) => {
      runner._run = sinon.stub().returns(Promise.resolve(42));
      const res = runner.run(testJob);
      res
        .then((result) => {
          expect(result).to.equal(42);
          done();
        })
        .catch(done);
    });

    it('let errors from promises bubble up', () => {
      runner._run = sinon.stub().returns(Promise.reject(42));
      const res = runner.run(testJob);
      return res
        .then((result) => {
          expect(result).to.equal(42);
          throw new Error('shouldn\'t have resolved');
        })
        .catch((err) => {
          expect(err).to.equal(42);
        });
    });

    it('wraps promises returned and increments failure counter on rejection', () => {
      runner._run = sinon.stub().returns(Promise.reject(42));
      const res = runner.run(testJob);
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

    it('wraps promises returned and updates prometheus histograms on rejection', () => {
      runner._run = sinon.stub().returns(Promise.reject(42));
      const res = runner.run(testJob);
      const leadTime = Arnavon.registry.getSingleMetric('runner_job_lead_time');
      const spyLeadTime = sinon.spy(leadTime, 'observe');
      const touchTime = Arnavon.registry.getSingleMetric('runner_job_touch_time');
      const spyTouchTime = sinon.spy(touchTime, 'observe');

      return res
        .then(() => {
          throw new Error('shouldn\'t have resolved');
        })
        .catch(() => {
          expect(spyTouchTime).to.have.been.calledOnce;
          expect(spyLeadTime).to.have.been.calledOnce;
        });
    });

    it('wraps promises returned and increments success counter on resolution', () => {
      runner._run = sinon.stub().returns(Promise.resolve(42));
      const res = runner.run(testJob);
      const metric = Arnavon.registry.getSingleMetric('runner_successful_jobs');
      const spy = sinon.spy(metric, 'inc');

      return res
        .then(() => {
          expect(spy).to.have.been.calledOnce;
        });
    });

    it('wraps promises returned and updates prometheus histogram on resolution', () => {
      runner._run = sinon.stub().returns(Promise.resolve(42));
      const res = runner.run(testJob);
      const leadTime = Arnavon.registry.getSingleMetric('runner_job_lead_time');
      const spyLeadTime = sinon.spy(leadTime, 'observe');
      const touchTime = Arnavon.registry.getSingleMetric('runner_job_touch_time');
      const spyTouchTime = sinon.spy(touchTime, 'observe');

      return res
        .then(() => {
          expect(spyLeadTime).to.have.been.calledOnce;
          expect(spyTouchTime).to.have.been.calledOnce;
        });
    });

    it('catches errors thrown by #_run() and rejects promises', () => {
      runner._run = sinon.stub().throws(new Error('oops'));
      const res = runner.run(testJob);
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
      runner._run = sinon.stub().throws(new Error('oops'));
      const res = runner.run(testJob);
      return res
        .then(() => {
          throw new Error('should not have resolved');
        })
        .catch(() => {
          expect(spy).to.be.calledOnce;
        });
    });

    it('catches errors thrown by #_run() and update prometheus histogram', () => {
      const leadTime = Arnavon.registry.getSingleMetric('runner_job_lead_time');
      const spyLeadTime = sinon.spy(leadTime, 'observe');
      const touchTime = Arnavon.registry.getSingleMetric('runner_job_touch_time');
      const spyTouchTime = sinon.spy(touchTime, 'observe');
      runner._run = sinon.stub().throws(new Error('oops'));
      const res = runner.run(testJob);
      return res
        .then(() => {
          throw new Error('should not have resolved');
        })
        .catch(() => {
          expect(spyLeadTime).to.be.calledOnce;
          expect(spyTouchTime).to.be.calledOnce;
        });
    });

    it('consider non promise results as running error', () => {
      runner._run = sinon.stub().returns('foo');
      const res = runner.run(testJob);
      return res
        .then(() => {
          throw new Error('should have failed');
        })
        .catch((err) => {
          expect(err).to.be.an.instanceof(InvalidRunError);
        });
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
