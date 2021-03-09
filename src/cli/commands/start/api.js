import Command from '../../base';
import { flags } from '@oclif/command';
import { Server, default as Arnavon } from '../../..';

class StartApiCommand extends Command {
  async run() {
    const { flags } = this.parse(StartApiCommand);
    const port = flags.port || 3000;
    const server = new Server(Arnavon.config);
    server.start(port);
  }
}

StartApiCommand.description = `Starts the Arnavon REST API
...
The REST API provides ways to push Jobs to queues, with validation
`;

StartApiCommand.flags = {
  ...Command.flags,
  port: flags.integer({ char: 'p', description: 'Port to use for API (default 3000)' })
};

export default StartApiCommand;
