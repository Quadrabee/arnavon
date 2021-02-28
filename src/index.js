import Config from './config';
import Consumer from './consumer';
import Server from './server';
import Queue from './queue';
import promClient from 'prom-client';

/**
 * Arnavon uses a singleton pattern for the main "module"
 * exposing the prometheus instance, the queue, the config etc
 */
class Arnavon {
  constructor() {
    this._reset();
  }

  // for test purposes, shouldn't really be used
  _reset() {
    this.registry = new promClient.Registry();
  }
}

export default new Arnavon();

export {
  Config,
  Queue,
  Server,
  Consumer
};
