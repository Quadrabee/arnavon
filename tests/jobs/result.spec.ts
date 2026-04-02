import JobResult from '../../src/jobs/result';
import { expect } from 'chai';

describe('JobResult', () => {

  it('exports a class', () => {
    expect(JobResult).to.be.an.instanceof(Function);
    expect(JobResult.name).to.equal('JobResult');
  });

  describe('its constructor', () => {

    it('sets success, error, and result properties', () => {
      const err = new Error('test error');
      const result = new JobResult({ success: false, error: err, result: 'some data' });
      expect((result as any).success).to.equal(false);
      expect((result as any).error).to.equal(err);
      expect((result as any).result).to.equal('some data');
    });

    it('makes properties immutable', () => {
      const result = new JobResult({ success: true, result: 'data' });

      expect(() => {
        (result as any).success = false;
      }).to.throw(TypeError);

      expect(() => {
        (result as any).result = 'changed';
      }).to.throw(TypeError);

      expect(() => {
        (result as any).error = new Error('nope');
      }).to.throw(TypeError);

      expect((result as any).success).to.equal(true);
      expect((result as any).result).to.equal('data');
    });

    it('defaults error to undefined when not provided', () => {
      const result = new JobResult({ success: true, result: 42 });
      expect((result as any).error).to.be.undefined;
    });

  });

  describe('.fail', () => {

    it('returns a JobResult instance', () => {
      const err = new Error('failure');
      const result = JobResult.fail(err, 'fail data');
      expect(result).to.be.an.instanceof(JobResult);
    });

    it('sets success to false', () => {
      const err = new Error('failure');
      const result = JobResult.fail(err, 'fail data');
      expect((result as any).success).to.equal(false);
    });

    it('stores the error', () => {
      const err = new Error('test failure');
      const result = JobResult.fail(err, null);
      expect((result as any).error).to.equal(err);
      expect((result as any).error.message).to.equal('test failure');
    });

    it('stores the result', () => {
      const err = new Error('failure');
      const result = JobResult.fail(err, { partial: 'data' });
      expect((result as any).result).to.deep.equal({ partial: 'data' });
    });

  });

  describe('.success', () => {

    it('returns a JobResult instance', () => {
      const result = JobResult.success('ok');
      expect(result).to.be.an.instanceof(JobResult);
    });

    it('sets success to true', () => {
      const result = JobResult.success('ok');
      expect((result as any).success).to.equal(true);
    });

    it('stores the result', () => {
      const result = JobResult.success({ answer: 42 });
      expect((result as any).result).to.deep.equal({ answer: 42 });
    });

    it('does not set an error', () => {
      const result = JobResult.success('ok');
      expect((result as any).error).to.be.undefined;
    });

  });

});
