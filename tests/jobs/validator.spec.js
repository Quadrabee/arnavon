import Finitio from 'finitio';
import JobValidator from '../../src/jobs/validator';
import { expect } from 'chai';

describe('JobValidator', () => {

  const jobSchema = Finitio.system(`
  @import finitio/data
  {
    id   :  Integer
    name :  String
    date :? Date
  }
  `);

  let validator;
  beforeEach(() => {
    validator = new JobValidator(jobSchema);
  });

  it('exports a class', () => {
    expect(JobValidator).to.be.a.instanceof(Function);
    expect(JobValidator.name).to.equal('JobValidator');
  });

  describe('its constructor', () => {
    it('expects a finitio type as first argument', () => {
      const test = (t) => () => new JobValidator(t);
      expect(test()).to.throw(/Finitio system expected, got undefined/);
      expect(test(null)).to.throw(/Finitio system expected, got null/);
      expect(test({})).to.throw(/Finitio system expected, got/);
      // correct
      expect(test(jobSchema)).to.not.throw();
    });
  });

  describe('#validate', () => {

    it('validates the input using its finitio schema', () => {
      const test = (data) => () => validator.validate(data);
      expect(test()).to.throw(/Invalid input data:/);
      expect(test(null)).to.throw(/Invalid input data:/);
      expect(test(undefined)).to.throw(/Invalid input data:/);
      expect(test({})).to.throw(/Invalid input data:/);
      // correct
      expect(test({ id: 22, name: 'foobar' })).to.not.throw();
    });

    it('returns the dressed data', () => {
      const payload = validator.validate({ id: 22, name: 'foobar', date: '2021-01-01 10:00:00' });
      expect(payload.date).to.be.an.instanceOf(Date);
    });

  });

});
