## 1.3.2 - 2026-10-23

* Retry the AMQP setup while the broker is restarting, instead of exiting

## 1.3.1 - 2026-01-29

* Add `queues:status` CLI command and refactor queue commands

## 1.3.0 - 2026-01-29

* Add DLQ requeue API endpoint (publishes via exchange with routing key)
* Add `GET /queues` API endpoint for queue status
* Fix several architectural issues and bugs across the codebase
* Update dependencies to latest within semver ranges

## 1.2.0 - 2025-10-18

* RabbitMQ 4.x should be used, as we use amqplib 0.10.9 from now on (amqplib
  0.10.4 does not work, with a frame_max error in rabbitmq 4 logs)

## 1.1.x

* Unknown changes on tag

## 1.0-rc

* First R&D version
