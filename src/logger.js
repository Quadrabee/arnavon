import { version } from '../package.json';
import bunyan from 'bunyan';

// Create and use logger in middleware
const logger = bunyan.createLogger({
  name: 'arnavon',
  version,
  level: 'debug',
  serializers: bunyan.stdSerializers
});

export default logger;
