class JobEnqueued

  def self.match(service, descr)
    case descr
    when /(The|A) (.*?) job has been properly enqueued/
      NJobsEnqueued.new($2, 1)
    when /The job has been properly enqueued/
      NJobsEnqueued.new(nil, 1)
    end
  end

end
