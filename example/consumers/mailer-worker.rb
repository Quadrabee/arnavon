#!/usr/bin/env ruby
require 'json'
require 'net/smtp'

## We receive the whole job as JSON from stdin
job = STDIN.read

## Try to parse as JSON
begin
  job = JSON.parse(job)
rescue JSON::ParserError
  STDERR.puts('Invalid Job payload')
  exit(1)
end

email = job['payload']

## Send email (very naive/simple implementation just for demo purposes)
message = <<~EOF
From: #{email['from']}
To: #{email['to']}
MIME-Version: 1.0
Content-type: text/html
Subject: #{email['subject']}

#{email['text']}
EOF

Net::SMTP.start('fakesmtp') do |smtp|
  smtp.send_message message, email['from'], email['to']
end

puts "Email sent"
