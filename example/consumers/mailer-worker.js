const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: 'fakesmtp',
  port: 25,
  secure: false,
  ignoreTLS: true
});

module.exports = (job, { dispatcher }) => {
  console.log('========>', JSON.stringify(job));
  const email = Object.assign({}, job.payload, {
    to: [].concat(job.payload.to).filter(Boolean).join(', ')
  });
  console.log('MAILING', email);
  return transporter.sendMail(email)
    .then((result) => {
      return dispatcher.dispatch('log-info', result);
    });
};
