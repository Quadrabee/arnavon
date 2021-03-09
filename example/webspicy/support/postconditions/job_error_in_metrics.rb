class JobErrorInMetrics
  include Webspicy::Specification::Postcondition

  def self.match(service, descr)
    world = service.config.world
    case descr
    when /The api metrics reflect the job error/
      JobErrorInMetrics.new
    end
  end

  def instrument(tc, client)
    mi = MetricIncremented.new(endpoint(tc), metric(tc))
    mi.instrument(tc, client)
  end

  def check(invocation)
    tc = invocation.test_case
    mi = MetricIncremented.new(endpoint(tc), metric(tc))
    mi.check(invocation)
  end

  def metric(tc)
    tc.metadata[:err_metric].tap{|e|
      raise "Invalid test case #{tc.description}\n#{tc.metadata}" unless e
    }
  end

  def endpoint(tc)
    tc.specification.config.world.devops.arnavon_api.endpoint
  end

end
