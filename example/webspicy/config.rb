Webspicy::Configuration.new do |c|
  c.host = "http://api"
  c.client = Webspicy::HttpClient

  c.postcondition JobEnqueued
  c.postcondition EmailEventuallySent
end
