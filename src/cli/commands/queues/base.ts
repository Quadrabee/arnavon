import { Command, Flags } from '@oclif/core';
import ArnavonApp from '../../../app';
import logger from '../../../logger';
import bunyan from 'bunyan';

/**
 * Base command for queue-related CLI commands.
 * Provides common functionality for config loading and queue connection.
 */
export default abstract class BaseQueueCommand extends Command {

  static baseFlags = {
    config: Flags.string({
      summary: 'location of config file (defaults to \'config.yaml\').',
      char: 'c',
      default: 'config.yaml',
    }),
  }

  protected app: ArnavonApp;

  /**
   * Initialize ArnavonApp from config file.
   * Silences the logger to avoid noise in CLI output.
   */
  protected initApp(configPath: string) {
    logger.level(bunyan.FATAL + 1);
    this.app = ArnavonApp.fromYaml(configPath);
  }

  /**
   * Execute a function with queue connection, ensuring proper disconnect.
   */
  protected async withQueue<T>(fn: () => Promise<T>): Promise<T> {
    await this.app.queue.connect();
    try {
      return await fn();
    } finally {
      await this.app.queue.disconnect();
    }
  }
}
