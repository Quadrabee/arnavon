import { Consumer } from '../src';

if (process.argv.length < 3) {
  console.log(`Usage: ${process.argv.join(' ')} <jobId>`);
  process.exit(-1);
}

const [jobId] = process.argv.slice(-1);
const awfm = Consumer.create(jobId);
awfm.startConsumer();
