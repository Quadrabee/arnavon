import JobRunner, { JobRunnerConfig } from '../runner';
import JobResult from '../result';
import { inspect } from '../../robust';
import { spawn, ChildProcess } from 'child_process';
import { sync as commandExistsSync } from 'command-exists';
import Job from '../job';

// Default timeout: 5 minutes
const DEFAULT_TIMEOUT_MS = 5 * 60 * 1000;
// Maximum stdout buffer size: 10MB
const MAX_STDOUT_SIZE = 10 * 1024 * 1024;

export interface BinaryRunnerConfig extends JobRunnerConfig {
  path: string
  args: string[]
  timeout?: number
}

export default class BinaryRunner extends JobRunner {

  protected command: string;
  protected args: string[];
  protected timeout: number;

  constructor(config: BinaryRunnerConfig) {
    super(config);

    if (!config.path) {
      throw new Error(`Binary path expected, got ${inspect(config.path)}`);
    }

    if (!commandExistsSync(config.path)) {
      throw new Error(`Command '${config.path}' not found, or not executable`);
    }
    this.command = config.path;
    this.timeout = config.timeout || DEFAULT_TIMEOUT_MS;

    if (config.args && !Array.isArray(config.args)) {
      this.args = [config.args];
    } else if (config.args) {
      this.args = config.args;
    } else {
      this.args = [];
    }
  }

  _run(job: Job) {
    return new Promise((resolve, reject) => {
      let childProcess: ChildProcess;
      let timeoutId: NodeJS.Timeout | null = null;
      let resolved = false;

      const cleanup = () => {
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
      };

      const finish = (fn: typeof resolve | typeof reject, value: unknown) => {
        if (resolved) {
          return;
        }
        resolved = true;
        cleanup();
        fn(value);
      };

      try {
        childProcess = spawn(this.command, this.args);
      } catch (err) {
        return reject(JobResult.fail(err as Error, null));
      }

      // Set up timeout
      timeoutId = setTimeout(() => {
        if (!resolved) {
          childProcess.kill('SIGTERM');
          // Give it a moment to terminate gracefully, then force kill
          setTimeout(() => {
            if (!resolved) {
              childProcess.kill('SIGKILL');
            }
          }, 1000);
          finish(reject, JobResult.fail(new Error(`Process timed out after ${this.timeout}ms`), null));
        }
      }, this.timeout);

      let stdoutData = '';
      let stdoutTruncated = false;

      childProcess.stdout?.on('data', (data) => {
        if (stdoutData.length < MAX_STDOUT_SIZE) {
          stdoutData = stdoutData + data;
          if (stdoutData.length >= MAX_STDOUT_SIZE) {
            stdoutTruncated = true;
            stdoutData = stdoutData.substring(0, MAX_STDOUT_SIZE);
          }
        }
      });

      childProcess.stderr?.on('data', (data) => {
        // Log stderr but don't accumulate it unboundedly
        process.stderr.write(`[BinaryRunner stderr]: ${data}`);
      });

      childProcess.on('error', (err) => {
        finish(reject, JobResult.fail(err, null));
      });

      childProcess.on('close', (code, signal) => {
        // Check if maybe we were passed JSON
        let parsedOutput: string | unknown = stdoutData;
        try {
          parsedOutput = JSON.parse(stdoutData);
        } catch {
          // not JSON, keep as string
        }

        if (stdoutTruncated) {
          parsedOutput = { truncated: true, data: parsedOutput };
        }

        if (code !== null && code > 0) {
          return finish(reject, JobResult.fail(new Error(`Process exited with code ${code}`), parsedOutput));
        }

        if (signal !== null) {
          return finish(reject, JobResult.fail(new Error(`Process killed by ${signal}`), parsedOutput));
        }

        return finish(resolve, JobResult.success(parsedOutput));
      });

      // Write payload on stdin
      try {
        const data = JSON.stringify(job);
        childProcess.stdin?.write(`${data}\n`);
        childProcess.stdin?.end();
      } catch (err) {
        finish(reject, JobResult.fail(err as Error, null));
      }
    });
  }
}
