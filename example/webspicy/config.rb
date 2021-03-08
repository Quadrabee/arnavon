Webspicy::Configuration.new do |c|
  c.host = "http://api"
  c.client = Webspicy::HttpClient

  c.before_all do
    c.world.arnavon_api.wait!
  end

  c.postcondition JobEnqueued
  c.postcondition EmailEventuallySent
end
