import proxyquire from 'proxyquire';
import { expect, default as chai } from 'chai';
import chaiHttp from 'chai-http';
import createApiHelper from '../../../src/api';
import { UnknownJobError, DataValidationError } from '../../../src/robust';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import { JobDispatcher } from '../../../src/jobs';
import Arnavon from '../../../src/index';

chai.should();
chai.use(sinonChai);
chai.use(chaiHttp);

describe('server/createApi', () => {

  let createApi: (params?: any) => Express.Application, helperCalled: boolean, staticUuid: string;
  beforeEach(() => {
    staticUuid = 'ea47ac69-c0ca-4960-b905-6f14f2029744';
    helperCalled = false;
    createApi = proxyquire('../../../src/server/rest', {
      '../../api': {
        default: function() {
          helperCalled = true;
          // eslint-disable-next-line prefer-rest-params
          const api = createApiHelper(arguments as any as { agent: string});
          // make sure all request ids use our static uuid
          api.use((req, res, next) => {
            req.id = staticUuid;
            next();
          });
          return api;
        },
      },
    }).default;
  });

  it('calls the createApi helper (src/api)', () => {
    expect(helperCalled).to.equal(false);
    createApi();
    expect(helperCalled).to.equal(true);
  });

  describe('its POST /jobs/:id endpoint', () => {

    let api: Express.Application, dispatcher: Partial<JobDispatcher>;
    beforeEach(() => {
      dispatcher = {
        dispatch: sinon.stub().returns(Promise.resolve()),
        dispatchBatch: sinon.stub().returns(Promise.resolve()),
      };
      api = createApi(dispatcher);
    });

    it('delegates to the dispatcher provided at construction (default push mode is single)', (done) => {
      const jobPayload = {
        foo: 'bar',
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
        foo: 'bar',
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
          expect(args[3]).to.eql({ strict: false, headers: {} });
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
        foo: 'bar',
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
          expect(args[3]).to.eql({ strict: true, headers: {} });
          done();
        });
    });

    it('delegates to the dispatcher provided at construction (single mode)', (done) => {
      const jobPayload = {
        foo: 'bar',
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
        foo: 'bar',
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
        foo: 'bar',
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
        foo: 'bar',
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
        foo: 'bar',
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
        foo: 'bar',
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
        foo: 'bar',
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
        foo: 'bar',
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
        foo: 'bar',
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
        foo: 'bar',
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
        foo: 'bar',
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
        foo: 'bar',
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
        foo: 'bar',
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

    it('returns 400 when X-Arnavon-Batch-Input-Validation is used in SINGLE push mode', (done) => {
      chai.request(api)
        .post('/jobs/foo-bar')
        .set('X-Arnavon-Push-Mode', 'SINGLE')
        .set('X-Arnavon-Batch-Input-Validation', 'ALL-OR-NOTHING')
        .send({ foo: 'bar' })
        .end((err, res) => {
          res.should.have.status(400);
          res.body.should.eql({ error: 'X-Arnavon-Batch-Input-Validation cannot be used in SINGLE push mode' });
          done();
        });
    });

    it('passes X-* headers (except X-Arnavon-*) to the dispatcher options', (done) => {
      const jobPayload = { foo: 'bar' };

      chai.request(api)
        .post('/jobs/foo-bar')
        .set('X-Custom-Header', 'custom-value')
        .set('X-Another-Header', 'another-value')
        .set('X-Arnavon-Push-Mode', 'SINGLE')
        .send(jobPayload)
        .end((err, res) => {
          res.should.have.status(201);
          expect(dispatcher.dispatch).to.be.calledOnce;
          const { args } = dispatcher.dispatch.getCall(0);
          expect(args[3].headers).to.eql({
            'x-custom-header': 'custom-value',
            'x-another-header': 'another-value',
          });
          done();
        });
    });

    it('does not pass X-Arnavon-* headers to the queue headers', (done) => {
      const jobPayload = { foo: 'bar' };

      chai.request(api)
        .post('/jobs/foo-bar')
        .set('X-Custom-Header', 'custom-value')
        .set('X-Arnavon-Meta-Foo', 'meta-value')
        .send(jobPayload)
        .end((err, res) => {
          res.should.have.status(201);
          expect(dispatcher.dispatch).to.be.calledOnce;
          const { args } = dispatcher.dispatch.getCall(0);
          // X-Arnavon-Meta-Foo should not be in headers
          expect(args[3].headers).to.eql({
            'x-custom-header': 'custom-value',
          });
          done();
        });
    });

    it('passes X-Arnavon-Meta-* headers as metadata', (done) => {
      const jobPayload = { foo: 'bar' };

      chai.request(api)
        .post('/jobs/foo-bar')
        .set('X-Arnavon-Meta-User-Id', '12345')
        .set('X-Arnavon-Meta-Correlation-Id', 'abc-def')
        .send(jobPayload)
        .end((err, res) => {
          res.should.have.status(201);
          expect(dispatcher.dispatch).to.be.calledOnce;
          const { args } = dispatcher.dispatch.getCall(0);
          // Metadata should contain the x-arnavon-meta-* values (without the prefix)
          expect(args[2]).to.include({
            'user-id': '12345',
            'correlation-id': 'abc-def',
          });
          done();
        });
    });

    it('passes X-* headers to the dispatcher in batch mode', (done) => {
      const jobPayload = [{ foo: 'bar' }];

      chai.request(api)
        .post('/jobs/foo-bar')
        .set('X-Arnavon-Push-Mode', 'BATCH')
        .set('X-Delay', '5000')
        .send(jobPayload)
        .end((err, res) => {
          res.should.have.status(201);
          expect(dispatcher.dispatchBatch).to.be.calledOnce;
          const { args } = dispatcher.dispatchBatch.getCall(0);
          expect(args[3].headers).to.eql({
            'x-delay': '5000',
          });
          done();
        });
    });
  });

  describe('its POST /dlq/:queueName/requeue endpoint', () => {
    let api: Express.Application, dispatcher: Partial<JobDispatcher>, requeueStub: sinon.SinonStub;
    let originalQueue: any;

    beforeEach(() => {
      dispatcher = {
        dispatch: sinon.stub().returns(Promise.resolve()),
        dispatchBatch: sinon.stub().returns(Promise.resolve()),
      };
      requeueStub = sinon.stub().returns(Promise.resolve({ status: 'initiated', requeued: 0, failed: 0, errors: [] }));
      // Save and replace the queue with a mock
      originalQueue = Arnavon.queue;
      Arnavon.queue = {
        requeue: requeueStub,
        disconnect: sinon.stub().returns(Promise.resolve()),
      } as any;
      api = createApi(dispatcher);
    });

    afterEach(() => {
      // Restore original queue
      Arnavon.queue = originalQueue;
      sinon.restore();
    });

    it('calls queue.requeue with queue name and destinationQueue', (done) => {
      chai.request(api)
        .post('/dlq/my-dead-letters/requeue')
        .send({ destinationQueue: 'send-email' })
        .end((err, res) => {
          res.should.have.status(200);
          expect(requeueStub).to.be.calledOnceWith('my-dead-letters', {
            count: undefined,
            destinationQueue: 'send-email',
          });
          done();
        });
    });

    it('passes count query parameter as number', (done) => {
      chai.request(api)
        .post('/dlq/my-dead-letters/requeue?count=10')
        .send({ destinationQueue: 'send-email' })
        .end((err, res) => {
          res.should.have.status(200);
          expect(requeueStub).to.be.calledOnce;
          const { args } = requeueStub.getCall(0);
          expect(args[1].count).to.equal(10);
          expect(args[1].destinationQueue).to.equal('send-email');
          done();
        });
    });

    it('returns 200 with requeue result on success', (done) => {
      requeueStub.returns(Promise.resolve({ status: 'initiated', requeued: 0, failed: 0, errors: [] }));

      chai.request(api)
        .post('/dlq/my-dead-letters/requeue')
        .send({ destinationQueue: 'send-email' })
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.eql({ status: 'initiated', requeued: 0, failed: 0, errors: [] });
          done();
        });
    });

    it('returns 400 when destinationQueue is missing', (done) => {
      chai.request(api)
        .post('/dlq/my-dead-letters/requeue')
        .send({})
        .end((err, res) => {
          res.should.have.status(400);
          res.body.should.eql({ error: 'destinationQueue is required in request body' });
          done();
        });
    });

    it('returns 400 when destinationQueue is not a string', (done) => {
      chai.request(api)
        .post('/dlq/my-dead-letters/requeue')
        .send({ destinationQueue: 123 })
        .end((err, res) => {
          res.should.have.status(400);
          res.body.should.eql({ error: 'destinationQueue is required in request body' });
          done();
        });
    });

    it('returns 400 for invalid count parameter (non-numeric)', (done) => {
      chai.request(api)
        .post('/dlq/my-dead-letters/requeue?count=abc')
        .send({ destinationQueue: 'send-email' })
        .end((err, res) => {
          res.should.have.status(400);
          res.body.should.eql({ error: 'Invalid count parameter: must be a positive integer' });
          done();
        });
    });

    it('returns 400 for invalid count parameter (zero)', (done) => {
      chai.request(api)
        .post('/dlq/my-dead-letters/requeue?count=0')
        .send({ destinationQueue: 'send-email' })
        .end((err, res) => {
          res.should.have.status(400);
          res.body.should.eql({ error: 'Invalid count parameter: must be a positive integer' });
          done();
        });
    });

    it('returns 400 for invalid count parameter (negative)', (done) => {
      chai.request(api)
        .post('/dlq/my-dead-letters/requeue?count=-5')
        .send({ destinationQueue: 'send-email' })
        .end((err, res) => {
          res.should.have.status(400);
          res.body.should.eql({ error: 'Invalid count parameter: must be a positive integer' });
          done();
        });
    });

    it('returns 500 on queue requeue errors', (done) => {
      requeueStub.returns(Promise.reject(new Error('Queue connection failed')));

      chai.request(api)
        .post('/dlq/my-dead-letters/requeue')
        .send({ destinationQueue: 'send-email' })
        .end((err, res) => {
          res.should.have.status(500);
          res.body.should.eql({ error: 'Queue connection failed' });
          done();
        });
    });

    it('returns 500 with clear error when shovel plugin is not available', (done) => {
      requeueStub.returns(Promise.reject(new Error(
        'RabbitMQ Shovel plugin not available. ' +
        'Ensure the rabbitmq_shovel and rabbitmq_shovel_management plugins are enabled.'
      )));

      chai.request(api)
        .post('/dlq/my-dead-letters/requeue')
        .send({ destinationQueue: 'send-email' })
        .end((err, res) => {
          res.should.have.status(500);
          res.body.error.should.include('rabbitmq_shovel');
          done();
        });
    });
  });

});
