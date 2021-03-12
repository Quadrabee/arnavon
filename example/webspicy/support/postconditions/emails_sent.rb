class EmailsSent
  include Webspicy::Specification::Post

  def self.match(service, descr)
    case descr
    when /The email is eventually sent/
      EmailsSent.new
    when /The emails are eventually sent/
      EmailsSent.new
    end
  end

  def instrument
    config.world.fakesmtp.clear!
  end

  def check!
    fakesmtp, tc = config.world.fakesmtp, test_case
    exp_count = tc.metadata[:expected_success_count] || tc.params.size
    if tc.headers["X-Arnavon-Push-Mode"] == "BATCH"
      emails = sooner_or_later do
        em = fakesmtp.emails
        em && !em.empty? ? em : nil
      end or fail!("Emails not sent")
      unless exp_count == emails.size
        fail!("Expected #{exp_count} mails sent, got `#{emails.size}`")
      end
    else
      email = sooner_or_later do
        fakesmtp.last_email
      end or fail!("Email not sent")
      fail!("Unexpected mail From: #{email.from}") unless email.from == tc.params["from"]
      fail!("Unexpected mail To: #{email.to.inspect}") unless email.to == [tc.params["to"]]
    end
  end

end
