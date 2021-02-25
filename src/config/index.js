import Finitio from './finitio';

export default {
  load(path = 'config.yaml') {
    return Finitio.ArnavonConfig.dressFromFile(path);
  }
};
