class NJobsEnqueued
  include Webspicy::Specification::Postcondition

  def initialize(job_name = nil, increment = 1)
    @job_name = job_name
    @increment = increment
  end
  attr_reader :job_name, :increment

  def instrument(tc, client)
    tc.metadata[increment_key(tc)] = message_ready(tc)
  end

  def check(invocation)
    tc = invocation.test_case
    jname, ikey = get_job_name(tc), increment_key(tc)
    was, is = tc.metadata[ikey], 0
    if increment == 0
      sleep(1)
      is = message_ready(tc)
      unless was == is
        raise "Expected no #{jname} job to be enqueued, got at least one."
      end
    else
      sooner_or_later do
        is = message_ready(tc)
        is > was
      end or raise "No `#{jname}` has been enqueued"
      unless is == was+increment
        raise "Expected #{was+increment} jobs enqueued, got #{is}"
      end
    end
    nil
  end

  def message_ready(tc)
    tc.specification.config.world.rabbit_queue.message_ready(get_job_name(tc))
  end

private

  def get_job_name(tc)
    job_name || tc.params["name"]
  end

  def increment_key(tc)
    "NJobsEnqueued::#{get_job_name(tc)}"
  end

end
