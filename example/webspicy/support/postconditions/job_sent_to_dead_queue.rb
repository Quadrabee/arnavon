class JobSentToDeadQueue
  include Webspicy::Specification::Post

  def initialize(job_name = nil)
    @job_name = job_name
  end
  attr_reader :job_name

  def self.match(service, descr)
    world = service.config.world
    case descr
    when /Failing jobs are properly sent to dead queue letters/
      JobSentToDeadQueue.new
    end
  end

  def instrument
    @count = get_message_count()
  end

  def check!
    queued = sooner_or_later(max: 10) do
      new_count = get_message_count()
      new_count == @count + 1
    end or fail!("Job was not enqueued in dead queue letter")
  end

  def get_message_count
    body = ApiSupport.get_2xx("#{endpoint}/queues").to_s
    stats = JSON.parse(body)
    dead_queue = stats["queues"].find { |q| q["name"] === "dead-letters" }
    dead_queue["messages"]
  end

  def endpoint
    config.world.devops.arnavon_api.endpoint
  end

end
