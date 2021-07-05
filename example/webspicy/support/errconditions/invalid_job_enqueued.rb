class InvalidJobEnqueued
  include Webspicy::Specification::Post

  def initialize
    @checker = NJobsEnqueued.new('invalid-jobs', 1)
  end
  attr_reader :checker

  def instrument
    checker.bind(tester).instrument
  end

  def self.match(service, descr)
    case descr
    when /Invalid jobs are properly enqueued to relevant failure queues/
      InvalidJobEnqueued.new
    end
  end

  def check!
    res = invocation.response
    return if res.status == 404
    checker.bind(tester).check!
  end

end
