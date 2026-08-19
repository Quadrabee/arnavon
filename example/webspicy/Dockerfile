FROM enspirit/webspicy:0.20.17-tester

# amq-protocol dropped Ruby 2.7 after 2.7.0, and this base image ships
# Ruby 2.7.3, so pin it explicitly before resolving bunny.
RUN gem install amq-protocol -v 2.7.0 \
 && gem install bunny -v '~> 2.17.0'
