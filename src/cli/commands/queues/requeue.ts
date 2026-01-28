import { Flags, Command } from '@oclif/core';
import { Config, default as Arnavon } from '../../..';
import logger from '../../../logger';
import bunyan from 'bunyan';

export default class RequeueCommand extends Command {

  static summary = 'Requeue messages from a dead letter queue back to the original queue'

  static description = `Moves messages from a dead letter queue back to the original queue for reprocessing.

This command uses the RabbitMQ Shovel plugin to efficiently move messages.
Messages are republished to the exchange with their original routing key.

Examples:
  $ arnavon queue requeue my-queue
  $ arnavon queue requeue my-queue --count 10
  $ arnavon queue requeue my-queue -n 100 -c config.yaml
`;

  static args = [{
    name: 'queueName',
    required: true,
    description: 'The name of the dead letter queue to requeue from',
  }]

  static flags = {
    config: Flags.string({
      summary: 'location of config file (defaults to \'config.yaml\').',
      char: 'c',
      default: 'config.yaml',
    }),
    count: Flags.integer({
      char: 'n',
      description: 'Number of messages to requeue (default: all messages)',
    }),
  }

  async run() {
    const { args, flags } = await this.parse(RequeueCommand);
    const configPath = flags.config || 'config.yaml';
    const { queueName } = args;
    const { count } = flags;
    logger.level(bunyan.FATAL + 1);

    if (count !== undefined && count < 1) {
      this.error('Count must be a positive integer');
    }

    const config = Config.fromFile(configPath);
    Arnavon.init(config);

    this.log('Connecting to queue...');
    await Arnavon.queue.connect();

    try {
      this.log(`Requeuing messages from ${queueName}${count ? ` (limit: ${count})` : ''}...`);
      const result = await Arnavon.queue.requeue(queueName, { count });

      this.log('');
      this.log(`Status: ${result.status}`);
      this.log(`Requeued: ${result.requeued}`);
      if (result.failed > 0) {
        this.log(`Failed: ${result.failed}`);
        for (const err of result.errors) {
          this.warn(`  - ${err.error}`);
        }
      }
    } finally {
      await Arnavon.queue.disconnect();
    }
  }
}
