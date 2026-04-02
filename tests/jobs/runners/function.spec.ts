import FunctionRunner from '../../../src/jobs/runners/function';
import { expect, default as chai } from 'chai';
import sinonChai from 'sinon-chai';
import chaiAsPromised from 'chai-as-promised';
import Job from '../../../src/jobs/job';

chai.use(sinonChai);
chai.use(chaiAsPromised);

describe('FunctionRunner', () => {

  let testJob;
  beforeEach(() => {
    testJob = new Job({ email: 'test@test.com' }, {
      dispatched: new Date(),
      dequeued: new Date(),
    });
  });

  it('exports a class', () => {
    expect(FunctionRunner).to.be.an.instanceof(Function);
    expect(FunctionRunner.name).to.equal('FunctionRunner');
  });

  describe('its constructor', () => {
    it('accepts a handler function in config', () => {
      const handler = async (job) => job;
      const runner = new FunctionRunner({ type: 'function', handler, config: {} });
      expect(runner).to.be.an.instanceof(FunctionRunner);
    });
  });

  describe('#run', () => {
    it('calls the handler with the job and context', () => {
      let receivedJob, receivedContext;
      const handler = async (job, context) => {
        receivedJob = job;
        receivedContext = context;
        return 'done';
      };
      const runner = new FunctionRunner({ type: 'function', handler, config: {} });
      return runner.run(testJob).then((result) => {
        expect(result).to.equal('done');
        expect(receivedJob).to.be.an.instanceof(Job);
      });
    });

    it('propagates handler rejections', () => {
      const handler = async () => { throw new Error('handler failed'); };
      const runner = new FunctionRunner({ type: 'function', handler, config: {} });
      return expect(runner.run(testJob)).to.be.rejectedWith('handler failed');
    });
  });

});
