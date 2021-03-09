class MetricIncremented
  include Webspicy::Specification::Postcondition

  def initialize(endpoint, metric, job_name = nil, &counter)
    @endpoint = endpoint
    @metric = metric
    @job_name = job_name
    @counter = counter || ->(tc){ tc.metadata[:err_metric_increment] || 1 }
  end
  attr_reader :endpoint, :metric, :job_name, :counter

  def instrument(tc, client)
    tc.metadata[memoization_key(tc)] = read_metric(tc)
  end

  def check(invocation)
    tc = invocation.test_case
    was, is = tc.metadata[memoization_key(tc)], 0
    increment = counter.call(tc)
    if increment == 0
      sleep(1)
      is = read_metric(tc)
      unless is == was
        raise "Metrics `#{metric}` was not supposed to change"
      end
    else
      sooner_or_later do
        is = read_metric(tc)
        is > was
      end or raise "Metrics `#{metric}` not incremented: was #{was} is now #{is}"
      unless is == was+increment
        raise "Metrics `#{metric}` not incremented as expected: expected #{was+increment}, is #{is}"
      end
      #puts "#{metric} :: #{was} -> #{is}"
    end
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
