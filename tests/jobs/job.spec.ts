import Job from '../../src/jobs/job';
import { expect } from 'chai';
import { v4 as uuid, validate } from 'uuid';
import chai from 'chai';
import sinonChai from 'sinon-chai';

chai.should();
chai.use(sinonChai);

describe('Job', () => {

  it('exports a class', () => {
    expect(Job).to.be.a.instanceof(Function);
    expect(Job.name).to.equal('Job');
  });

  describe('its constructor', () => {
    it('sets the payload attribute properly', () => {
      const test = (payload) => new Job(payload, { id: uuid() });
      expect(test('foo').payload).to.equal('foo');
      expect(test(['foo']).payload).to.eql(['foo']);
      expect(test({ foo: 'bar' }).payload).to.eql({ foo: 'bar' });
    });
    it('expects object as metadata', () => {
      const test = (metadata) => () => new Job({}, metadata);
      // incorrect
      expect(test('meta')).to.throw(/Invalid meta: Object expected, got/);

    });
    it('expects a valid id, if present in metadata', () => {
      const test = (metadata) => () => new Job({}, metadata);
      // incorrect
      expect(test({ id: 'foo' })).to.throw(/Invalid ID: uuid expected, got/);
      // correct
      expect(test({ id: uuid() })).to.not.throw();
    });
    it('generates an id, if not present in metadata', () => {
      const job = new Job({}, {});
      expect(validate(job.meta.id)).to.equal(true);
    });
    it('sets the metadata attribute properly', () => {
      const id = uuid();
      const created = new Date();
      const j = new Job({}, {
        id,
        created,
      });
      expect(j.meta).to.be.an.instanceOf(Object);
      expect(j.meta.id).to.equal(id);
      expect(j.meta.created).to.equal(created);
    });

    it('makes payload and meta immutable', () => {
      const id = uuid();
      const job = new Job({ foo: 'bar' }, { id });

      // Attempting to reassign should fail silently in non-strict mode
      // or throw in strict mode - but the value should remain unchanged
      const originalPayload = job.payload;
      const originalMeta = job.meta;

      try {
        (job as any).payload = { changed: true };
      } catch (e) {
        // expected in strict mode
      }
      try {
        (job as any).meta = { id: 'changed' };
      } catch (e) {
        // expected in strict mode
      }

      expect(job.payload).to.equal(originalPayload);
      expect(job.meta).to.equal(originalMeta);
    });
  });

  describe('#toString', () => {
    it('returns an object with meta and payload keys summary', () => {
      const id = uuid();
      const dispatched = new Date();
      const job = new Job({ foo: 'bar', baz: 123 }, { id, dispatched });
      const result = job.toString();

      expect(result).to.be.an.instanceOf(Object);
      expect(result.meta).to.eql({ id, dispatched });
      expect(result.payload).to.equal('{foo, baz}');
    });

    it('handles empty payload', () => {
      const id = uuid();
      const job = new Job({}, { id });
      const result = job.toString();

      expect(result.payload).to.equal('{}');
    });
  });

  describe('#toJSON', () => {
    it('returns an object with meta and payload', () => {
      const id = uuid();
      const job = new Job({ data: 'test' }, { id, jobName: 'test-job' });
      const json = job.toJSON();

      expect(json).to.eql({
        meta: { id, jobName: 'test-job' },
        payload: { data: 'test' },
      });
    });
  });

  describe('.fromJSON', () => {
    it('creates a Job instance from a JSON object', () => {
      const id = uuid();
      const jsonJob = {
        payload: { foo: 'bar' },
        meta: { id, jobName: 'my-job' },
      };
      const job = Job.fromJSON(jsonJob as Job);

      expect(job).to.be.an.instanceOf(Job);
      expect(job.payload).to.eql({ foo: 'bar' });
      expect(job.meta.id).to.equal(id);
      expect(job.meta.jobName).to.equal('my-job');
    });

    it('converts dispatched string to Date', () => {
      const id = uuid();
      const dispatchedStr = '2024-01-15T10:30:00.000Z';
      const jsonJob = {
        payload: { foo: 'bar' },
        meta: { id, dispatched: dispatchedStr },
      };
      const job = Job.fromJSON(jsonJob as any);

      expect(job.meta.dispatched).to.be.an.instanceOf(Date);
      expect(job.meta.dispatched.toISOString()).to.equal(dispatchedStr);
    });

    it('handles missing dispatched field', () => {
      const id = uuid();
      const jsonJob = {
        payload: { foo: 'bar' },
        meta: { id },
      };
      const job = Job.fromJSON(jsonJob as Job);

      expect(job).to.be.an.instanceOf(Job);
      expect(job.meta.dispatched).to.be.undefined;
    });
  });

});
