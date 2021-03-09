class JobEnqueuedInMetrics

  def self.match(service, descr)
    world = service.config.world
    endp = world.devops.arnavon_api.endpoint
    inc = ->(tc) {
      if i = tc.metadata[:expected_success_count]
        i
      elsif tc.params.is_a?(Array)
        tc.params.size
      else
        1
      end
    }
    case descr
    when /The api metrics reflect the '(.*?)' jobs? being pushed/
      MetricIncremented.new(endp, "dispatcher_valid_jobs", $1, &inc)
    when /The api metrics reflect the job being pushed/
      MetricIncremented.new(endp, "dispatcher_valid_jobs", &inc)
    end
  end

end
