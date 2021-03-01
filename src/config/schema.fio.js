export default `
@import finitio/data

AMQPConfig = {
  url      :  String
  exchange :? String
}

QueueConfig = {
  driver :  String
  config : AMQPConfig
}

Job.ID = String(s | /[a-z]+[a-z_-]+/.test(s))

Job.Config = .JobConfig <json> {
  id          : Job.ID
  inputSchema : String
}

ArnavonConfig = {
  queue : QueueConfig
  jobs  : [Job.Config]
}
`;
