import fs from 'fs';
import path from 'path';
import JobRunner from '../runner';
import JobResult from '../result';
import { inspect } from '../../robust';
import { spawn } from 'child_process';

export default class BinaryRunner extends JobRunner {

  #fpath;
  #args;
  constructor(config) {
    super();

    if (!config.path) {
      throw new Error(`Binary path expected, got ${inspect(config.path)}`);
    }

    this.#fpath = path.join(process.cwd(), config.path);
    try {
      fs.accessSync(this.#fpath, fs.constants.X_OK);
    } catch (err) {
      // console.error(err);
      if (err.code === 'ENOENT') {
        throw new Error(`Binary '${config.path}' not found`);
      }
      if (err.code === 'EACCES') {
        throw new Error(`File '${config.path}' is not executable, check permission or chmod +x`);
      }
      throw err;
    }

    if (config.args && !Array.isArray(config.args)) {
      config.args = [config.args];
    }
    this.#args = config.args;
  }

  _run(job) {
    return new Promise((resolve, reject) => {
      const process = spawn(this.#fpath, this.#args);

      let stdoutData = '';
      process.stdout.on('data', (data) => {
        stdoutData = stdoutData + data;
      });

      process.stderr.on('data', (data) => {
        console.error(`stderr: ${data}`);
      });

      process.on('close', (code, signal) => {
        console.log('process closed', code, signal);
        // Check if maybe we were passed JSON
        try {
          stdoutData = JSON.parse(stdoutData);
        } catch (err) {
          // nope, it wasn't
        }

        if (code !== null && code > 0) {
          console.log(`child process failed with code ${code}`);
          return reject(JobResult.fail(new Error(`Process exited with code ${code}`), stdoutData));
        }

        if (signal !== null) {
          console.log(`child process failed because of signal ${signal}`);
          return reject(JobResult.fail(new Error(`Process killed by ${signal}`), stdoutData));
        }

        return resolve(JobResult.success(stdoutData));
      });

      // Write payload on stdin
      const data = JSON.stringify(job);
      process.stdin.write(`${data}\n`);
      process.stdin.end();
    });
  }
}
