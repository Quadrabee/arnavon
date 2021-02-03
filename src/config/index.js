import Finitio from './finitio';

export default {
  load(path = 'config.yaml') {
    return Finitio.AWFWConfig.dressFromFile(path);
  }
};
