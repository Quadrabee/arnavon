import { Command } from '@oclif/core';

class StartCommand extends Command {

  static summary = 'Starts an arnavon component'

  async run() {
    this.error('Please specify the component to start');
  }
}

export default StartCommand;
