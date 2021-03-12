class NJobsEnqueued
  include Webspicy::Specification::Post

  def initialize(job_name = nil, increment = 1)
    @job_name = job_name
    @increment = increment
  end
  attr_reader :job_name, :increment

  def instrument
    test_case.metadata[increment_key] = message_ready
  end

  def check(invocation)
    jname, ikey = get_job_name, increment_key
    was, is = test_case.metadata[ikey], 0
    if increment == 0
      sleep(1)
      is = message_ready(tc)
      fail!("Expected no #{jname} job to be enqueued, got at least one.") unless was == is
    else
      sooner_or_later do
        is = message_ready(tc)
        is > was
      end or fail!("No `#{jname}` has been enqueued")
      fail!("Expected #{was+increment} jobs enqueued, got #{is}") unless is == was+increment
    end
  end

  def message_ready
    config.world.rabbit_queue.message_ready(get_job_name)
  end

private

  def get_job_name
    job_name || test_case.params["name"]
  end

  def increment_key
    "NJobsEnqueued::#{get_job_name}"
  end

end
