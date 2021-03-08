class JobEnqueued
  include Webspicy::Specification::Postcondition

  def initialize(job_name)
    @job_name = job_name
  end
  attr_reader :job_name

  def self.match(service, descr)
    case descr
    when /(The|A) (.*?) job has been properly enqueued/
      JobEnqueued.new($2)
    when /The job has been properly enqueued/
      JobEnqueued.new(nil)
    end
  end

  def instrument(tc, client)
    tc.metadata["queued_before"] = message_ready(tc)
  end

  def check(invocation)
    tc = invocation.test_case
    was = tc.metadata["queued_before"]
    is = 0
    sooner_or_later do
      is = message_ready(tc)
      is == was+1
    end or raise "Not queued, never reached #{is+1} messages (was #{is} on #{jname(tc)})"
    nil
  end

  def message_ready(tc)
    tc.specification.config.world.rabbit_queue.message_ready(jname(tc))
  end

private

  def jname(tc)
    job_name || tc.params["name"]
  end

end
