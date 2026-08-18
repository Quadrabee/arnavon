'use strict';
import { expect, use, should } from 'chai';
import { version } from '../../package.json';
import chaiHttp, { request as httpRequest } from 'chai-http';
import createApi from '../../src/api';
import logger from '../../src/logger';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import { validate } from 'uuid';

should();
use(sinonChai);
use(chaiHttp);

describe('createApi', () => {

  it('is a helper returning express app', () => {
    expect(createApi).to.be.an.instanceof(Function);
    const app = createApi();
    // Ways I found of checking it looks like an expressjs app
    // ""...if it quacks like a duck"
    // express 5 creates `settings` with a null prototype, so `instanceof Object`
    // no longer holds; duck-type on the shape instead.
    expect(app.settings).to.be.an('object');
    expect(app.settings.view).to.be.an.instanceof(Function);
  });

  describe('the created API', () => {

    let api;
    beforeEach(() => {
      api = createApi({ agent: 'test' });
    });

    describe('GET /version', () => {
      it('should return the current version number', (done) => {
        httpRequest.execute(api)
          .get('/version')
          .end((err, res) => {
            res.should.have.status(200);
            res.body.should.eql({
              arnavon: {
                version,
                agent: 'test',
              },
            });
            done();
          });
      });
    });

    describe('GET /metrics', () => {
      it('should return prometheus metrics', (done) => {
        httpRequest.execute(api)
          .get('/metrics')
          .end((err, res) => {
            res.should.have.status(200);
            res.should.have.header('content-type', 'text/plain');
            res.text.should.match(/TYPE/);
            res.text.should.match(/HELP up/);
            done();
          });
      });

      it('should be updated after other requests', (done) => {
        httpRequest.execute(api)
          .get('/404')
          .end(() => {
            httpRequest.execute(api)
              .get('/metrics')
              .end((err, res) => {
                res.should.have.status(200);
                res.should.have.header('content-type', 'text/plain');
                res.text.should.match(/status_code="404"/);
                done();
              });
          });
      });
    });

    it('parses JSON payload', (done) => {
      const payload = {
        a: 1,
        b: {
          c: 2,
        },
      };
      api.post('/test', (req, res) => {
        expect(req.body).to.eql(payload);
        res.sendStatus(204);
      });
      httpRequest.execute(api)
        .post('/test')
        .send(payload)
        .end((err, res) => {
          res.should.have.status(204);
          done();
        });
    });

    it('parses URL params & query', (done) => {
      api.get('/test/:id', (req, res) => {
        res.status(200).send({
          query: req.query,
          params: req.params,
        });
      });
      httpRequest.execute(api)
        .get('/test/foo?bar=baz')
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.eql({
            params: { id: 'foo' },
            query: { bar: 'baz' },
          });
          done();
        });
    });

    it('decorates the request object with a unique id & with a (child) logger decorated with that reqId', (done) => {
      const spy = sinon.spy(logger, 'child');
      let request;

      api.get('/test', (req, res) => {
        res.sendStatus(200);
        request = req;
      });

      httpRequest.execute(api)
        .get('/test')
        .end((err, res) => {
          expect(request).to.exist;
          expect(request.logger).to.exist;
          expect(spy).to.be.calledOnce;
          const call = spy.getCall(0);
          const [{ reqId }] = call.args;
          expect(validate(reqId)).to.be.true;
          expect(request.id).to.equal(reqId);
          done();
        });
    });

  });

});
