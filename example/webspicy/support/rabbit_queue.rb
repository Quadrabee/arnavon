require "bunny"
class RabbitQueue
  include Webspicy::Support::World::Item

  def world
    config.world
  end

  def bunny
    @bunny ||= Bunny.new(world.devops.rabbitmq.connection_string).tap{|c| c.start }
  end

  def message_ready(job_name)
    q = bunny.create_channel.queue(job_name, passive: true)
    q.message_count
  end

end
