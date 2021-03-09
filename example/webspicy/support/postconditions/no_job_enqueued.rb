class NoJobEnqueued

  def self.match(service, descr)
    case descr
    when /No '(.*?)' job has been enqueued/
      NJobsEnqueued.new($1, 0)
    when /No job has been enqueued/
      NJobsEnqueued.new(nil, 0)
    end
  end

end
