import { Command, Flags } from '@oclif/core';
import { Config, default as Arnavon } from '../../..';
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

  /**
   * Initialize Arnavon from config file.
   * Silences the logger to avoid noise in CLI output.
   */
  protected initArnavon(configPath: string) {
    logger.level(bunyan.FATAL + 1);
    const config = Config.fromFile(configPath);
    Arnavon.init(config);
  }

  /**
   * Execute a function with queue connection, ensuring proper disconnect.
   */
  protected async withQueue<T>(fn: () => Promise<T>): Promise<T> {
    await Arnavon.queue.connect();
    try {
      return await fn();
    } finally {
      await Arnavon.queue.disconnect();
    }
  }
}
