export default `
@import finitio/data

ID = String(s | /[a-z]+[a-z_-]+/.test(s))

#### QUEUE

AMQP.Exchange.Type = String :: { "topic", "direct", "fanout" }

AMQP.Exchange = {
  name    :  String
  type    :? AMQP.Exchange.Type
  default :? Boolean
  options :? {
    durable: Boolean
  }
}

AMQP.Queue.Binding = {
  exchange   : String
  routingKey : String
}

AMQP.Queue = {
  name    :  String
  options :? {
    durable              :? Boolean
    deadLetterExchange   :? String
    deadLetterRoutingKey :? String
  }
  bindings :? [AMQP.Queue.Binding]
}

AMQP.Topology = {
  exchanges : [AMQP.Exchange]
  queues    : [AMQP.Queue]
}

AMQP.Config = {
  url            :? String
  connectRetries :? Integer
  prefetchCount  :? Integer
  topology       :  AMQP.Topology
}

QueueConfig = {
  driver : String
  config : AMQP.Config
}

#### JOBS

Job.Name = ID
Job.ID = ID

Job.Config = .JobConfig <json> {
  name               :  Job.Name
  inputSchema        :  String
  invalidJobExchange :? String
}

#### RUNNERS

Runner.Type = String :: { "nodejs", "binary" }
Runner.Mode = String :: { "raw", "arnavon" }
Runner.Config = {
  type         :  Runner.Type
  mode         :? Runner.Mode
  ...
}

#### CONSUMERS

Consumer.Name = ID

Consumer.Config = .ConsumerConfig <json> {
  name        :  Consumer.Name
  queue       :  String
  runner      :  Runner.Config
}

#### MAIN

ArnavonConfig = {
  queue     : QueueConfig
  jobs      : [Job.Config]
  consumers : [Consumer.Config]
}
`;
