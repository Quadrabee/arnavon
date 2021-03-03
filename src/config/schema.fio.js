export default `
@import finitio/data

ID = String(s | /[a-z]+[a-z_-]+/.test(s))

#### QUEUE

AMQP.Exchange.Type = String(s | s === 'topic')

AMQP.Exchange = {
  name    :  String
  type    :? AMQP.Exchange.Type
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
    durable: Boolean
  }
  bindings :? [AMQP.Queue.Binding]
}

AMQP.Topology = {
  exchanges :? [AMQP.Exchange]
  queues    :  [AMQP.Queue]
}

AMQP.Config = {
  url      :  String
  topology :? AMQP.Topology
}

QueueConfig = {
  driver :  String
  config : AMQP.Config
}

#### JOBS

Job.Name = ID
Job.ID = ID

Job.Config = .JobConfig <json> {
  name          : Job.Name
  inputSchema   : String
}

#### RUNNERS

Runner.Type = String(s | s === "nodejs" || s === "binary")
Runner.Config = {
  ...
}

#### CONSUMERS

Consumer.Name = ID

Consumer.Wildcard = String(s | s === "*")
Consumer.Selector = ID | Consumer.Wildcard

Consumer.Config = .ConsumerConfig <json> {
  name        : Consumer.Name
  jobSelector : Consumer.Selector
  runner      : Runner.Config
}

#### MAIN

ArnavonConfig = {
  queue     : QueueConfig
  jobs      : [Job.Config]
  consumers : [Consumer.Config]
}
`;
