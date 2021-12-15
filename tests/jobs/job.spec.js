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
  });

});
