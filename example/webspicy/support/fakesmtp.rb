class Fakesmtp
  include Webspicy::Support::World::Item

  def endpoint
    config.world.devops.fakesmtp.endpoint
  end

  def clear!
    HTTP.delete("#{endpoint}/emails")
  end

  def emails
    res = HTTP.get("#{endpoint}/emails")
    JSON.parse(res.body).map{|data| Email.new(data) }
  end

  def emails_count
    emails.length
  end

  def last_email
    emails.last
  end

  class Email

    def initialize(data)
      @data = data
    end
    attr_reader :data

    def from
      @from ||= data["headerLines"]
        .select{|h| h["key"] == "from" }
        .map{|h| h["line"][/From:\s*(.*)$/, 1] }
        .first
    end

    def to
      @to ||= data["headerLines"]
        .select{|h| h["key"] == "to" }
        .map{|h| h["line"][/To:\s*(.*)$/, 1] }
    end

  end # class Email
end # class Fakesmtp
