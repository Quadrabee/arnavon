class JobEnqueuedInMetrics

  def self.match(service, descr)
    world = service.config.world
    endp = world.devops.arnavon_api.endpoint
    case descr
    when /The api metrics reflect the '(.*?)' job being pushed/
      MetricIncremented.new(endp, "dispatcher_valid_jobs", $1){|tc|
        tc.params.is_a?(Array) ? tc.params.size : 1
      }
    when /The api metrics reflect the job being pushed/
      MetricIncremented.new(endp, "dispatcher_valid_jobs")
    end
  end

end
