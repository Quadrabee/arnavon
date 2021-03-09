import proxyquire from 'proxyquire';
import { expect, default as chai } from 'chai';
import chaiHttp from 'chai-http';
import createApiHelper from '../../../src/api';
import { UnknownJobError, DataValidationError } from '../../../src/robust';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';

chai.should();
chai.use(sinonChai);
chai.use(chaiHttp);

describe('server/createApi', () => {

  let createApi, helperCalled, staticUuid;
  beforeEach(() => {
    staticUuid = 'ea47ac69-c0ca-4960-b905-6f14f2029744';
    helperCalled = false;
    createApi = proxyquire('../../../src/server/rest', {
      '../../api': {
        default: function() {
          helperCalled = true;
          const api = createApiHelper(arguments);
          // make sure all request ids use our static uuid
          api.use((req, res, next) => {
            req.id = staticUuid;
            next();
          });
          return api;
        }
      }
    }).default;
  });

  it('calls the createApi helper (src/api)', () => {
    expect(helperCalled).to.equal(false);
    createApi();
    expect(helperCalled).to.equal(true);
  });

  describe('its POST /jobs/:id endpoint', () => {

    let api, dispatcher;
    beforeEach(() => {
      dispatcher = {
        dispatch: sinon.stub().returns(Promise.resolve()),
        dispatchBatch: sinon.stub().returns(Promise.resolve())
      };
      api = createApi(dispatcher);
    });

    it('delegates to the dispatcher provided at construction (default push mode is single)', (done) => {
      const jobPayload = {
        foo: 'bar'
      };

      chai.request(api)
        .post('/jobs/foo-bar')
        .send(jobPayload)
        .end((err, res) => {
          expect(dispatcher.dispatch).to.be.calledOnceWith('foo-bar', jobPayload);
          done();
        });
    });

    it('fails for unknown x-arnavon-push-mode headers', (done) => {
      chai.request(api)
        .post('/jobs/foo-bar')
        // batch mode
        .set('X-Arnavon-Push-Mode', 'FOO-BAR')
        .send({})
        .end((err, res) => {
          res.should.have.status(400);
          done();
        });
    });

    it('delegates to the dispatcher provided at construction (batch mode)', (done) => {
      const jobPayload = {
        foo: 'bar'
      };

      chai.request(api)
        .post('/jobs/foo-bar')
        // batch mode
        .set('X-Arnavon-Push-Mode', 'BATCH')
        .send(jobPayload)
        .end((err, res) => {
          res.should.have.status(201);
          expect(dispatcher.dispatchBatch).to.be.calledOnce;
          const { args } = dispatcher.dispatchBatch.getCall(0);
          expect(args[0]).to.equal('foo-bar');
          expect(args[1]).to.eql(jobPayload);
          // default validation mode
          expect(args[3]).to.eql({ strict: false });
          done();
        });
    });

    it('fails for unknown x-arnavon-batch-input-validation headers', (done) => {
      chai.request(api)
        .post('/jobs/foo-bar')
        .set('X-Arnavon-Batch-Input-Validation', 'FOO-BAR')
        .send({})
        .end((err, res) => {
          res.should.have.status(400);
          done();
        });
    });

    it('delegates to the dispatcher in strict mode if X-Arnavon-Batch-Input-Validation == all-or-nothing', (done) => {
      const jobPayload = {
        foo: 'bar'
      };

      chai.request(api)
        .post('/jobs/foo-bar')
        // batch mode
        .set('X-Arnavon-Push-Mode', 'batch')
        .set('X-Arnavon-Batch-Input-Validation', 'all-or-nothing')
        .send(jobPayload)
        .end((err, res) => {
          res.should.have.status(201);
          expect(dispatcher.dispatchBatch).to.be.calledOnce;
          const { args } = dispatcher.dispatchBatch.getCall(0);
          expect(args[0]).to.equal('foo-bar');
          expect(args[1]).to.eql(jobPayload);
          expect(args[3]).to.eql({ strict: true });
          done();
        });
    });

    it('delegates to the dispatcher provided at construction (single mode)', (done) => {
      const jobPayload = {
        foo: 'bar'
      };

      chai.request(api)
        .post('/jobs/foo-bar')
        // batch mode
        .set('X-Arnavon-Push-Mode', 'SINGLE')
        .send(jobPayload)
        .end((err, res) => {
          res.should.have.status(201);
          expect(dispatcher.dispatch).to.be.calledOnce;
          const { args } = dispatcher.dispatch.getCall(0);
          expect(args[0]).to.equal('foo-bar');
          expect(args[1]).to.eql(jobPayload);
          done();
        });
    });

    it('uses the request unique identifier as a jobId', (done) => {
      const jobPayload = {
        foo: 'bar'
      };

      chai.request(api)
        .post('/jobs/foo-bar')
        .send(jobPayload)
        .end((err, res) => {
          res.should.have.status(201);
          expect(dispatcher.dispatch).to.be.calledOnceWith('foo-bar', jobPayload, { id: staticUuid });
          done();
        });
    });

    it('uses the request unique identifier as a batchId (batch mode)', (done) => {
      const jobPayload = {
        foo: 'bar'
      };

      chai.request(api)
        .post('/jobs/foo-bar')
        // batch mode
        .set('X-Arnavon-Push-Mode', 'BATCH')
        .send(jobPayload)
        .end((err, res) => {
          res.should.have.status(201);
          expect(dispatcher.dispatchBatch).to.be.calledOnceWith('foo-bar', jobPayload, { id: staticUuid });
          done();
        });
    });

    it('returns 201 with dispatcher answer on successful dispatch', (done) => {
      const jobPayload = {
        foo: 'bar'
      };
      dispatcher.dispatch.returns(Promise.resolve({ ok: true }));

      chai.request(api)
        .post('/jobs/foo-bar')
        .send(jobPayload)
        .end((err, res) => {
          res.should.have.status(201);
          res.body.should.eql({ ok: true });
          done();
        });
    });

    it('returns 201 with dispatcher answer on successful dispatch (batch mode)', (done) => {
      const jobPayload = {
        foo: 'bar'
      };
      dispatcher.dispatchBatch.returns(Promise.resolve({ ok: true }));

      chai.request(api)
        .post('/jobs/foo-bar')
        // batch mode
        .set('X-Arnavon-Push-Mode', 'BATCH')
        .send(jobPayload)
        .end((err, res) => {
          res.should.have.status(201);
          res.body.should.eql({ ok: true });
          done();
        });
    });

    it('returns 404 on unknown job errors', (done) => {
      const jobPayload = {
        foo: 'bar'
      };
      dispatcher.dispatch.returns(Promise.reject(new UnknownJobError('unknown-job')));

      chai.request(api)
        .post('/jobs/foo-bar')
        .send(jobPayload)
        .end((err, res) => {
          res.should.have.status(404);
          res.body.should.eql({ error: 'Unknown job: unknown-job, no definition found' });
          done();
        });
    });

    it('returns 404 on unknown job errors (batch mode)', (done) => {
      const jobPayload = {
        foo: 'bar'
      };
      dispatcher.dispatchBatch.returns(Promise.reject(new UnknownJobError('unknown-job')));

      chai.request(api)
        .post('/jobs/foo-bar')
        // batch mode
        .set('X-Arnavon-Push-Mode', 'BATCH')
        .send(jobPayload)
        .end((err, res) => {
          res.should.have.status(404);
          res.body.should.eql({ error: 'Unknown job: unknown-job, no definition found' });
          done();
        });
    });

    it('returns 400 on invalid job payload', (done) => {
      const jobPayload = {
        foo: 'bar'
      };
      dispatcher.dispatch.returns(Promise.reject(new DataValidationError('invalid-payload')));

      chai.request(api)
        .post('/jobs/foo-bar')
        .send(jobPayload)
        .end((err, res) => {
          res.should.have.status(400);
          res.body.should.eql({ error: 'invalid-payload' });
          done();
        });
    });

    it('returns 400 on invalid job payload (batch mode)', (done) => {
      const jobPayload = {
        foo: 'bar'
      };
      dispatcher.dispatchBatch.returns(Promise.reject(new DataValidationError('invalid-payload')));

      chai.request(api)
        .post('/jobs/foo-bar')
        // batch mode
        .set('X-Arnavon-Push-Mode', 'BATCH')
        .send(jobPayload)
        .end((err, res) => {
          res.should.have.status(400);
          res.body.should.eql({ error: 'invalid-payload' });
          done();
        });
    });

    it('returns 500 with error on dispatch errors (rejected promises)', (done) => {
      const jobPayload = {
        foo: 'bar'
      };
      dispatcher.dispatch.returns(Promise.reject(new Error('Oops')));

      chai.request(api)
        .post('/jobs/foo-bar')
        .send(jobPayload)
        .end((err, res) => {
          res.should.have.status(500);
          res.body.should.eql({ error: 'Oops' });
          done();
        });
    });

    it('returns 500 with error on dispatch errors (thrown error)', (done) => {
      const jobPayload = {
        foo: 'bar'
      };
      dispatcher.dispatch.throws(new Error('Oops'));

      chai.request(api)
        .post('/jobs/foo-bar')
        .send(jobPayload)
        .end((err, res) => {
          res.should.have.status(500);
          res.body.should.eql({ error: 'Oops' });
          done();
        });
    });

    it('returns 500 with error on dispatch errors (rejected promises, batch mode)', (done) => {
      const jobPayload = {
        foo: 'bar'
      };
      dispatcher.dispatchBatch.returns(Promise.reject(new Error('Oops')));

      chai.request(api)
        .post('/jobs/foo-bar')
        // batch mode
        .set('X-Arnavon-Push-Mode', 'BATCH')
        .send(jobPayload)
        .end((err, res) => {
          res.should.have.status(500);
          res.body.should.eql({ error: 'Oops' });
          done();
        });
    });

    it('returns 500 with error on dispatch errors (thrown error, batch mode)', (done) => {
      const jobPayload = {
        foo: 'bar'
      };
      dispatcher.dispatchBatch.throws(new Error('Oops'));

      chai.request(api)
        .post('/jobs/foo-bar')
        // batch mode
        .set('X-Arnavon-Push-Mode', 'BATCH')
        .send(jobPayload)
        .end((err, res) => {
          res.should.have.status(500);
          res.body.should.eql({ error: 'Oops' });
          done();
        });
    });
  });

});
