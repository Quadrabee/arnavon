module ApiSupport

  def get_2xx(url)
    res = HTTP.get(url)
    status = res.status
    if status >= 200 && status < 300
      res.body
    else
      raise "Unexpected status #{res.status} on #{url}"
    end
  end
  module_function :get_2xx

end
