def webspicy_config(&bl)
  Webspicy::Configuration.new(Path.dir) do |c|
    c.host = "http://jobs-api:3000"
    c.client = Webspicy::HttpClient
    bl.call(c) if bl
  end
end
webspicy_config
