class EmailsSent
  include Webspicy::Specification::Postcondition

  def self.match(service, descr)
    case descr
    when /The email is eventually sent/
      EmailsSent.new
    when /The emails are eventually sent/
      EmailsSent.new
    end
  end

  def instrument(tc, client)
    client.config.world.fakesmtp.clear!
  end

  def check(invocation)
    tc = invocation.test_case
    fakesmtp = invocation.config.world.fakesmtp
    exp_count = tc.metadata[:expected_success_count] || tc.params.size
    if tc.headers["X-Arnavon-Push-Mode"] == "BATCH"
      emails = sooner_or_later do
        em = fakesmtp.emails
        em && !em.empty? ? em : nil
      end or raise "Emails not sent"
      unless exp_count == emails.size
        raise "Expected #{exp_count} mails sent, got `#{emails.size}`"
      end
      nil
    else
      email = sooner_or_later do
        invocation.config.world.fakesmtp.last_email
      end or raise "Email not sent"
      raise "Unexpected mail From: #{email.from}" unless email.from == tc.params["from"]
      raise "Unexpected mail To: #{email.to.inspect}" unless email.to == [tc.params["to"]]
      nil
    end
  end

end
