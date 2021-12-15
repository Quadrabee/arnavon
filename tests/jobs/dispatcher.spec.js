import JobDispatcher from '../../src/jobs/dispatcher';
import ArnavonConfig from '../../src/config';
import Arnavon from '../../src';
import { expect, default as chai } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { DataValidationError, UnknownJobError, InvalidBatch } from '../../src/robust';
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

  const validPayload = {
    from: 'foo@bar.com',
    to: 'baz@baz.com',
    subject: 'foo bar',
    text: 'baz baz baz',
  };

  it('exports a class', () => {
    expect(JobDispatcher).to.be.a.instanceof(Function);
    expect(JobDispatcher.name).to.equal('JobDispatcher');
  });

  let config, dispatcher;
  beforeEach(() => {
    config = ArnavonConfig.fromFile('example/config.yaml');
    Arnavon.queue = new MemoryQueue();
    dispatcher = new JobDispatcher(config);
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

  describe('#dispatchBatch', () => {

    it('fails for unknown jobs', (done) => {
      const test = (jobName) => dispatcher.dispatchBatch(jobName, {});

      expect(test()).to.eventually.be.rejectedWith(UnknownJobError);
      expect(test('')).to.eventually.be.rejectedWith(UnknownJobError);
      expect(test('foo-bar')).to.eventually.be.rejectedWith(UnknownJobError)
        .notify(done);
    });

    it('expects an array as data parameter', (done) => {
      const test = (data) => dispatcher.dispatchBatch('send-email', data);

      expect(test()).to.eventually.be.rejectedWith(DataValidationError);
      expect(test('')).to.eventually.be.rejectedWith(DataValidationError);
      expect(test('foo-bar')).to.eventually.be.rejectedWith(DataValidationError)
        .notify(done);
    });

    it('increases prometheus counter for unknown jobs', () => {
      const batch = [{}, {}, {}];
      const metric = Arnavon.registry.getSingleMetric('dispatcher_unknown_jobs');
      const spy = sinon.spy(metric, 'inc');
      dispatcher.dispatchBatch('unknown-job', batch);
      expect(spy).to.be.calledOnce;
    });

    it('fails for any invalid job payload when in strict mode', (done) => {
      const test = (data) => dispatcher.dispatchBatch('send-email', data, { strict: true });
      let invalidBatch = [
        validPayload,
        {}, // invalid job payload
      ];
      expect(test(invalidBatch)).to.eventually.be.rejectedWith(InvalidBatch);

      invalidBatch = [
        validPayload,
        {
          test: 'foo',
        }, // invalid job payload
      ];
      expect(test(invalidBatch)).to.eventually.be.rejectedWith(InvalidBatch)
        .notify(done);
    });

    it('rejects with a list of success/failures when in non strict mode', () => {
      const test = (data) => dispatcher.dispatchBatch('send-email', data, { strict: false });

      const invalidBatch = [
        validPayload,
        {}, // invalid job payload
      ];

      return test(invalidBatch)
        .then(() => {
          throw new Error('should have failed');
        })
        .catch((err) => {
          expect(err).to.be.an.instanceof(InvalidBatch);
          expect(err.invalids).to.have.length(1);
        });
    });

    it('increases prometheus counter for invalid jobs', () => {
      const metric = Arnavon.registry.getSingleMetric('dispatcher_invalid_jobs');
      const spy = sinon.spy(metric, 'inc');
      // 3 invalid jobs
      const batch = [{}, {}, {}];
      dispatcher.dispatchBatch('send-email', batch);
      expect(spy).to.be.calledOnce;
      // Check it was inc's by 3;
      const { args } = spy.getCall(0);
      expect(args[1]).to.equal(3);
    });

    it('returns a Promise', () => {
      const payload = [validPayload, validPayload];
      const p = dispatcher.dispatchBatch('send-email', payload);
      expect(p).to.be.an.instanceof(Promise);
    });

    it('increases prometheus counter for valid jobs', () => {
      const payload = [validPayload, validPayload];
      const metric = Arnavon.registry.getSingleMetric('dispatcher_valid_jobs');
      const spy = sinon.spy(metric, 'inc');
      dispatcher.dispatchBatch('send-email', payload);
      expect(spy).to.be.calledOnce;
      // Check it was inc's by 2;
      const { args } = spy.getCall(0);
      expect(args[1]).to.equal(2);
    });

    it('enqueues validated job (with metadata) on the queue', () => {
      const payload = [validPayload, validPayload];
      const spy = sinon.spy(Arnavon.queue, 'push');
      return dispatcher.dispatchBatch('send-email', payload)
        .then(() => {
          expect(spy).to.be.calledTwice;
          const [call] = spy.getCalls();
          const { args: [arg1, arg2] } = call;
          expect(arg1).to.eql('send-email');
          expect(arg2).to.be.an.instanceof(Job);
          expect(arg2.meta.dispatched).to.be.an.instanceof(Date);
          expect(arg2.meta.jobName).to.equal('send-email');
        });
    });

    it('passes metadata to job before passing on to the queue', () => {
      const payload = [validPayload, validPayload];
      const metadata = {
        id: uuid(),
        scheduled: new Date(),
        // We should not be able to set that field ourselves
        jobName: 'foo-bar',
      };
      const spy = sinon.spy(Arnavon.queue, 'push');
      return dispatcher.dispatchBatch('send-email', payload, metadata)
        .then(() => {
          expect(spy).to.be.calledTwice;
          const [call] = spy.getCalls();
          const { args: [arg1, arg2] } = call;
          expect(arg1).to.eql('send-email');
          expect(arg2).to.be.an.instanceof(Job);
          expect(arg2.meta.scheduled).to.equal(metadata.scheduled);
          expect(arg2.meta.batchId).to.equal(metadata.id);
          expect(arg2.meta.jobName).to.equal('send-email');
        });
    });

  });

  describe('#dispatch', () => {

    it('fails for unknown jobs', (done) => {
      const test = (jobName) => dispatcher.dispatch(jobName, {});

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
      const test = (jobName, data) => dispatcher.dispatch(jobName, data);

      expect(test('send-email')).to.eventually.be.rejectedWith(DataValidationError);
      expect(test('send-email', {})).to.eventually.be.rejectedWith(DataValidationError);

      const payload = {
        channel: '#test',
      };
      expect(test('send-email', payload)).to.eventually.be.rejectedWith(DataValidationError)
        .notify(done);
    });

    it('increases prometheus counter for invalid jobs', () => {
      const metric = Arnavon.registry.getSingleMetric('dispatcher_invalid_jobs');
      const spy = sinon.spy(metric, 'inc');
      dispatcher.dispatch('send-email', {});
      expect(spy).to.be.calledOnce;
    });

    it('returns a Promise', () => {
      const payload = {
        channel: '#channel',
        message: 'foo bar',
      };
      const p = dispatcher.dispatch('send-email', payload);
      expect(p).to.be.an.instanceof(Promise);
    });

    it('increases prometheus counter for valid jobs', () => {
      const metric = Arnavon.registry.getSingleMetric('dispatcher_valid_jobs');
      const spy = sinon.spy(metric, 'inc');
      dispatcher.dispatch('send-email', validPayload);
      expect(spy).to.be.calledOnce;
    });

    it('enqueues validated job (with metadata) on the queue', () => {
      const spy = sinon.spy(Arnavon.queue, 'push');
      return dispatcher.dispatch('send-email', validPayload)
        .then(() => {
          expect(spy).to.be.calledOnce;
          const [call] = spy.getCalls();
          const { args: [arg1, arg2] } = call;
          expect(arg1).to.eql('send-email');
          expect(arg2).to.be.an.instanceof(Job);
          expect(arg2.meta.dispatched).to.be.an.instanceof(Date);
          expect(arg2.meta.jobName).to.equal('send-email');
        });
    });

    it('passes metadata to job before passing on to the queue', () => {
      const metadata = {
        id: uuid(),
        scheduled: new Date(),
        // We should not be able to set that field ourselves
        jobName: 'foo-bar',
      };
      const spy = sinon.spy(Arnavon.queue, 'push');
      return dispatcher.dispatch('send-email', validPayload, metadata)
        .then(() => {
          expect(spy).to.be.calledOnce;
          const [call] = spy.getCalls();
          const { args: [arg1, arg2] } = call;
          expect(arg1).to.eql('send-email');
          expect(arg2).to.be.an.instanceof(Job);
          expect(arg2.meta.scheduled).to.equal(metadata.scheduled);
          expect(arg2.meta.id).to.equal(metadata.id);
          expect(arg2.meta.jobName).to.equal('send-email');
        });
    });

  });

});
