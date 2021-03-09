Webspicy::Configuration.new do |c|
  c.host = "http://api"
  c.client = Webspicy::HttpClient

  c.before_all do
    devops = c.world.devops
    AnApi.new("#{devops.arnavon_api.endpoint}/version").wait!
    #AnApi.new("#{devops.mailer_worker.endpoint}/version").wait!
  end

  c.postcondition JobEnqueued
  c.postcondition JobEnqueuedInMetrics
  c.postcondition EmailsSent
  c.postcondition EmailsSentInMetrics

  c.errcondition NoEmailSent
  c.errcondition JobErrorsInMetrics
  c.errcondition JobEnqueuedMetricUnchanged
  c.errcondition NoJobEnqueued
end
