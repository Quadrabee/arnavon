class EmailsSentInMetrics

  def self.match(service, descr)
    world = service.config.world
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
    when /The consumer metrics eventually reflect the mails? being sent/
      job_name = service.specification.url.split('/jobs/')[1]
      endp = world.devops.workers.endpoint
      MetricIncremented.new(endp, "runner_successful_jobs", job_name, &inc)
    end
  end

end
