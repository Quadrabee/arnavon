class AnApi
  include Webspicy::Support::World::Item

  def initialize(endpoint)
    @endpoint = endpoint
  end
  attr_reader :endpoint

  def ready?
    !!ApiSupport.get_2xx(endpoint)
  rescue => ex
    puts ex.message
    false
  end

  def wait!
    Webspicy::Support.sooner_or_later(max: 20, raise: true){
      ready?
    } or raise "Timeout: Unable to reach `#{endpoint}` ..."
  end

end
