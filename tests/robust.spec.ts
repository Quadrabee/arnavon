import { expect } from 'chai';
import {
  ArnavonError,
  UnknownJobError,
  DataValidationError,
  InvalidBatch,
  InvalidRunError,
  inspect,
} from '../src/robust';

describe('robust', () => {

  describe('ArnavonError', () => {
    it('is an Error subclass', () => {
      const err = new ArnavonError('test message');
      expect(err).to.be.an.instanceof(Error);
      expect(err).to.be.an.instanceof(ArnavonError);
    });

    it('has a message property', () => {
      const err = new ArnavonError('test message');
      expect(err.message).to.equal('test message');
    });

    describe('#toJSON', () => {
      it('returns an object with error property', () => {
        const err = new ArnavonError('test message');
        expect(err.toJSON()).to.eql({ error: 'test message' });
      });
    });
  });

  describe('UnknownJobError', () => {
    it('is an ArnavonError subclass', () => {
      const err = new UnknownJobError('my-job');
      expect(err).to.be.an.instanceof(ArnavonError);
      expect(err).to.be.an.instanceof(UnknownJobError);
    });

    it('formats the job name in the message', () => {
      const err = new UnknownJobError('send-email');
      expect(err.message).to.equal('Unknown job: send-email, no definition found');
    });

    describe('#toJSON', () => {
      it('returns an object with the formatted error message', () => {
        const err = new UnknownJobError('send-email');
        expect(err.toJSON()).to.eql({ error: 'Unknown job: send-email, no definition found' });
      });
    });
  });

  describe('DataValidationError', () => {
    it('is an ArnavonError subclass', () => {
      const err = new DataValidationError('validation failed');
      expect(err).to.be.an.instanceof(ArnavonError);
      expect(err).to.be.an.instanceof(DataValidationError);
    });

    describe('.fromFinitioError', () => {
      it('creates a DataValidationError from a Finitio error', () => {
        const finitioError = {
          message: 'Type mismatch',
          location: 'root',
          rootCauses: [
            { message: 'Expected String', location: 'data.name' },
            { message: 'Expected Number', location: 'data.age' },
          ],
        };
        const err = DataValidationError.fromFinitioError('Validation failed:', finitioError as any);
        expect(err).to.be.an.instanceof(DataValidationError);
        expect(err.message).to.include('Validation failed:');
        expect(err.message).to.include('Expected String (data.name)');
        expect(err.message).to.include('Expected Number (data.age)');
      });

      it('handles empty rootCauses', () => {
        const finitioError = {
          message: 'Type mismatch',
          location: 'root',
          rootCauses: [],
        };
        const err = DataValidationError.fromFinitioError('Validation failed:', finitioError as any);
        expect(err).to.be.an.instanceof(DataValidationError);
        expect(err.message).to.equal('Validation failed: ');
      });
    });
  });

  describe('InvalidRunError', () => {
    it('is an ArnavonError subclass', () => {
      const err = new InvalidRunError('run failed');
      expect(err).to.be.an.instanceof(ArnavonError);
      expect(err).to.be.an.instanceof(InvalidRunError);
    });

    describe('#toJSON', () => {
      it('returns an object with error property', () => {
        const err = new InvalidRunError('run failed');
        expect(err.toJSON()).to.eql({ error: 'run failed' });
      });
    });
  });

  describe('InvalidBatch', () => {
    it('is a DataValidationError subclass', () => {
      const err = new InvalidBatch('batch failed', [{ invalid: 1 }], [{ valid: 1 }]);
      expect(err).to.be.an.instanceof(DataValidationError);
      expect(err).to.be.an.instanceof(InvalidBatch);
    });

    it('stores valid and invalid items', () => {
      const invalids = [{ data: 'invalid1' }, { data: 'invalid2' }];
      const valids = [{ data: 'valid1' }];
      const err = new InvalidBatch('batch failed', invalids, valids);
      expect(err.invalids).to.eql(invalids);
      expect(err.valids).to.eql(valids);
    });

    describe('#toJSON', () => {
      it('returns an object with error, valids, and invalids', () => {
        const invalids = [{ data: 'invalid1' }];
        const valids = [{ data: 'valid1' }, { data: 'valid2' }];
        const err = new InvalidBatch('batch validation failed', invalids, valids);
        expect(err.toJSON()).to.eql({
          error: 'batch validation failed',
          valids,
          invalids,
        });
      });
    });
  });

  describe('inspect', () => {
    it('returns "undefined" for undefined', () => {
      expect(inspect(undefined)).to.equal('undefined');
    });

    it('returns "null" for null', () => {
      expect(inspect(null)).to.equal('null');
    });

    it('returns constructor name for objects with constructors', () => {
      expect(inspect({})).to.equal('Object');
      expect(inspect([])).to.equal('Array');
      expect(inspect(new Date())).to.equal('Date');
      expect(inspect(new Error())).to.equal('Error');
    });

    it('returns constructor name for primitive wrappers', () => {
      expect(inspect('string')).to.equal('String');
      expect(inspect(42)).to.equal('Number');
      expect(inspect(true)).to.equal('Boolean');
    });

    it('returns constructor name for custom classes', () => {
      class MyClass {}
      expect(inspect(new MyClass())).to.equal('MyClass');
    });
  });

});
