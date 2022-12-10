import JobRunner, { JobRunnerConfig } from '../runner';
import JobResult from '../result';
import { inspect } from '../../robust';
import { spawn } from 'child_process';
import { sync as commandExistsSync } from 'command-exists';

export interface BinaryRunnerConfig extends JobRunnerConfig {
  path: string
  args: string[]
}

export default class BinaryRunner extends JobRunner {

  protected command: string;
  protected args: string[];
  constructor(config: BinaryRunnerConfig) {
    super(config);

    if (!config.path) {
      throw new Error(`Binary path expected, got ${inspect(config.path)}`);
    }

    if (!commandExistsSync(config.path)) {
      throw new Error(`Command '${config.path}' not found, or not executable`);
    }
    this.command = config.path;

    if (config.args && !Array.isArray(config.args)) {
      this.args = [config.args];
    } else if (config.args) {
      this.args = config.args;
    } else {
      this.args = [];
    }
  }

  _run(job: any) {
    return new Promise((resolve, reject) => {
      const process = spawn(this.command, this.args);

      let stdoutData = '';
      process.stdout.on('data', (data) => {
        stdoutData = stdoutData + data;
      });

      process.stderr.on('data', (data) => {
        console.error(`stderr: ${data}`);
      });

      process.on('close', (code, signal) => {
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
