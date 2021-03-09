class MetricIncremented
  include Webspicy::Specification::Postcondition

  def initialize(endpoint, metric, job_name = nil, &counter)
    @endpoint = endpoint
    @metric = metric
    @job_name = job_name
    @counter = counter || ->(tc){ 1 }
  end
  attr_reader :endpoint, :metric, :job_name, :counter

  def instrument(tc, client)
    tc.metadata[memoization_key(tc)] = read_metric(tc)
  end

  def check(invocation)
    tc = invocation.test_case
    was = tc.metadata[memoization_key(tc)]
    is = 0
    increment = counter.call(tc)
    sooner_or_later do
      is = read_metric(tc)
      is == was+increment
    end or raise "Metrics `#{metric}` not incremented: was #{was} is now #{is}"
    nil
  end

  def read_metric(tc)
    body = ApiSupport.get_2xx("#{endpoint}/metrics").to_s
    rx = /#{metric}\{jobName="#{get_job_name(tc)}"\}\s+(\d+)/
    if body =~ rx
      Integer(body[rx, 1])
    else
      0
    end
  end

  def memoization_key(tc)
    "#{endpoint}#{metric}#{get_job_name(tc)}--post-metric"
  end

  def get_job_name(tc)
    job_name || tc.params["name"]
  end

end
