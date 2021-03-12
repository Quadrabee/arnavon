class NoEmailSent
  include Webspicy::Specification::Post

  def self.match(service, descr)
    case descr
    when /No email is sent/
      NoEmailSent.new
    end
  end

  def instrument
    config.world.fakesmtp.clear!
  end

  def check!
    sleep(1)
    emails = config.world.fakesmtp.emails
    unless emails.nil? || emails.empty?
      fail!("Mails were not supposed to be sent, got #{emails.size}")
    end
  end

end
