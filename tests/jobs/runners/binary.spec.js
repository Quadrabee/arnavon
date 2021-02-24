import BinaryRunner from '../../../src/jobs/runners/binary';
import { expect } from 'chai';

describe('BinaryRunner', () => {

  const testBinary = './tests/jobs/runners/runner.sh';

  it('exports a class', () => {
    expect(BinaryRunner).to.be.an.instanceof(Function);
    expect(BinaryRunner.name).to.equal('BinaryRunner');
  });

  describe('its constructor', () => {
    it('expects the config to contain a module path', () => {
      expect(() => new BinaryRunner({})).to.throw(/Binary path expected, got/);
    });

    it('throws errors if the binary can\'t be found/is not executable', () => {
      const test = (m) => () => new BinaryRunner({ path: m });

      // not found
      expect(test('foo/bar')).to.throw('Binary \'foo/bar\' not found');
      // not executable
      expect(test('./package.json')).to.throw(/File.*package.json.*is not executable/);
      // correct
      expect(test(testBinary)).not.to.throw();
    });

    it('accepts argument(s) to be passed to the binary', () => {
      const test = (args) => () => new BinaryRunner({ path: testBinary, args });

      expect(test('arg')).to.not.throw();
      expect(test(['arg'])).to.not.throw();
      expect(test(['arg', 12])).to.not.throw();
    });

  });

  let job;
  beforeEach(() => {
    // since we test _run and not run(), we can pass whatever
    job = { foo: 'bar' };
  });

  describe('#_run', () => {

    it('returns a promise', () => {
      const runner = new BinaryRunner({ path: testBinary });
      const p = runner._run(job);
      expect(p).to.be.an.instanceOf(Promise);
    });

    it('returns a promise resolving the stdout of the process', (done) => {
      const runner = new BinaryRunner({ path: testBinary });
      const p = runner._run(job);
      p.then((output) => {
        expect(output).to.equal('Hello World!\n');
        done();
      }).catch(done);
    });

    it('when created with args, it passes them to the binary', (done) => {
      const runner = new BinaryRunner({ path: testBinary, args: ['printargs', 42, 'foo', 'bar'] });
      const p = runner._run(job);
      p.then((output) => {
        expect(output).to.equal('printargs 42 foo bar\n');
        done();
      }).catch(done);
    });

    it('it passes the job payload on the process stdin', (done) => {
      const runner = new BinaryRunner({ path: testBinary, args: 'echo' });
      const p = runner._run('this is the job payload');
      p.then((output) => {
        expect(output).to.equal('this is the job payload');
        done();
      }).catch(done);
    });

    it('parses the binary\'s output as JSON when possible', (done) => {
      const runner = new BinaryRunner({ path: testBinary, args: ['json'] });
      const p = runner._run(job);
      p.then((output) => {
        expect(output).to.deep.equal({ foo: 'bar', sub: { baz: 42 } });
        done();
      }).catch(done);
    });

    it('waits for the process to finish before resolving the promise', (done) => {
      // our 'wait' command wait at least 1 second before quitting
      const runner = new BinaryRunner({ path: testBinary, args: 'sleep' });
      const start = Date.now();
      const p = runner._run(job);
      p.then(() => {
        const elapsed = Date.now() - start;
        expect(elapsed).to.be.greaterThan(900); // 900 miliseconds
        done();
      }).catch(done);
    });

    it('fails the promise when the process exit > 0', (done) => {
      // our 'fail' command exits 10
      const runner = new BinaryRunner({ path: testBinary, args: 'fail' });
      const p = runner._run(job);
      p.then(() => {
        done('Shouldn\'t have resolved the promise');
      }).catch(() => {
        done();
      });
    });

    it('fails the promise when the process segfaults', (done) => {
      // our 'segfault' command ... segfaults :)
      const runner = new BinaryRunner({ path: testBinary, args: 'segfault' });
      const p = runner._run(job);
      p.then((output) => {
        done('Shouldn\'t have resolved the promise');
      }).catch(() => {
        done();
      });
    });

  });
});
