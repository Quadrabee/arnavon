export default `
@import finitio/data

ID = String(s | /[a-z]+[a-z_-]+/.test(s))

#### QUEUE

AMQPConfig = {
  url      :  String
  exchange :? String
}

QueueConfig = {
  driver :  String
  config : AMQPConfig
}

#### JOBS

Job.ID = ID

Job.Config = .JobConfig <json> {
  id          : Job.ID
  inputSchema : String
}

#### RUNNERS

Runner.Type = String(s | s === "nodejs" || s === "binary")
Runner.Config = {
  ...
}

#### CONSUMERS

Consumer.ID = ID

Consumer.Wildcard = String(s | s === "*")
Consumer.Selector = ID | Consumer.Wildcard

Consumer.Config = .ConsumerConfig <json> {
  id          : Consumer.ID
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
