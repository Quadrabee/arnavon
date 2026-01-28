import { Command } from '@oclif/core';

class QueueCommand extends Command {

  static summary = 'Queue management commands'

  async run() {
    this.error('Please specify a queue subcommand (e.g., requeue)');
  }
}

export default QueueCommand;
