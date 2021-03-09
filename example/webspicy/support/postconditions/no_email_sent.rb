class NoEmailSent
  include Webspicy::Specification::Postcondition

  def self.match(service, descr)
    case descr
    when /No email is sent/
      NoEmailSent.new
    end
  end

  def instrument(tc, client)
    client.config.world.fakesmtp.clear!
  end

  def check(invocation)
    tc = invocation.test_case
    fakesmtp = invocation.config.world.fakesmtp
    sleep(1)
    emails = fakesmtp.emails
    unless emails.nil? || emails.empty?
      raise "Mails were not supposed to be sent, got #{emails.size}"
    end
    nil
  end

end
