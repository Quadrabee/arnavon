class JobErrorsInMetrics
  include Webspicy::Specification::Post

  def initialize(job_name = nil)
    @job_name = job_name
  end
  attr_reader :job_name

  def self.match(service, descr)
    world = service.config.world
    case descr
    when /The api metrics reflect the job errors?/
      JobErrorsInMetrics.new
    when /The api metrics reflect the '(.*?)' job errors?/
      JobErrorsInMetrics.new($1)
    end
  end

  def instrument
    mi = MetricIncremented.new(endpoint, metric, job_name)
    mi.bind(tester).instrument
  end

  def check!
    mi = MetricIncremented.new(endpoint, metric, job_name)
    mi.bind(tester).check!
  end

  def metric
    test_case.metadata[:err_metric].tap{|e|
      fail!("Invalid test case #{test_case.description}\n#{test_case.metadata}") unless e
    }
  end

  def endpoint
    config.world.devops.arnavon_api.endpoint
  end

end
