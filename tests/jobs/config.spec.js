import Finitio from 'finitio';
import JobConfig from '../../src/jobs/config';
import { expect } from 'chai';
import sinon from 'sinon';
import chai from 'chai';
import sinonChai from 'sinon-chai';

chai.should();
chai.use(sinonChai);

describe('JobConfig', () => {

  const jobSchema = Finitio.system(`
  @import finitio/data
  {
    id   : String
    name : String
  }
  `);

  it('exports a class', () => {
    expect(JobConfig).to.be.a.instanceof(Function);
    expect(JobConfig.name).to.equal('JobConfig');
  });

  describe('its constructor', () => {
    it('expects a valid config object', () => {
      const test = (cfg) => () => new JobConfig(cfg);
      expect(test()).to.throw(/Config object expected, got/);
      expect(test(null)).to.throw(/Config object expected, got/);
    });

    it('expects a job name', () => {
      const test = (name) => () => new JobConfig({ name, inputSchema: jobSchema });
      expect(test(null)).to.throw(/Valid job name expected, got/);
      expect(test(undefined)).to.throw(/Valid job name expected, got/);
      expect(test({})).to.throw(/Valid job name expected, got/);
      // correct
      expect(test('valid-job-name')).to.not.throw();
    });

    it('expects a valid finitio schema (string)', () => {
      const test = (schema) => () => new JobConfig({ name: 'foo-bar', inputSchema: schema });
      expect(test(undefined)).to.throw(/Finitio inputSchema expected, got/);
      expect(test(null)).to.throw(/Finitio inputSchema expected, got/);
      expect(test({})).to.throw(/Finitio inputSchema expected, got/);
      // correct
      expect(test(`
        .
      `)).to.not.throw();
      expect(test(`
        {
          name: .String
        }
      `)).to.not.throw();
    });

    it('accepts an instanciated finitio schema', () => {
      const schema = Finitio.system(`
        {
          name: .String
        }
      `);
      // correct
      expect(() => new JobConfig({ name: 'foo', inputSchema: schema })).to.not.throw();
    });

    it('uses a default parent system importing finitio/data', () => {
      // Using String instead of .String
      const schema = `
        {
          name: String
        }
      `;
      // correct
      expect(() => new JobConfig({ name: 'foo', inputSchema: schema })).to.not.throw();
    });

    it('creates a subsystem if a parent system is passed', () => {
      const system = Finitio.system(`
        ID = .String
      `);
      const spy = sinon.spy(system, 'subsystem');
      const schema = `
      {
        name: ID
      }
      `;
      // correct
      const jobConfig = new JobConfig({ name: 'foo', inputSchema: schema }, system);
      expect(spy).to.be.calledOnceWith(schema);
    });

    it('returns clear errors when the schema (string) is invalid', () => {
      const test = (schema) => () => new JobConfig({ name: 'foo', inputSchema: schema });
      expect(test('foo bar baz')).to.throw(/Invalid finitio system:/);
    });
  });

});
