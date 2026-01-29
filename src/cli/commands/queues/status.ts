import { CliUx } from '@oclif/core';
import { default as Arnavon } from '../../..';
import BaseQueueCommand from './base';

export default class StatusCommand extends BaseQueueCommand {

  static summary = 'Show the status of queues (messages, consumers)'

  static description = `Displays the status of all configured queues, including the number of messages and consumers.

This command connects to RabbitMQ and retrieves information about all queues defined in the topology.

Examples:
  $ arnavon queues:status
  $ arnavon queues:status -c config.yaml
`;

  static flags = {
    ...BaseQueueCommand.baseFlags,
  }

  async run() {
    const { flags } = await this.parse(StatusCommand);
    this.initArnavon(flags.config);

    await this.withQueue(async () => {
      // Get queue names from config topology
      const queueConfig = Arnavon.config.queue.config as { topology?: { queues?: Array<{ name: string }> } };
      const queueNames = queueConfig.topology?.queues?.map(q => q.name) || [];

      if (queueNames.length === 0) {
        this.log('No queues configured in topology.');
        return;
      }

      const queues = await Arnavon.queue.getQueuesInfo(queueNames);

      CliUx.ux.table(queues, {
        name: {
          header: 'Name',
        },
        messages: {
          header: 'Messages',
        },
        consumers: {
          header: 'Consumers',
        },
        state: {
          header: 'State',
        },
      });
    });
  }
}
