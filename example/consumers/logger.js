module.exports = (message, { logger, metadata }) => {
  const log = { message, metadata };
  logger.info(JSON.stringify(log));
  return Promise.resolve();
};
