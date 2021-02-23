import bunyan from 'bunyan';

// Create and use logger in middleware
const logger = bunyan.createLogger({
  name: 'arnavon',
  serializers: bunyan.stdSerializers
});

export default logger;
