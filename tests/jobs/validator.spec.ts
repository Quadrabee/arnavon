import Finitio from 'finitio';
import JobValidator from '../../src/jobs/validator';
import { expect } from 'chai';
import { DataValidationError } from '../../src/robust';

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
    it('expects a finitio type or validator function as first argument', () => {
      const test = (t) => () => new JobValidator(t);
      expect(test()).to.throw(/Finitio system or validator function expected, got undefined/);
      expect(test(null)).to.throw(/Finitio system or validator function expected, got null/);
      expect(test({})).to.throw(/Finitio system or validator function expected, got/);
      // correct: Finitio system
      expect(test(jobSchema)).to.not.throw();
      // correct: validator function
      expect(test((data) => data)).to.not.throw();
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

    it('validates with optional fields present', () => {
      const payload = validator.validate({ id: 1, name: 'test', date: '2021-06-15 12:00:00' });
      expect(payload.id).to.equal(1);
      expect(payload.name).to.equal('test');
      expect(payload.date).to.be.an.instanceOf(Date);
    });

    it('validates with optional fields absent', () => {
      const payload = validator.validate({ id: 1, name: 'test' });
      expect(payload.id).to.equal(1);
      expect(payload.name).to.equal('test');
      expect(payload.date).to.be.undefined;
    });

    it('validates nested object schemas', () => {
      const nestedSchema = Finitio.system(`
      @import finitio/data
      {
        user: {
          name: String
          age:  Integer
        }
      }
      `);
      const nestedValidator = new JobValidator(nestedSchema);
      const payload = nestedValidator.validate({ user: { name: 'Alice', age: 30 } });
      expect(payload.user.name).to.equal('Alice');
      expect(payload.user.age).to.equal(30);
    });

    it('coerces values during dressing (date string becomes Date object)', () => {
      const input = { id: 5, name: 'coerce-test', date: '2023-03-15 08:30:00' };
      const payload = validator.validate(input);
      // The original input date is a string
      expect(input.date).to.be.a('string');
      // The dressed output date is a Date object
      expect(payload.date).to.be.an.instanceOf(Date);
    });

    it('throws a DataValidationError on invalid input', () => {
      expect(() => validator.validate({ id: 'not-a-number', name: 'test' })).to.throw(DataValidationError);
    });

  });

  describe('with a validator function', () => {

    it('uses the function for validation', () => {
      const fn = (data: any) => {
        if (!data || !data.email) throw new Error('email required');
        return { email: data.email.toLowerCase() };
      };
      const v = new JobValidator(fn);
      const result = v.validate({ email: 'FOO@BAR.COM' });
      expect(result.email).to.equal('foo@bar.com');
    });

    it('throws when the validator function throws', () => {
      const fn = () => { throw new Error('invalid'); };
      const v = new JobValidator(fn);
      expect(() => v.validate({})).to.throw('invalid');
    });

    it('returns the transformed data from the function', () => {
      const fn = (data: any) => ({ ...data, validated: true });
      const v = new JobValidator(fn);
      const result = v.validate({ foo: 'bar' });
      expect(result).to.eql({ foo: 'bar', validated: true });
    });

  });

});
