Webspicy::Configuration.new do |c|
  c.host = "http://api"
  c.client = Webspicy::HttpClient

  c.before_all do |tester|
    devops = c.world.devops
    AnApi.new("#{devops.arnavon_api.endpoint}/version").wait!
    #AnApi.new("#{devops.workers.endpoint}/version").wait!
  end

  c.postcondition JobEnqueued
  c.postcondition JobEnqueuedInMetrics
  c.postcondition EmailsSent
  c.postcondition EmailsSentInMetrics
  c.postcondition NoEmailSent
  c.postcondition JobSentToDeadQueue

  c.errcondition NoEmailSent
  c.errcondition JobErrorsInMetrics
  c.errcondition JobEnqueuedMetricUnchanged
  c.errcondition NoJobEnqueued
  c.errcondition InvalidJobEnqueued
end
