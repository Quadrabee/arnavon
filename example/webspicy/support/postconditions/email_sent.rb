class EmailSent
  include Webspicy::Specification::Postcondition

  def self.match(service, descr)
    return unless descr =~ /The email is \(or emails are\) eventually sent/
    EmailSent.new
  end

  def instrument(tc, client)
    client.config.world.fakesmtp.clear!
  end

  def check(invocation)
    tc = invocation.test_case
    if tc.headers["X-Arnavon-Push-Mode"] == "BATCH"
      emails = sooner_or_later do
        em = invocation.config.world.fakesmtp.emails
        em.empty? ? nil : em
      end or raise "Emails not sent"
      exp = tc.params.size
      unless exp == emails.size
        raise "Expected #{exp} mails sent, got `#{emails.size}`"
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
