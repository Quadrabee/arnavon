import Command from '../base';
import { flags } from '@oclif/command';
import { Config, Server, default as Arnavon } from '../../';

class ApiCommand extends Command {
  async run() {
    const { flags } = this.parse(ApiCommand);
    const port = flags.port || 3000;
    const configPath = flags.config || 'config.yaml';

    const config = Config.fromFile(configPath);
    Arnavon.init(config);
    const server = new Server(config);
    server.start(port);
  }
}

ApiCommand.description = `Starts the Arnavon REST API
...
The REST API provides ways to push Jobs to queues, with validation
`;

ApiCommand.flags = {
  ...Command.flags,
  port: flags.integer({ char: 'p', description: 'Port to use for API (default 3000)' })
};

export default ApiCommand;
