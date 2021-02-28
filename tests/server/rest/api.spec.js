import proxyquire from 'proxyquire';
import { expect, default as chai } from 'chai';
import chaiHttp from 'chai-http';
import createApiHelper from '../../../src/api';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import Arnavon from '../../../src';

chai.should();
chai.use(sinonChai);
chai.use(chaiHttp);

describe('server/createApi', () => {

  let createApi, helperCalled;
  beforeEach(() => {
    Arnavon._reset();
    helperCalled = false;
    createApi = proxyquire('../../../src/server/rest', {
      '../../api': {
        default: function() {
          helperCalled = true;
          return createApiHelper(arguments);
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

    // TODO improve the API behaviour in case of errors
    // Additional status code,
    // validation of job ids etc

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
