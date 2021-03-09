class EmailSentInMetrics
  include Webspicy::Specification::Postcondition

  def self.match(service, descr)
    world = service.config.world
    case descr
    when /The consumer metrics eventually reflect the mail being sent/
      endp = world.devops.mailer_worker.endpoint
      MetricIncremented.new(endp, "runner_successful_jobs", "send-email"){|tc|
        tc.params.is_a?(Array) ? tc.params.size : 1
      }
    end
  end

end
