import bunyan from 'bunyan';

// Create and use logger in middleware
const logger = bunyan.createLogger({
  name: 'awfw',
  serializers: bunyan.stdSerializers
});

export default logger;
