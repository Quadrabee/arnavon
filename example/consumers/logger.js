module.exports = (job, { logger }) => {
  logger.log(job.toJSON());
  return Promise.resolve();
};
