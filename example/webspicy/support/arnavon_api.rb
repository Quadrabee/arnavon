class ArnavonApi
  include Webspicy::Support::World::Item

  def ready?
    url = "#{config.world.devops.arnavon_api.endpoint}/version"
    res = HTTP.get(url)
    status = res.status
    if status >= 200 && status < 300
      puts "(ArnavonApi) reached: (#{res.body})"
      true
    else
      puts "WARN: unexpected status #{status}"
      false
    end
  rescue => ex
    puts ex.message
    false
  end

  def wait!
    Webspicy::Support.sooner_or_later(max: 10, raise: true){
      ready?
    }
  end

end
