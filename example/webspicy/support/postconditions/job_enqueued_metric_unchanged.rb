class JobEnqueuedMetricUnchanged

  def self.match(service, descr)
    world = service.config.world
    endp = world.devops.arnavon_api.endpoint
    case descr
    when /The job pushed api metrics for '(.*?)' stays unchanged/
      MetricIncremented.new(endp, "dispatcher_valid_jobs", $1){|tc|
        0
      }
    when /The job pushed api metrics for stays unchanged/
      MetricIncremented.new(endp, "dispatcher_valid_jobs"){|tc|
        0
      }
    end
  end

end
