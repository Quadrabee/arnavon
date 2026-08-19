import BaseQueueCommand from './base';

export default class StatusCommand extends BaseQueueCommand {

  static summary = 'Show the status of queues (messages, consumers)';

  static description = `Displays the status of all configured queues, including the number of messages and consumers.

This command connects to RabbitMQ and retrieves information about all queues defined in the topology.

Examples:
  $ arnavon queues:status
  $ arnavon queues:status -c config.yaml
`;

  static flags = {
    ...BaseQueueCommand.baseFlags,
  };

  async run() {
    const { flags } = await this.parse(StatusCommand);
    this.initApp(flags.config);

    await this.withQueue(async () => {
      // Get queue names from config topology
      const queueConfig = this.app.queueDefinition.config as { topology?: { queues?: Array<{ name: string }> } };
      const queueNames = queueConfig.topology?.queues?.map(q => q.name) || [];

      if (queueNames.length === 0) {
        this.log('No queues configured in topology.');
        return;
      }

      const queues = await this.app.queue.getQueuesInfo(queueNames);

      // @oclif/table is ESM-only (and pulls in a dependency using top-level
      // await), so it cannot be require()d from this CommonJS build.
      const { printTable } = await import('@oclif/table');

      printTable({
        data: queues,
        columns: [
          { key: 'name', name: 'Name' },
          { key: 'messages', name: 'Messages' },
          { key: 'consumers', name: 'Consumers' },
          { key: 'state', name: 'State' },
        ],
      });
    });
  }
}
