import { version } from '../../package.json';
import { expect, default as chai } from 'chai';
import chaiHttp from 'chai-http';
import createApi from '../../src/api';

chai.use(chaiHttp);

describe('createApi', () => {

  it('is a helper returning express app', () => {
    expect(createApi).to.be.an.instanceof(Function);
    const app = createApi();
    // Ways I found of checking it looks like an expressjs app
    // ""...if it quacks like a duck"
    expect(app.settings).to.be.an.instanceof(Object);
    expect(app.settings.view).to.be.an.instanceof(Function);
  });

  describe('the created API', () => {

    let api;
    beforeEach(() => {
      api = createApi({ agent: 'test' });
    });

    describe('GET /version', () => {
      it('should return the current version number', (done) => {
        chai.request(api)
          .get('/version')
          .end((err, res) => {
            res.should.have.status(200);
            res.body.should.eql({
              arnavon: {
                version,
                agent: 'test'
              }
            });
            done();
          });
      });
    });

    describe('GET /metrics', () => {
      it('should return prometheus metrics', (done) => {
        chai.request(api)
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
        chai.request(api)
          .get('/404')
          .end(() => {
            chai.request(api)
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
          c: 2
        }
      };
      api.post('/test', (req, res) => {
        expect(req.body).to.eql(payload);
        res.sendStatus(204);
      });
      chai.request(api)
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
          params: req.params
        });
      });
      chai.request(api)
        .get('/test/foo?bar=baz')
        .end((err, res) => {
          res.should.have.status(200);
          res.body.should.eql({
            params: { id: 'foo' },
            query: { bar: 'baz' }
          });
          done();
        });
    });

  });

});
