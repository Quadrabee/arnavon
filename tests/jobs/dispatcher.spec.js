import JobDispatcher from '../../src/jobs/dispatcher';
import ArnavonConfig from '../../src/config';
import Arnavon from '../../src';
import { expect, default as chai } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { DataValidationError, UnknownJobError } from '../../src/robust';
import Job from '../../src/jobs/job';
import MemoryQueue from '../../src/queue/drivers/memory';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import { v4 as uuid } from 'uuid';

chai.should();
chai.use(sinonChai);
chai.use(chaiAsPromised);

/**
 * TODO: refactor this as it looks more like integration testing than unit testing
 * due to the lack of mocking of the JobValidators
 */
describe('JobDispatcher', () => {

  it('exports a class', () => {
    expect(JobDispatcher).to.be.a.instanceof(Function);
    expect(JobDispatcher.name).to.equal('JobDispatcher');
  });

  let config, dispatcher, queue;
  beforeEach(() => {
    config = ArnavonConfig.fromFile('example/config.yaml');
    queue = new MemoryQueue();
    dispatcher = new JobDispatcher(config, queue);
  });

  describe('its constructor', () => {
    it('expects an ArnavonConfig as parameter', () => {
      const test = (cfg) => () => new JobDispatcher(cfg);
      expect(test()).to.throw(/ArnavonConfig expected, got undefined/);
      expect(test(null)).to.throw(/ArnavonConfig expected, got null/);
      expect(test({})).to.throw(/ArnavonConfig expected, got/);
    });
    it('returns an instance of dispatcher', () => {
      expect(dispatcher).to.be.an.instanceof(JobDispatcher);
    });
  });

  describe('#dispatch', () => {

    it('fails for unknown jobs', (done) => {
      const test = (jobId) => dispatcher.dispatch(jobId, {});

      expect(test()).to.eventually.be.rejectedWith(UnknownJobError);
      expect(test('')).to.eventually.be.rejectedWith(UnknownJobError);
      expect(test('foo-bar')).to.eventually.be.rejectedWith(UnknownJobError)
        .notify(done);
    });

    it('increases prometheus counter for unknown jobs', () => {
      const metric = Arnavon.registry.getSingleMetric('dispatcher_unknown_jobs');
      const spy = sinon.spy(metric, 'inc');
      dispatcher.dispatch('unknown-job', {});
      expect(spy).to.be.calledOnce;
    });

    it('fails for invalid job payload', (done) => {
      const test = (jobId, data) => dispatcher.dispatch(jobId, data);

      expect(test('send-slack')).to.eventually.be.rejectedWith(DataValidationError);
      expect(test('send-slack', {})).to.eventually.be.rejectedWith(DataValidationError);

      const payload = {
        channel: '#test'
      };
      expect(test('send-slack', payload)).to.eventually.be.rejectedWith(DataValidationError)
        .notify(done);
    });

    it('increases prometheus counter for invalid jobs', () => {
      const metric = Arnavon.registry.getSingleMetric('dispatcher_invalid_jobs');
      const spy = sinon.spy(metric, 'inc');
      dispatcher.dispatch('send-slack', {});
      expect(spy).to.be.calledOnce;
    });

    it('returns a Promise', () => {
      const payload = {
        channel: '#channel',
        message: 'foo bar'
      };
      const p = dispatcher.dispatch('send-slack', payload);
      expect(p).to.be.an.instanceof(Promise);
    });

    it('increases prometheus counter for valid jobs', () => {
      const payload = {
        channel: '#channel',
        message: 'foo bar'
      };
      const metric = Arnavon.registry.getSingleMetric('dispatcher_valid_jobs');
      const spy = sinon.spy(metric, 'inc');
      dispatcher.dispatch('send-slack', payload);
      expect(spy).to.be.calledOnce;
    });

    it('enqueues validated job (with metadata) on the queue', () => {
      const payload = {
        channel: '#channel',
        message: 'foo bar'
      };
      const spy = sinon.spy(queue, 'push');
      return dispatcher.dispatch('send-slack', payload)
        .then(() => {
          expect(spy).to.be.calledOnce;
          const [call] = spy.getCalls();
          const { args: [arg1, arg2] } = call;
          expect(arg1).to.eql('send-slack');
          expect(arg2).to.be.an.instanceof(Job);
          expect(arg2.meta.dispatched).to.be.an.instanceof(Date);
          expect(arg2.meta.jobId).to.equal('send-slack');
        });
    });

    it('passes metadata to job before passing on to the queue', () => {
      const payload = {
        channel: '#channel',
        message: 'foo bar'
      };
      const metadata = {
        id: uuid(),
        scheduled: new Date(),
        // We should not be able to set that field ourselves
        jobId: 'foo-bar'
      };
      const spy = sinon.spy(queue, 'push');
      return dispatcher.dispatch('send-slack', payload, metadata)
        .then(() => {
          expect(spy).to.be.calledOnce;
          const [call] = spy.getCalls();
          const { args: [arg1, arg2] } = call;
          expect(arg1).to.eql('send-slack');
          expect(arg2).to.be.an.instanceof(Job);
          expect(arg2.meta.scheduled).to.equal(metadata.scheduled);
          expect(arg2.meta.id).to.equal(metadata.id);
          expect(arg2.meta.jobId).to.equal('send-slack');
        });
    });

  });

});
