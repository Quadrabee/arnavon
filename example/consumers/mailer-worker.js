const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'fakesmtp',
  port: 25,
  secure: false,
  ignoreTLS: true,
});

module.exports = (job, { dispatcher, logger }) => {
  const email = Object.assign({}, job.payload, {
    to: [].concat(job.payload.to).filter(Boolean).join(', '),
  });

  if (email.to.includes('fail@enspirit.be')) {
    throw new Error('Email sending failed');
  }

  logger.info({ email }, 'emailing');

  return transporter.sendMail(email)
    .then((result) => {
      // log success results (example could be to save results on cold storage such as s3)
      return dispatcher.dispatch('log-info', result);
    })
    .catch((err) => {
      logger.error(err, 'email sending failed');
      throw err;
    });
};
