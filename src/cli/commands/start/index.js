import Command from '../../base';

class StartCommand extends Command {
  async run() {
    this.error('Please specify the component to start');
  }
}

StartCommand.description = 'Starts an arnavon component';

StartCommand.flags = {
  ...Command.flags
};

export default StartCommand;
