require 'webspicy/tester/fakesmtp'

Webspicy::Tester::Fakesmtp.new({
  endpoint: "http://fakesmtp:1080/api"
})
