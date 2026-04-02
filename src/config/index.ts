require('@babel/register');
import fs from 'fs';
import path from 'path';
import types from './finitio';
import Finitio from 'finitio';
import JobConfig from '../jobs/config';
import { QueueConfig } from '../queue';
import ConsumerConfig from '../consumer/config';
import { ValidatorFn } from '../jobs/validator';
import { HandlerFn } from '../jobs/runners/function';
import { Mode } from '../jobs/runner';

/**
 * TypeScript interfaces for programmatic config construction.
 */
export interface JobDefinition {
  name: string
  inputSchema: string | ValidatorFn
  invalidJobExchange?: string
}

export interface RunnerDefinition {
  type: string
  mode?: Mode | string
  config?: Record<string, unknown>
}

export interface ConsumerDefinition {
  name: string
  queue: string
  runner?: RunnerDefinition
  handler?: HandlerFn
}

export interface QueueDefinition {
  driver: string
  config: Record<string, unknown>
}

export interface ArnavonOptions {
  queue: QueueDefinition
  jobs: JobDefinition[]
  consumers: ConsumerDefinition[]
}

export default class ArnavonConfig {

  public readonly jobs: Array<JobConfig>;
  public readonly cwd: string;
  public readonly queue: QueueConfig;
  public readonly consumers: Array<ConsumerConfig>;

  constructor(data: ArnavonConfig, cwd: string) {
    this.jobs = data.jobs;
    this.queue = data.queue;
    this.consumers = data.consumers;
    this.cwd = cwd;
  }

  /**
   * Create an ArnavonConfig from a YAML file (v1 path).
   */
  static fromFile(fname = 'config.yaml') {
    const fpath = path.join(process.cwd(), fname);
    try {
      fs.accessSync(fpath, fs.constants.R_OK);
    } catch (err) {
      if (err.code === 'ENOENT') {
        throw new Error(`Config file not found: '${fname}'.`);
      }
      if (err.code === 'EACCES') {
        throw new Error(`Config file '${fname}' is not readable, check permissions.`);
      }
      throw err;
    }

    const configFolder = path.dirname(fpath);

    // check if a schema.world.js is present in same folder as config, if so use it as base finitio world
    let baseWorld = null;
    const worldPath = path.join(configFolder, 'schema.world.js');
    if (fs.existsSync(worldPath)) {
      baseWorld = require(path.relative(__dirname, worldPath));
      baseWorld = baseWorld && baseWorld.default ? baseWorld.default : baseWorld;
    }

    // check if a schema.fio is present in same folder as config, if so use it as base finitio system
    let baseSystem;
    const schemaPath = path.join(configFolder, 'schema.fio');
    if (fs.existsSync(schemaPath)) {
      baseSystem = Finitio.system(fs.readFileSync(schemaPath).toString(), { JsTypes: baseWorld });
    }

    return new ArnavonConfig(types.ArnavonConfig.dressFromFile(fpath, baseSystem), configFolder);
  }

  /**
   * Create an ArnavonConfig from plain TypeScript objects (v2 path).
   *
   * This allows programmatic configuration without YAML or Finitio.
   * Job input validation can use validator functions instead of Finitio schemas.
   */
  static from(options: ArnavonOptions, cwd?: string): ArnavonConfig {
    const jobs = options.jobs.map((jobDef) => {
      return new JobConfig({
        name: jobDef.name,
        inputSchema: jobDef.inputSchema,
        invalidJobExchange: jobDef.invalidJobExchange,
      } as unknown as JobConfig);
    });

    const consumers = options.consumers.map((consumerDef) => {
      if (consumerDef.handler) {
        return new ConsumerConfig({
          name: consumerDef.name,
          queue: consumerDef.queue,
          handler: consumerDef.handler,
        });
      }
      return new ConsumerConfig({
        name: consumerDef.name,
        queue: consumerDef.queue,
        runner: consumerDef.runner,
      } as unknown as ConsumerConfig);
    });

    const data = {
      queue: options.queue as QueueConfig,
      jobs,
      consumers,
    };

    return new ArnavonConfig(data as unknown as ArnavonConfig, cwd || process.cwd());
  }
}
