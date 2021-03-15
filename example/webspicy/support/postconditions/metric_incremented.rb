class MetricIncremented
  include Webspicy::Specification::Post

  def initialize(endpoint, metric, job_name = nil, &counter)
    @endpoint = endpoint
    @metric = metric
    @job_name = job_name
    @counter = counter || ->(tc){ tc.metadata[:err_metric_increment] || 1 }
  end
  attr_reader :endpoint, :metric, :job_name, :counter

  def instrument
    test_case.metadata[memoization_key] = read_metric
  end

  def check!
    was, is = test_case.metadata[memoization_key], 0
    increment = counter.call(test_case)
    if increment == 0
      sleep(1)
      is = read_metric
      fail!("Metrics `#{metric}` was not supposed to change") unless is == was
    else
      sooner_or_later do
        is = read_metric
        is > was
      end or fail!("Metrics `#{metric}` not incremented: was #{was} is now #{is}")
      fail!("Metrics `#{metric}` not incremented as expected: expected #{was+increment}, is #{is}") unless is == was+increment
    end
  end

  def read_metric
    body = ApiSupport.get_2xx("#{endpoint}/metrics").to_s
    rx = /#{metric}\{jobName="#{get_job_name}"\}\s+(\d+)/
    if body =~ rx
      Integer(body[rx, 1])
    else
      0
    end
  end

  def memoization_key
    "#{endpoint}#{metric}#{get_job_name}--post-metric"
  end

  def get_job_name
    job_name || test_case.params["name"]
  end

end
