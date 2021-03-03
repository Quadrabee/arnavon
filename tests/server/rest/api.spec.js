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
        dispatch: sinon.stub().returns(Promise.resolve())
      };
      api = createApi(dispatcher);
    });

    it('delegates to the dispatcher provided at construction', (done) => {
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

    it('uses the request unique identifier as a jobId', (done) => {
      const jobPayload = {
        foo: 'bar'
      };

      chai.request(api)
        .post('/jobs/foo-bar')
        .send(jobPayload)
        .end((err, res) => {
          expect(dispatcher.dispatch).to.be.calledOnceWith('foo-bar', jobPayload, { id: staticUuid });
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
  });

});
