import amqp, { AMQPQueueConfig } from './amqp';
import memory, { MemoryQueueConfig } from './memory';

export type QueueDriverConfig = AMQPQueueConfig | MemoryQueueConfig;

export default {
  amqp,
  memory,
};
